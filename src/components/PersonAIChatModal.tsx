import React, {useState, useCallback, useRef, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  FlatList,
  Animated,
  Easing,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import {Modal} from 'react-native';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import Icon from 'react-native-vector-icons/Ionicons';
import {useResponsive} from '../hooks/useResponsive';
import {cinemaChat} from '../services/gemini';
import {GradientSpinner} from './GradientSpinner';
import {MicButton} from './MicButton';
import LinearGradient from 'react-native-linear-gradient';
import {BlurView} from '@react-native-community/blur';
import useAndroidKeyboardInset from '../hooks/useAndroidKeyboardInset';
import Markdown from 'react-native-markdown-display';
import {AIReportFlag} from './AIReportFlag';
import {HorizontalList} from './HorizontalList';
import {ContentItem} from './MovieList';
import {useNavigation} from '@react-navigation/native';

// Types
type Message = {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
};

type PersonAIChatModalProps = {
  visible: boolean;
  onClose: () => void;
  personName: string;
  biography?: string;
  knownForDepartment?: string;
  birthDate?: string;
  birthPlace?: string;
  alsoKnownAs?: string[];
};

const DEFAULT_PERSON_QUESTIONS = [
  'What is their most acclaimed role?',
  'List some notable movies/TV shows featuring them.',
  'Have they won any major awards?',
  'What are some interesting facts about their career?',
  'What genres do they often work in?',
  'Who have they frequently collaborated with?',
  'What are their most popular works?',
  'What should I watch to get started with their filmography?',
];

export const PersonAIChatModal: React.FC<PersonAIChatModalProps> = ({
  visible,
  onClose,
  personName,
  biography,
  knownForDepartment,
  birthDate,
  birthPlace,
  alsoKnownAs,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiResults, setAiResults] = useState<ContentItem[]>([]);
  const [aiResultsLoading, setAiResultsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const {isTablet} = useResponsive();
  const androidInset = useAndroidKeyboardInset(10);
  const navigation = useNavigation<any>();

  // Animations (mirroring MovieAIChatModal)
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(slideUpAnim, {
          toValue: 0,
          duration: 800,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideUpAnim.setValue(50);
      scaleAnim.setValue(0.95);
    }
  }, [visible]);

  useEffect(() => {
    if (isLoading) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
  }, [isLoading]);

  // Initial welcome/reset
  useEffect(() => {
    if (visible) {
      setMessages([
        {
          id: '1',
          text: `Hi! I'm your AI assistant for ${personName}. Ask me anything about their career, filmography, awards, and more. I will only answer questions related to this person.`,
          sender: 'ai',
          timestamp: new Date(),
        },
      ]);
      setInputText('');
    } else {
      setMessages([]);
    }
  }, [visible, personName]);

  const buildContext = () => {
    const parts: string[] = [];
    parts.push(`Context: You are chatting about the person ${personName}.`);
    if (knownForDepartment) parts.push(`Department: ${knownForDepartment}.`);
    if (birthDate) parts.push(`Born: ${birthDate}.`);
    if (birthPlace) parts.push(`Place of birth: ${birthPlace}.`);
    if (alsoKnownAs && alsoKnownAs.length > 0)
      parts.push(`Also known as: ${alsoKnownAs.join(', ')}.`);
    if (biography) parts.push(`Biography: ${biography}`);

    parts.push(
      'Answer ONLY questions related to this person. If asked unrelated or overly speculative questions, politely decline and steer back to this person. Avoid spoilers unless asked.',
    );
    return parts.join(' ');
  };

  const handleSend = useCallback(
    async (overrideText?: string) => {
      const textToSend = (overrideText ?? inputText).trim();
      if (!textToSend || isLoading) return;

      const userMessage: Message = {
        id: Date.now().toString(),
        text: textToSend,
        sender: 'user',
        timestamp: new Date(),
      };

      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      if (!overrideText) setInputText('');
      setIsLoading(true);

      try {
        const contextMessage = {
          role: 'user' as const,
          content: buildContext(),
        };

        const conversationMessages = updatedMessages.filter(m => m.id !== '1');
        const chatMessages = [
          contextMessage,
          ...conversationMessages.map(m => ({
            role:
              m.sender === 'ai' ? ('assistant' as const) : ('user' as const),
            content: m.text,
          })),
        ];

        const {aiResponse, arr} = await cinemaChat(chatMessages);
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: aiResponse,
          sender: 'ai',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, aiMessage]);

        // Resolve suggestions if present
        if (Array.isArray(arr) && arr.length > 0) {
          setAiResultsLoading(true);
          try {
            const resolved: ContentItem[] = [];
            for (const item of arr) {
              let found: any = null;
              if (item.type === 'movie') {
                const res = await fetch(
                  `https://api.themoviedb.org/3/search/movie?api_key=ddc242ac9b33e6c9054b5193c541ffbb&query=${encodeURIComponent(
                    item.title,
                  )}&year=${item.year}`,
                );
                const data = await res.json();
                const candidates = Array.isArray(data.results)
                  ? data.results
                  : [];
                const aiLang = item.original_language;
                const aiYear =
                  typeof item.year === 'string'
                    ? parseInt(item.year, 10)
                    : item.year;
                const normalize = (t?: string) =>
                  (t || '')
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/\p{Diacritic}/gu, '')
                    .replace(/[^a-z0-9]+/g, ' ')
                    .trim();
                const aiTitleN = normalize(item.title);
                let pool = aiLang
                  ? candidates.filter(
                      (c: any) => c?.original_language === aiLang,
                    )
                  : candidates;
                if (pool.length === 0) {
                  const res2 = await fetch(
                    `https://api.themoviedb.org/3/search/movie?api_key=ddc242ac9b33e6c9054b5193c541ffbb&query=${encodeURIComponent(
                      item.title,
                    )}`,
                  );
                  const data2 = await res2.json();
                  pool = Array.isArray(data2.results) ? data2.results : [];
                  if (aiLang) {
                    const langPool = pool.filter(
                      (c: any) => c?.original_language === aiLang,
                    );
                    if (langPool.length > 0) pool = langPool;
                  }
                }
                if (pool.length > 0) {
                  const score = (c: any) => {
                    let s = 0;
                    const candTitle = c?.title || c?.name || '';
                    const candTitleN = normalize(candTitle);
                    if (candTitleN === aiTitleN) s += 2;
                    else if (
                      candTitleN.startsWith(aiTitleN) ||
                      aiTitleN.startsWith(candTitleN)
                    )
                      s += 1;
                    const y =
                      c?.release_date && c.release_date.length >= 4
                        ? parseInt(c.release_date.slice(0, 4), 10)
                        : null;
                    if (aiYear && y) {
                      if (y === aiYear) s += 3;
                      else if (Math.abs(y - aiYear) === 1) s += 1;
                    }
                    if (typeof c?.popularity === 'number')
                      s += Math.min(2, c.popularity / 100);
                    return s;
                  };
                  found = pool.reduce((best: any, cur: any) =>
                    score(cur) > score(best) ? cur : best,
                  );
                }
                if (found) {
                  resolved.push({
                    id: found.id,
                    type: 'movie',
                    poster_path: found.poster_path,
                    backdrop_path: found.backdrop_path,
                    overview: found.overview,
                    title: found.title || item.title,
                    name: found.title,
                    vote_average: found.vote_average || 0,
                    genre_ids: found.genre_ids || [],
                    media_type: 'movie',
                    release_date: found.release_date,
                  } as any);
                }
              } else if (item.type === 'tv') {
                const res = await fetch(
                  `https://api.themoviedb.org/3/search/tv?api_key=ddc242ac9b33e6c9054b5193c541ffbb&query=${encodeURIComponent(
                    item.title,
                  )}&first_air_date_year=${item.year}`,
                );
                const data = await res.json();
                const candidates = Array.isArray(data.results)
                  ? data.results
                  : [];
                const aiLang = item.original_language;
                const aiYear =
                  typeof item.year === 'string'
                    ? parseInt(item.year, 10)
                    : item.year;
                const normalize = (t?: string) =>
                  (t || '')
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/\p{Diacritic}/gu, '')
                    .replace(/[^a-z0-9]+/g, ' ')
                    .trim();
                const aiTitleN = normalize(item.title);
                let pool = aiLang
                  ? candidates.filter(
                      (c: any) => c?.original_language === aiLang,
                    )
                  : candidates;
                if (pool.length === 0) {
                  const res2 = await fetch(
                    `https://api.themoviedb.org/3/search/tv?api_key=ddc242ac9b33e6c9054b5193c541ffbb&query=${encodeURIComponent(
                      item.title,
                    )}`,
                  );
                  const data2 = await res2.json();
                  pool = Array.isArray(data2.results) ? data2.results : [];
                  if (aiLang) {
                    const langPool = pool.filter(
                      (c: any) => c?.original_language === aiLang,
                    );
                    if (langPool.length > 0) pool = langPool;
                  }
                }
                if (pool.length > 0) {
                  const score = (c: any) => {
                    let s = 0;
                    const candTitle = c?.name || c?.title || '';
                    const candTitleN = normalize(candTitle);
                    if (candTitleN === aiTitleN) s += 2;
                    else if (
                      candTitleN.startsWith(aiTitleN) ||
                      aiTitleN.startsWith(candTitleN)
                    )
                      s += 1;
                    const y =
                      c?.first_air_date && c.first_air_date.length >= 4
                        ? parseInt(c.first_air_date.slice(0, 4), 10)
                        : null;
                    if (aiYear && y) {
                      if (y === aiYear) s += 3;
                      else if (Math.abs(y - aiYear) === 1) s += 1;
                    }
                    if (typeof c?.popularity === 'number')
                      s += Math.min(2, c.popularity / 100);
                    return s;
                  };
                  found = pool.reduce((best: any, cur: any) =>
                    score(cur) > score(best) ? cur : best,
                  );
                }
                if (found) {
                  resolved.push({
                    id: found.id,
                    type: 'tv',
                    poster_path: found.poster_path,
                    backdrop_path: found.backdrop_path,
                    overview: found.overview,
                    title: found.name || item.title,
                    name: found.name,
                    vote_average: found.vote_average || 0,
                    genre_ids: found.genre_ids || [],
                    media_type: 'tv',
                    first_air_date: found.first_air_date,
                  } as any);
                }
              }
            }
            setAiResults(resolved.slice(0, 10));
          } catch (e) {
            console.log('Person AI suggestions resolve error', e);
          } finally {
            setAiResultsLoading(false);
          }
        } else {
          setAiResults([]);
        }
      } catch (error) {
        console.error('Error getting AI response:', error);
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: 'Sorry, I encountered an error. Please try again later.',
          sender: 'ai',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, aiMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [
      inputText,
      isLoading,
      messages,
      personName,
      biography,
      knownForDepartment,
      birthDate,
      birthPlace,
      alsoKnownAs,
    ],
  );

  const renderMessage = useCallback(({item}: {item: Message}) => {
    const isUser = item.sender === 'user';
    return isUser ? (
      <View style={[styles.message, styles.user]}>
        <Text style={styles.userText}>{item.text}</Text>
      </View>
    ) : (
      <View>
        <View style={[styles.message, styles.assistant]}>
          <Markdown style={{body: styles.messageText}}>{item.text}</Markdown>
        </View>
        <AIReportFlag
          aiText={item.text}
          userText={undefined}
          context="PersonAIChatModal"
          timestamp={Date.now()}
        />
      </View>
    );
  }, []);

  return (
    <Modal
      animationType="slide"
      navigationBarTranslucent={true}
      transparent={true}
      visible={visible}
      onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          borderTopLeftRadius: 50,
          borderTopRightRadius: 50,
          overflow: 'hidden',
        }}>
        <Animated.View
          style={[
            {flex: 1, position: 'relative'},
            {
              opacity: fadeAnim,
              transform: [{translateY: slideUpAnim}, {scale: scaleAnim}],
            },
          ]}>
          <BlurView
            blurType="dark"
            blurAmount={5}
            style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}
            overlayColor={colors.modal.blur}
          />
          <TouchableOpacity
            activeOpacity={0.9}
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: borderRadius.round,
              height: 50,
              width: 50,
              borderColor: colors.modal.border,
              borderWidth: 1,
              backgroundColor: colors.modal.blur,
              zIndex: 2,
            }}
            onPress={onClose}>
            <Icon name="close" size={24} color="white" />
          </TouchableOpacity>
          <LinearGradient
            colors={['rgb(18, 1, 51)', 'rgb(42, 0, 39)']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: 0.8,
            }}
          />
          <View style={styles.container}>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={item => item.id}
              contentContainerStyle={[styles.chat]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              onContentSizeChange={() =>
                flatListRef.current?.scrollToEnd({animated: true})
              }
              onLayout={() =>
                flatListRef.current?.scrollToEnd({animated: true})
              }
              ListFooterComponent={
                isLoading ? (
                  <Animated.View
                    style={{marginHorizontal: spacing.lg, marginBottom: 32}}>
                    <GradientSpinner
                      size={30}
                      style={{
                        alignItems: 'center',
                        alignSelf: 'center',
                        backgroundColor: 'transparent',
                      }}
                      color={colors.primary}
                    />
                    <Animated.Text
                      style={[
                        {
                          color: colors.text.secondary,
                          textAlign: 'center',
                          fontSize: 12,
                          marginTop: 4,
                          fontStyle: 'italic',
                        },
                        {opacity: pulseAnim},
                      ]}>
                      Theater AI is thinking...
                    </Animated.Text>
                  </Animated.View>
                ) : aiResults.length > 0 ? (
                  <View
                    style={{marginTop: -spacing.xl, marginBottom: spacing.md}}>
                    <HorizontalList
                      title=""
                      data={aiResults as any}
                      onItemPress={(content: any) => {
                        if (
                          content.type === 'movie' ||
                          content.media_type === 'movie'
                        ) {
                          navigation.navigate('MovieDetails', {movie: content});
                        } else {
                          navigation.navigate('TVShowDetails', {show: content});
                        }
                      }}
                      isLoading={aiResultsLoading}
                      isSeeAll={false}
                      ai
                    />
                  </View>
                ) : null
              }
            />
            <View style={{zIndex: 1, backgroundColor: colors.modal.blur}}>
              <View
                style={{
                  paddingVertical: spacing.sm,
                  borderTopWidth: 1,
                  borderTopColor: colors.background.secondary,
                  zIndex: 1,
                }}>
                <Text style={styles.suggestionsTitle}>Try asking:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.suggestionsScrollContent}>
                  {DEFAULT_PERSON_QUESTIONS.map((question, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.suggestionChip}
                      onPress={() => handleSend(question)}
                      activeOpacity={0.7}>
                      <Text style={styles.suggestionText}>{question}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <View
                style={{
                  marginHorizontal: isTablet ? 100 : spacing.lg,
                  borderRadius: 50,
                  overflow: 'hidden',
                  zIndex: 3,
                }}>
                <TouchableWithoutFeedback
                  onPress={() => inputRef.current?.focus()}>
                  <View style={styles.inputRow}>
                    <TextInput
                      ref={inputRef}
                      style={styles.input}
                      value={inputText}
                      onChangeText={setInputText}
                      placeholder={`Ask about ${personName}...`}
                      placeholderTextColor={colors.text.tertiary}
                      editable={true}
                      onFocus={() =>
                        setTimeout(
                          () =>
                            flatListRef.current?.scrollToEnd({animated: true}),
                          50,
                        )
                      }
                      onSubmitEditing={() => handleSend()}
                      returnKeyType="send"
                    />
                    <MicButton
                      onFinalText={text => {
                        setInputText(text);
                        inputRef.current?.focus();
                      }}
                    />
                    <Animated.View>
                      <TouchableOpacity
                        style={[
                          styles.sendButton,
                          {opacity: isLoading || !inputText.trim() ? 0.5 : 1},
                        ]}
                        onPress={() => handleSend()}
                        disabled={isLoading || !inputText.trim()}>
                        <Icon
                          name={'send'}
                          size={24}
                          color={
                            isLoading || !inputText.trim()
                              ? colors.modal.active
                              : colors.text.primary
                          }
                        />
                      </TouchableOpacity>
                    </Animated.View>
                  </View>
                </TouchableWithoutFeedback>
              </View>
              <View
                style={{
                  marginVertical: spacing.md,
                  marginHorizontal: spacing.sm,
                }}>
                <Text
                  style={{
                    textAlign: 'center',
                    ...typography.caption,
                    fontSize: 10,
                    color: colors.text.tertiary,
                  }}>
                  Responses are AI generated and for entertainment purposes
                  only.
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, marginHorizontal: 2, overflow: 'hidden'},
  chat: {paddingVertical: spacing.md, paddingTop: 70, gap: spacing.md},
  message: {
    marginBottom: spacing.sm,
    marginHorizontal: spacing.md,
    padding: spacing.md,
    maxWidth: '80%',
  },
  user: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(252, 248, 253, 0.37)',
    color: colors.background.primary,
    borderRadius: borderRadius.xl,
  },
  assistant: {
    alignSelf: 'flex-start',
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(96, 71, 105, 0.46)',
  },
  userText: {
    color: colors.text.primary,
    ...typography.body2,
    fontWeight: '500',
    fontFamily: 'Inter_18pt-Regular',
  },
  messageText: {color: colors.text.primary, ...typography.body2},
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: colors.modal.border,
    backgroundColor: colors.modal.blur,
    zIndex: 3,
  },
  input: {
    flex: 1,
    height: 50,
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
  suggestionsTitle: {
    ...typography.body2,
    color: colors.text.muted,
    marginLeft: spacing.md,
    marginBottom: spacing.sm,
    fontWeight: '500',
    fontFamily: 'Inter_18pt-Regular',
  },
  suggestionsScrollContent: {paddingHorizontal: spacing.md},
  suggestionChip: {
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.modal.border,
  },
  suggestionText: {
    ...typography.body2,
    color: colors.text.primary,
    fontWeight: '500',
  },
});
