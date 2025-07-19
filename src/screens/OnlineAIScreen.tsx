import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import {cinemaChat} from '../services/groq';
import {colors, spacing, borderRadius, typography} from '../styles/theme';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import Markdown from 'react-native-markdown-display';
import {BlurView} from '@react-native-community/blur';
import {fetchMoviesByIds, fetchTVShowsByIds} from '../services/tmdb';
import {useNavigation} from '@react-navigation/native';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  tmdbResults?: Array<{
    id: number;
    type: string;
    poster_path?: string;
    title: string;
    year: number;
  }>;
}

export const OnlineAIScreen: React.FC = () => {
  const navigation = useNavigation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [animatedContent, setAnimatedContent] = useState('');
  const flatListRef = useRef<FlatList>(null);

  // Scroll to bottom when messages change or animation updates
  useEffect(() => {
    if (flatListRef.current && (messages.length > 0 || animating)) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({animated: true});
      }, 100);
    }
  }, [messages, animating, animatedContent]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMessage: Message = {role: 'user', content: input};
    const newMessages: Message[] = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setAnimating(false);
    setAnimatedContent('');
    try {
      const groqMessages = newMessages.map(({role, content}) => ({
        role,
        content,
      }));
      const response = await cinemaChat(groqMessages);
      console.log('AI response:', response);
      let tmdbResults:
        | Array<{id: number; type: string; poster_path?: string}>
        | undefined = undefined;
      let text = response;
      // Extract all TMDB_CONTENT_RESULTS arrays in the response
      const allMatches = [
        ...response.matchAll(/TMDB_CONTENT_RESULTS=\[(.*?)\]/gs),
      ];
      let arr = [];
      if (allMatches.length > 0) {
        try {
          let arrStr = `[${allMatches[allMatches.length - 1][1]}]`;
          // Fix single-quoted titles (e.g., {title: ''96', ...})
          arrStr = arrStr.replace(
            /title: ?'([^']*)'/g,
            (m, p1) => `title: "${p1.replace(/"/g, '"')}"`,
          );
          arrStr = arrStr.replace(/'/g, '"');
          arrStr = arrStr.replace(/([{,])\s*(\w+)\s*:/g, '$1"$2":');
          const arr = JSON.parse(arrStr);
          // For each item, search TMDB by title, year, and type
          const tmdbResults: Array<{
            id: number;
            type: string;
            poster_path?: string;
            title: string;
            year: number;
          }> = [];
          for (const item of arr) {
            let found = null;
            if (item.type === 'movie') {
              const res = await fetch(
                `https://api.themoviedb.org/3/search/movie?api_key=ddc242ac9b33e6c9054b5193c541ffbb&query=${encodeURIComponent(
                  item.title,
                )}&year=${item.year}`,
              );
              const data = await res.json();
              found =
                data.results && data.results.length > 0
                  ? data.results[0]
                  : null;
            } else if (item.type === 'tv') {
              const res = await fetch(
                `https://api.themoviedb.org/3/search/tv?api_key=ddc242ac9b33e6c9054b5193c541ffbb&query=${encodeURIComponent(
                  item.title,
                )}&first_air_date_year=${item.year}`,
              );
              const data = await res.json();
              found =
                data.results && data.results.length > 0
                  ? data.results[0]
                  : null;
            }
            if (found) {
              tmdbResults.push({
                id: found.id,
                type: item.type,
                poster_path: found.poster_path,
                title: found.title || found.name || item.title,
                year: item.year,
              });
            } else {
              tmdbResults.push({
                id: 0,
                type: item.type,
                poster_path: undefined,
                title: item.title,
                year: item.year,
              });
            }
          }
          text = response
            .replace(allMatches[allMatches.length - 1][0], '')
            .trim();
          console.log('Extracted TMDB results:', tmdbResults);
          setAnimating(true);
          let i = 0;
          const step = 100; // Number of characters to reveal per frame
          function animate() {
            setAnimatedContent(text.slice(0, i));
            if (i <= text.length) {
              i += step;
              setTimeout(animate, 1);
            } else {
              setAnimating(false);
              setMessages([
                ...newMessages,
                {role: 'assistant', content: text, tmdbResults} as Message,
              ]);
              setAnimatedContent('');
            }
          }
          animate();
          return;
        } catch (e) {
          console.log('Failed to parse TMDB results:', e);
        }
      }
      setAnimating(true);
      let i = 0;
      const step = 100; // Number of characters to reveal per frame
      function animate() {
        setAnimatedContent(text.slice(0, i));
        if (i <= text.length) {
          i += step;
          setTimeout(animate, 1);
        } else {
          setAnimating(false);
          setMessages([
            ...newMessages,
            {role: 'assistant', content: text, tmdbResults} as Message,
          ]);
          setAnimatedContent('');
        }
      }
      animate();
    } catch (e) {
      console.log(e);

      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, there was an error.',
      };
      setMessages([...newMessages, errorMessage]);
      setAnimating(false);
      setAnimatedContent('');
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({item, index}: {item: Message; index: number}) => {
    // Check if this is the last message and from AI
    const isLast =
      index === displayMessages.length - 1 && item.role === 'assistant';
    return (
      <View style={isLast && {marginBottom: 120}}>
        <View
          style={[
            styles.message,
            item.role === 'user' ? styles.user : styles.assistant,
          ]}>
          {item.role === 'user' ? (
            <Text style={styles.userText}>{item.content}</Text>
          ) : (
            <Markdown style={{body: styles.messageText}}>
              {item.content}
            </Markdown>
          )}
        </View>
        {item.tmdbResults && item.tmdbResults.length > 0 && (
          <FlatList
            data={item.tmdbResults}
            horizontal
            keyExtractor={m => m.title + m.year + m.type}
            renderItem={({item: media}) =>
              media.poster_path ? (
                <TouchableOpacity
                  style={{margin: 8}}
                  activeOpacity={1}
                  onPress={() => {
                    const nav: any = navigation;
                    if (media.type === 'movie') {
                      nav.navigate('MovieDetails', {
                        movie: {
                          id: media.id,
                          title: media.title,
                          poster_path: media.poster_path,
                        },
                      });
                    } else if (media.type === 'tv') {
                      nav.navigate('TVShowDetails', {
                        show: {
                          id: media.id,
                          name: media.title,
                          poster_path: media.poster_path,
                        },
                      });
                    }
                  }}>
                  <Image
                    source={{
                      uri: `https://image.tmdb.org/t/p/w154${media.poster_path}`,
                    }}
                    style={{
                      width: 100,
                      height: 150,
                      borderRadius: 8,
                      backgroundColor: colors.modal.blur,
                    }}
                  />
                  {/* <Text style={{color: '#fff', width: 100}} numberOfLines={2}>
                    {media.title} ({media.year})
                  </Text> */}
                </TouchableOpacity>
              ) : null
            }
            style={{marginTop: 12}}
            showsHorizontalScrollIndicator={false}
          />
        )}
      </View>
    );
  };

  // Use displayMessages for FlatList data
  const displayMessages: Message[] = animating
    ? [...messages, {role: 'assistant', content: animatedContent} as Message]
    : messages;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}>
      <LinearGradient
        colors={['rgba(83, 16, 63, 0.46)', 'rgba(64, 16, 83, 0.33)']}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: 50,
        }}
      />

      <LinearGradient
        colors={['rgba(3, 3, 3, 0.7)', 'rgba(0, 0, 0, 0)']}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 120,
          zIndex: 10,
        }}
      />

      <FlatList
        ref={flatListRef}
        data={displayMessages}
        renderItem={renderItem}
        keyExtractor={(_, idx) => idx.toString()}
        contentContainerStyle={[styles.chat]}
        ListEmptyComponent={
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
            }}>
            <View style={{height: 250}} />
            <Image
              source={require('../assets/theater.png')}
              style={{width: 100, height: 100}}
            />
            <Text style={{color: colors.modal.activeBorder, fontSize: 18}}>
              Start chatting with our AI assistant!
            </Text>
            <Text style={{color: colors.modal.active, fontSize: 14}}>
              Ask me anything about movies, TV shows, and more!
            </Text>
          </View>
        }
      />
      {loading && (
        <View style={{marginBottom: 120}}>
          <ActivityIndicator
            style={{margin: 8}}
            color={'rgba(181, 12, 233, 0.61)'}
          />
        </View>
      )}
      <LinearGradient
        colors={['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.34)']}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 120,
        }}
      />

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 30,
          marginHorizontal: spacing.lg,
          borderRadius: 50,
          overflow: 'hidden',
        }}>
        <BlurView
          blurAmount={10}
          blurRadius={5}
          blurType="light"
          overlayColor={colors.modal.blur}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: 50,
          }}
        />
        <LinearGradient
          colors={['rgba(83, 16, 63, 0.5)', 'rgba(64, 16, 83, 0.39)']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 0}}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: 50,
          }}
        />
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask about movies, TV, actors..."
            placeholderTextColor={colors.text.tertiary}
            editable={!loading}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={sendMessage}
            disabled={loading || !input.trim()}>
            <Icon
              name="send"
              disabled={loading || !input.trim()}
              size={24}
              color={
                loading || !input.trim()
                  ? colors.modal.active
                  : colors.text.primary
              }
            />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    marginBottom: 120,
  },
  chat: {
    padding: spacing.md,
    paddingTop: 70,
    gap: spacing.md,
  },
  message: {
    marginBottom: spacing.sm,
    padding: spacing.md,
    maxWidth: '80%',
  },
  user: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(229, 202, 242, 0.66)',
    color: colors.background.primary,
    borderRadius: borderRadius.xl,
  },
  assistant: {
    alignSelf: 'flex-start',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
  },
  userText: {
    color: colors.background.primary,
    ...typography.body2,
    fontWeight: 500,
  },
  messageText: {
    color: colors.text.primary,
    ...typography.body2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.modal.background,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  input: {
    flex: 1,
    height: 50,
    // backgroundColor: colors.background.secondary,
    color: colors.text.primary,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginRight: spacing.sm,
    ...typography.body2,
  },
  sendButton: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.md,
  },
});
