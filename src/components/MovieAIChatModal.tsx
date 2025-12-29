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
  KeyboardAvoidingView,
} from 'react-native';
import {Modal} from 'react-native';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import Icon from 'react-native-vector-icons/Ionicons';
import {useResponsive} from '../hooks/useResponsive';
import {cinemaChat} from '../services/groq';
import {GradientSpinner} from './GradientSpinner';
import {MicButton} from './MicButton';
import LinearGradient from 'react-native-linear-gradient';
import {MaybeBlurView} from './MaybeBlurView';

import Markdown from 'react-native-markdown-display';
import {AIReportFlag} from './AIReportFlag';
import {HorizontalList} from './HorizontalList';
import {ContentItem} from './MovieList';
import {useNavigation} from '@react-navigation/native';
import {BlurPreference} from '../store/blurPreference';
import {BlurView} from '@react-native-community/blur';

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  tmdbResults?: ContentItem[];
};

type MovieAIChatModalProps = {
  visible: boolean;
  onClose: () => void;
  movieTitle: string;
  movieYear: number;
  movieOverview: string;
  movieGenres: string[];
  contentType?: 'movie' | 'tv';
  contentId: string | number;
  onSelectContent?: (content: ContentItem) => void;
};

const DEFAULT_MOVIE_QUESTIONS = [
  'Who is the director?',
  'What are viewers saying about this movie?',
  'Can you explain the plot?',
  'Who are the main actors?',
  "What's the movie's rating?",
  'Is this movie worth watching?',
  'What genre is this movie?',
  'What is the movie budget?',
  'What is the movie revenue?',
  'More like this',
];

const DEFAULT_TV_QUESTIONS = [
  'Who created this show?',
  'What are viewers saying about this series?',
  'Can you explain the plot?',
  'Who are the main actors?',
  "What's the show's rating?",
  'Is this series worth watching?',
  'What genre is this show?',
  'What is the show budget?',
  'What is the show revenue?',
  'More like this',
];

export const MovieAIChatModal: React.FC<MovieAIChatModalProps> = ({
  visible,
  onClose,
  movieTitle,
  movieYear,
  movieOverview,
  movieGenres,
  contentType = 'movie',
  contentId,
  onSelectContent,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [isRateLimitExceeded, setIsRateLimitExceeded] = useState(false);
  const [rateLimitCountdown, setRateLimitCountdown] = useState<number | null>(
    null,
  );
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const {isTablet} = useResponsive();
  const navigation = useNavigation<any>();
  const themeMode = BlurPreference.getMode();

  // Animation values (matching OnlineAI screen)
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // Initialize entrance animations (matching OnlineAI screen)
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
      // Reset animations when modal closes
      fadeAnim.setValue(0);
      slideUpAnim.setValue(50);
      scaleAnim.setValue(0.95);
    }
  }, [visible]);

  // Countdown timer for rate limit
  useEffect(() => {
    if (rateLimitCountdown !== null && rateLimitCountdown > 0) {
      const interval = setInterval(() => {
        setRateLimitCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            setIsRateLimitExceeded(false);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [rateLimitCountdown]);

  // Scroll to bottom helper
  const scrollToBottom = (animated = true) => {
    if (!flatListRef.current) return;
    const handleScroll = () => {
      flatListRef.current?.scrollToEnd({animated});
    };
    handleScroll();
    requestAnimationFrame(handleScroll);
    setTimeout(handleScroll, 150);
  };

  // Scroll when messages change or loading
  useEffect(() => {
    if (messages.length > 0 || isLoading) {
      scrollToBottom(true);
    }
  }, [messages, isLoading]);

  // Pulse animation for loading states (matching OnlineAI screen)
  useEffect(() => {
    if (isLoading) {
      const pulseAnimation = Animated.loop(
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
      pulseAnimation.start();
      return () => pulseAnimation.stop();
    }
  }, [isLoading]);

  // Add initial welcome message (only when opening, do not reset on movie change)
  useEffect(() => {
    if (visible) {
      // Initialize only if chat is empty
      if (messages.length === 0) {
        setMessages([
          {
            id: '1',
            text: `Hi! I'm your AI assistant for "${movieTitle}". Ask me anything about this movie, its plot, cast, or get recommendations for similar movies!`,
            sender: 'ai',
            timestamp: new Date(),
          },
        ]);
      }
      setShowSuggestions(true);
    } else {
      // Reset messages when modal is closed
      setMessages([]);
      setInputText('');
      setShowSuggestions(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

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

      // Add user message
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      // Clear input only when sending manual input; for suggestions we're not editing the box
      if (!overrideText) setInputText('');
      setIsLoading(true);
      setShowSuggestions(false); // Hide suggestions after first message

      try {
        // Add context as a user message (do not send genres)
        const contextMessage = {
          role: 'user' as const,
          content: `Context: You are chatting about "${movieTitle}"${
            movieYear ? ` (${movieYear})` : ''
          }. ${
            movieOverview ? `Overview: ${movieOverview}` : ''
          } Only answer questions related to this specific ${
            contentType === 'tv' ? 'TV show' : 'movie'
          } and politely decline unrelated topics.`,
        };

        // Prepare chat messages from the updated messages array
        // Send only last 4 messages for context (including the new user message)
        const conversationMessages = updatedMessages
          .filter(msg => msg.id !== '1')
          .slice(-4);
        const chatMessages = [
          contextMessage,
          ...conversationMessages.map(msg => ({
            role:
              msg.sender === 'ai' ? ('assistant' as const) : ('user' as const),
            content: msg.text,
          })),
        ];

        // Call the AI service with the conversation messages
        const {aiResponse, arr} = await cinemaChat(chatMessages);

        // Add AI response
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: aiResponse,
          sender: 'ai',
          timestamp: new Date(),
        };

        // Resolve and show AI suggestions as a horizontal list
        if (Array.isArray(arr) && arr.length > 0) {
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
            // Update the AI message with tmdbResults, filtering out the current content
            aiMessage.tmdbResults = resolved
              .filter(r => String(r.id) !== String(contentId))
              .slice(0, 10);
          } catch (e) {
            console.error('Error resolving TMDB results:', e);
          }
        }

        setMessages(prev => [...prev, aiMessage]);
      } catch (error) {
        console.error('Error getting AI response:', error);

        const errText = String(error);
        const is429 = /429/.test(errText);
        const retryAfter = (error as any)?.retryAfter;

        if (is429) {
          setIsRateLimitExceeded(true);
          setRateLimitCountdown(retryAfter || 60);
        }

        let friendly = 'Sorry, I encountered an error. Please try again later.';
        if (is429) {
          friendly = `Rate limit exceeded. Please wait ${
            retryAfter ? retryAfter + 's' : 'a moment'
          } before trying again.`;
        }

        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: friendly,
          sender: 'ai',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [
      inputText,
      isLoading,
      movieTitle,
      movieOverview,
      movieGenres,
      contentType,
      messages,
    ],
  );

  const handleSuggestionPress = useCallback(
    (question: string) => {
      // Send the suggestion immediately
      handleSend(question);
    },
    [handleSend],
  );

  const renderMessage = useCallback(
    ({item, index}: {item: Message; index: number}) => {
      const isLast = index === messages.length - 1 && item.sender === 'ai';
      const getPrevUserText = (i: number) => {
        for (let j = i - 1; j >= 0; j--) {
          const m = messages[j];
          if (m?.sender === 'user') return m.text;
        }
        return undefined;
      };
      const prevUserText = getPrevUserText(index);

      return (
        <View>
          {item.sender === 'user' ? (
            <View style={[styles.message, styles.user]}>
              <Text style={styles.userText}>{item.text}</Text>
            </View>
          ) : (
            <View>
              <View style={[styles.message, styles.assistant]}>
                <Markdown
                  style={{
                    body: styles.messageText,
                    code_block: {backgroundColor: 'transparent'},
                    fence: {backgroundColor: 'transparent'},
                    code_inline: {backgroundColor: 'transparent'},
                  }}>
                  {item.text}
                </Markdown>
              </View>
              <AIReportFlag
                aiText={item.text}
                userText={prevUserText}
                context="MovieAIChatModal"
                threadId={movieTitle}
                timestamp={item.timestamp.getTime()}
              />
            </View>
          )}
          {item.tmdbResults && item.tmdbResults.length > 0 && (
            <View style={{marginTop: spacing.md}}>
              <View style={{marginTop: -spacing.xl, marginBottom: spacing.md}}>
                <HorizontalList
                  title=""
                  data={item.tmdbResults as any}
                  onItemPress={(content: any) => {
                    if (onSelectContent) {
                      onSelectContent(content);
                    } else {
                      if (
                        content.type === 'movie' ||
                        content.media_type === 'movie'
                      ) {
                        navigation.navigate('MovieDetails', {
                          movie: content,
                        });
                      } else {
                        navigation.navigate('TVShowDetails', {
                          show: content,
                        });
                      }
                    }
                  }}
                  isLoading={false}
                  isSeeAll={false}
                  ai
                />
              </View>
            </View>
          )}
        </View>
      );
    },
    [messages, movieTitle, onSelectContent, navigation],
  );

  const renderSuggestions = () => {
    // if (!showSuggestions || messages.length > 1) return null;

    return (
      <View style={styles.suggestionsContainer}>
        <Text style={styles.suggestionsTitle}>Try asking:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.suggestionsScrollContent}>
          {(contentType === 'tv'
            ? DEFAULT_TV_QUESTIONS
            : DEFAULT_MOVIE_QUESTIONS
          ).map((question: string, index: number) => (
            <TouchableOpacity
              key={index}
              style={styles.suggestionChip}
              onPress={() => handleSuggestionPress(question)}
              activeOpacity={0.7}>
              <Text style={styles.suggestionText}>{question}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <LinearGradient
          colors={['transparent', 'rgb(23, 1, 42)']}
          start={{x: 0, y: 1}}
          end={{x: 1, y: 0}}
          style={{
            width: '30%',
            height: 40,
            position: 'absolute',
            bottom: 0,
            right: 0,
            pointerEvents: 'none',
          }}
        />
      </View>
    );
  };

  return (
    <Modal
      animationType="slide"
      navigationBarTranslucent
      statusBarTranslucent
      backdropColor={colors.modal.blurDark}
      visible={visible}
      onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          margin: isTablet ? spacing.xl : spacing.md,
          borderRadius: borderRadius.xl,
          backgroundColor: 'transparent',
          overflow: 'hidden',
        }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
          style={{flex: 1}}>
          <Animated.View
            style={[
              {flex: 1, position: 'relative'},
              {
                opacity: fadeAnim,
                transform: [{translateY: slideUpAnim}, {scale: scaleAnim}],
              },
            ]}>
            <MaybeBlurView
              header
              isAI
              style={[
                {
                  marginTop: 20,
                  overflow: 'hidden',
                },
              ]}>
              <LinearGradient
                colors={['rgba(18, 1, 51, 0.87)', 'rgba(42, 0, 39, 0.83)']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                }}
              />
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                  flex: 1,
                  paddingRight: 10,
                }}>
                <Icon
                  name="sparkles"
                  size={20}
                  color={colors.text.muted}
                  style={{flexShrink: 0}}
                />
                <Text
                  numberOfLines={1}
                  style={{
                    flex: 1,
                    color: colors.text.primary,
                    ...typography.h3,
                    fontSize: isTablet ? 16 : 14,
                  }}>
                  Chat about {movieTitle}
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={{
                  padding: spacing.sm,
                  backgroundColor: colors.modal.blur,
                  borderRadius: borderRadius.round,
                  borderTopWidth: 1,
                  borderLeftWidth: 1,
                  borderRightWidth: 1,
                  borderColor: colors.modal.content,
                }}>
                <Icon name="close" size={20} color={colors.text.primary} />
              </TouchableOpacity>
            </MaybeBlurView>
            <View
              style={{
                flex: 1,
                overflow: 'hidden',
                borderRadius: 40,
              }}>
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
                  onContentSizeChange={() => scrollToBottom(true)}
                  onLayout={() => scrollToBottom(true)}
                  ListFooterComponent={
                    <>
                      {isLoading && (
                        <Animated.View
                          style={{
                            marginHorizontal: spacing.lg,
                            marginBottom: 32,
                          }}>
                          <GradientSpinner
                            size={30}
                            style={{
                              alignItems: 'center',
                              alignSelf: 'center',
                              backgroundColor: 'transparent',
                            }}
                            colors={[colors.primary, colors.secondary]}
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
                              {
                                opacity: pulseAnim,
                              },
                            ]}>
                            Thinking...
                          </Animated.Text>
                        </Animated.View>
                      )}
                      <View style={{height: 250}} />
                    </>
                  }
                />
                <View
                  style={{
                    zIndex: 1,
                    backgroundColor: 'rgb(23, 1, 42)',
                    borderColor: colors.modal.blur,
                    borderWidth: 1,
                    borderRadius: 40,
                    paddingVertical: spacing.md,
                    position: 'absolute',
                    bottom: spacing.md,
                    left: spacing.md,
                    right: spacing.md,
                  }}>
                  {/* Rate limit countdown indicator */}
                  {rateLimitCountdown !== null && rateLimitCountdown > 0 && (
                    <View
                      style={{
                        paddingHorizontal: spacing.md,
                        paddingBottom: spacing.sm,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: spacing.xs,
                      }}>
                      <Icon name="time-outline" size={14} color="#ff6464" />
                      <Text
                        style={{
                          color: '#ff6464',
                          fontSize: 12,
                          fontWeight: '600',
                        }}>
                        Rate limit active. Retry in {rateLimitCountdown}s
                      </Text>
                    </View>
                  )}
                  {renderSuggestions()}
                  <View
                    style={{
                      marginHorizontal: isTablet ? 100 : spacing.md,
                      borderRadius: 50,
                      overflow: 'hidden',
                      zIndex: 3,
                      marginTop: spacing.sm,
                    }}>
                    <TouchableWithoutFeedback
                      onPress={() => inputRef.current?.focus()}>
                      <View style={styles.inputRow}>
                        <TextInput
                          ref={inputRef}
                          style={[styles.input, {height: isTablet ? 50 : 40}]}
                          value={inputText}
                          onChangeText={setInputText}
                          placeholder={
                            rateLimitCountdown !== null &&
                            rateLimitCountdown > 0
                              ? `Wait ${rateLimitCountdown}s...`
                              : `Ask about ${
                                  contentType === 'tv'
                                    ? 'this show'
                                    : 'this movie'
                                }...`
                          }
                          placeholderTextColor={colors.text.tertiary}
                          editable={
                            !isLoading &&
                            (rateLimitCountdown === null ||
                              rateLimitCountdown <= 0)
                          }
                          onFocus={() =>
                            setTimeout(
                              () =>
                                flatListRef.current?.scrollToEnd({
                                  animated: true,
                                }),
                              50,
                            )
                          }
                          onSubmitEditing={() => handleSend()}
                          returnKeyType="send"
                        />
                        <MicButton
                          onPartialText={text => {
                            if (text) setInputText(text);
                          }}
                          onFinalText={text => {
                            setInputText(text);
                            inputRef.current?.focus();
                          }}
                        />
                        <Animated.View>
                          <TouchableOpacity
                            style={[
                              styles.sendButton,
                              {
                                opacity:
                                  isLoading ||
                                  !inputText.trim() ||
                                  (rateLimitCountdown !== null &&
                                    rateLimitCountdown > 0)
                                    ? 0.5
                                    : 1,
                              },
                            ]}
                            onPress={() => handleSend()}
                            disabled={
                              isLoading ||
                              !inputText.trim() ||
                              (rateLimitCountdown !== null &&
                                rateLimitCountdown > 0)
                            }>
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
                </View>
                {/* <Text
                  numberOfLines={1}
                  style={{
                    textAlign: 'center',
                    ...typography.caption,
                    fontSize: 10,
                    color: colors.text.tertiary,
                    marginHorizontal: spacing.md,
                    marginTop: -spacing.sm,
                    marginBottom: spacing.xs,
                  }}>
                  Responses are AI generated and for entertainment purposes
                  only.
                </Text> */}
              </View>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginHorizontal: 2,
    overflow: 'hidden',
  },
  chat: {
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
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
  },
  messageText: {
    color: colors.text.primary,
    ...typography.body2,
  },
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
  suggestionsContainer: {
    zIndex: 1,
    marginBottom: spacing.sm,
  },
  suggestionsTitle: {
    ...typography.body2,
    color: colors.text.muted,
    marginLeft: spacing.md,
    marginBottom: spacing.sm,
    fontWeight: '500',
  },
  suggestionsScrollContent: {
    paddingHorizontal: spacing.md,
  },
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
