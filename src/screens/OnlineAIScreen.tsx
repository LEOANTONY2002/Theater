import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Image,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Modal,
} from 'react-native';
import {cinemaChat} from '../services/gemini';
import {colors, spacing, borderRadius, typography} from '../styles/theme';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import Markdown from 'react-native-markdown-display';
import {BlurView} from '@react-native-community/blur';
import {useNavigation, useRoute} from '@react-navigation/native';
import {GradientSpinner} from '../components/GradientSpinner';
import {AISettingsManager} from '../store/aiSettings';
import useAndroidKeyboardInset from '../hooks/useAndroidKeyboardInset';
import {useResponsive} from '../hooks/useResponsive';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

interface ChatThread {
  id: string;
  title: string;
  messages: Message[];
}

interface ParallaxCardProps {
  media: {
    id: number;
    type: string;
    poster_path?: string;
    title: string;
    year: number;
  };
  index: number;
  navigation: any;
  scrollX: Animated.Value;
}

const ParallaxCard: React.FC<ParallaxCardProps> = ({
  media,
  index,
  navigation,
  scrollX,
}) => {
  const cardWidth = 100; // Card width + margin

  const inputRange = [
    (index - 1) * cardWidth,
    index * cardWidth,
    (index + 1) * cardWidth,
  ];

  const scale = scrollX.interpolate({
    inputRange,
    outputRange: [0.95, 1, 0.95],
    extrapolate: 'clamp',
  });

  const opacity = scrollX.interpolate({
    inputRange,
    outputRange: [0.95, 1, 0.95],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={[
        styles.contentCard,
        {
          transform: [{scale}],
          opacity,
        },
      ]}>
      <TouchableOpacity
        activeOpacity={0.8}
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
        <View style={styles.posterContainer}>
          <Image
            source={{
              uri: `https://image.tmdb.org/t/p/w342${media?.poster_path}`,
            }}
            style={styles.posterImage}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.posterGradient}
          />
          {/* <View style={styles.posterInfo}>
            <Text style={styles.posterTitle} numberOfLines={2}>
              {media.title}
            </Text>
            <Text style={styles.posterYear}>
              {media.year} • {media.type.toUpperCase()}
            </Text>
          </View> */}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const OnlineAIScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [animatedContent, setAnimatedContent] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const [isDefaultKey, setIsDefaultKey] = useState<boolean>(false);
  const inputRef = useRef<TextInput>(null);
  const androidInset = useAndroidKeyboardInset(10);
  const {isTablet} = useResponsive();
  const [isRateLimitExceeded, setIsRateLimitExceeded] = useState(false);
  // Legacy single-history key (for migration)
  const HISTORY_KEY = '@theater_online_ai_history';
  // New multi-thread storage
  const THREADS_KEY = '@theater_online_ai_threads';
  const CURRENT_THREAD_KEY = '@theater_online_ai_current_thread';

  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string>('');
  const [showThreadPicker, setShowThreadPicker] = useState(false);

  // Helpers to work with threads
  const cap20 = (msgs: Message[]) => msgs.slice(-20);

  const persistThreads = async (all: ChatThread[], currentId: string) => {
    try {
      await AsyncStorage.multiSet([
        [THREADS_KEY, JSON.stringify(all)],
        [CURRENT_THREAD_KEY, currentId],
      ]);
    } catch (e) {
      console.log('Persist threads failed', e);
    }
  };

  const findCurrentIndex = (all: ChatThread[], id: string) =>
    Math.max(0, all.findIndex(t => t.id === id));

  const setAndPersistMessages = async (msgs: Message[]) => {
    const capped = cap20(msgs);
    setMessages(capped);
    // Update into threads and persist
    setThreads(prev => {
      const idx = findCurrentIndex(prev, currentThreadId);
      if (idx === -1) return prev;
      const updated: ChatThread = {...prev[idx], messages: capped};
      const next = [...prev.slice(0, idx), updated, ...prev.slice(idx + 1)];
      persistThreads(next, currentThreadId);
      return next;
    });
  };

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scrollX = useRef(new Animated.Value(0)).current;

  // Scroll to bottom when messages change or animation updates
  useEffect(() => {
    if (flatListRef.current && (messages.length > 0 || animating)) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({animated: true});
      }, 100);
    }
  }, [messages, animating, animatedContent]);

  // Initialize entrance animations
  useEffect(() => {
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
  }, []);

  // Load threads (with migration from legacy single-history)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [threadsRaw, currentIdRaw, legacyRaw] = await AsyncStorage.multiGet([
          THREADS_KEY,
          CURRENT_THREAD_KEY,
          HISTORY_KEY,
        ]).then(entries => entries.map(([, v]) => v));

        let loadedThreads: ChatThread[] = [];
        let loadedCurrentId = '';

        if (threadsRaw) {
          loadedThreads = JSON.parse(threadsRaw) || [];
        }
        if (currentIdRaw) {
          loadedCurrentId = currentIdRaw;
        }

        // Migrate legacy single-history into first thread if no threads exist
        if ((!loadedThreads || loadedThreads.length === 0) && legacyRaw) {
          const parsed: Message[] = JSON.parse(legacyRaw) || [];
          const initialThread: ChatThread = {
            id: String(Date.now()),
            title: 'Chat 1',
            messages: cap20(parsed),
          };
          loadedThreads = [initialThread];
          loadedCurrentId = initialThread.id;
          // Clear legacy storage
          await AsyncStorage.removeItem(HISTORY_KEY);
        }

        // Normalize titles: replace default 'Chat N' with first user message preview if available
        loadedThreads = (loadedThreads || []).map((t, idx) => {
          const looksDefault = !t.title || /^Chat\s\d+$/i.test(t.title);
          if (looksDefault) {
            const firstUserMsg = (t.messages || []).find(m => m.role === 'user');
            if (firstUserMsg?.content) {
              const preview = firstUserMsg.content.split(/\s+/).slice(0, 6).join(' ');
              return {...t, title: preview};
            }
          }
          return t;
        });

        // If still empty, create a default thread
        if (!loadedThreads || loadedThreads.length === 0) {
          const initial: ChatThread = {id: String(Date.now()), title: '', messages: []};
          loadedThreads = [initial];
          loadedCurrentId = initial.id;
        }

        if (mounted) {
          setThreads(loadedThreads);
          setCurrentThreadId(loadedCurrentId || loadedThreads[0].id);
          const current = loadedThreads.find(t => t.id === (loadedCurrentId || loadedThreads[0].id));
          setMessages(cap20(current?.messages || []));
        }
        // Persist normalized structure
        await persistThreads(loadedThreads, loadedCurrentId || loadedThreads[0].id);
      } catch (e) {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Android keyboard inset handled via hook

  // Load isDefault flag for API key
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const settings = await AISettingsManager.getSettings();
        if (mounted) setIsDefaultKey(!!settings.isDefault);
      } catch (e) {
        if (mounted) setIsDefaultKey(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Pulse animation for loading states
  useEffect(() => {
    if (loading) {
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
  }, [loading]);

  // Rotation animation for send button when loading
  useEffect(() => {
    if (loading) {
      const rotateAnimation = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );
      rotateAnimation.start();
      return () => {
        rotateAnimation.stop();
        rotateAnim.setValue(0);
      };
    }
  }, [loading]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMessage: Message = {role: 'user', content: input};
    const newMessages: Message[] = [...messages, userMessage];
    await setAndPersistMessages(newMessages);
    // If thread has no title beyond default, set it from first user message
    setThreads(prev => {
      const idx = findCurrentIndex(prev, currentThreadId);
      if (idx === -1) return prev;
      const t = prev[idx];
      const isDefault = !t.title || /^Chat\s\d+$/i.test(t.title);
      if (isDefault && userMessage.content) {
        const firstWords = userMessage.content.split(/\s+/).slice(0, 6).join(' ');
        const updated: ChatThread = {...t, title: firstWords || t.title};
        const next = [...prev.slice(0, idx), updated, ...prev.slice(idx + 1)];
        persistThreads(next, currentThreadId);
        return next;
      }
      return prev;
    });
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
      let text = response.aiResponse;
      // Extract all TMDB_CONTENT_RESULTS arrays in the response
      const {arr} = response;

      if (arr.length > 0) {
        try {
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
          text = response.aiResponse;
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
              setAndPersistMessages([
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
          setAndPersistMessages([
            ...newMessages,
            {role: 'assistant', content: text, tmdbResults} as Message,
          ]);
          setAnimatedContent('');
        }
      }
      animate();
    } catch (e) {
      setIsRateLimitExceeded(e?.toString()?.includes('429') ? true : false);
      console.log(e);
      console.log(isRateLimitExceeded ? 'Rate limit exceeded' : 'Other error');

      const errorMessage: Message = {
        role: 'assistant',
        content: isRateLimitExceeded
          ? 'Sorry, you cannot continue. Please change your API key in the settings.'
          : 'Sorry, there was an error.',
      };
      await setAndPersistMessages([...newMessages, errorMessage]);
      setAnimating(false);
      setAnimatedContent('');
    } finally {
      setLoading(false);
    }
  };

  // Thread actions
  const handleNewThread = async () => {
    const newThread: ChatThread = {
      id: String(Date.now()),
      title: '',
      messages: [],
    };
    const nextThreads = [...threads, newThread];
    setThreads(nextThreads);
    setCurrentThreadId(newThread.id);
    setMessages([]);
    await persistThreads(nextThreads, newThread.id);
  };

  const handleClearCurrent = async () => {
    setMessages([]);
    setThreads(prev => {
      const idx = findCurrentIndex(prev, currentThreadId);
      if (idx === -1) return prev;
      const updated: ChatThread = {...prev[idx], messages: []};
      const next = [...prev.slice(0, idx), updated, ...prev.slice(idx + 1)];
      persistThreads(next, currentThreadId);
      return next;
    });
  };

  const switchThread = async (id: string) => {
    setCurrentThreadId(id);
    const t = threads.find(th => th.id === id);
    setMessages(cap20(t?.messages || []));
    await persistThreads(threads, id);
    setShowThreadPicker(false);
  };

  const renderItem = ({item, index}: {item: Message; index: number}) => {
    // Check if this is the last message and from AI
    const isLast =
      index === displayMessages.length - 1 && item.role === 'assistant';
    return (
      <View style={isLast && {paddingBottom: 120}}>
        <View
          style={[
            styles.message,
            item.role === 'user' ? styles.user : styles.assistant,
          ]}>
          {item.role === 'user' ? (
            <Text style={styles.userText}>{item?.content}</Text>
          ) : (
            <Markdown style={{body: styles.messageText}}>
              {item?.content}
            </Markdown>
          )}
        </View>
        {item.tmdbResults && item.tmdbResults.length > 0 && (
          <View style={styles.contentCarousel}>
            <View
              style={{
                position: 'absolute',
                width: '80%',
                marginLeft: '10%',
                height: 255,
                backgroundColor: colors.modal.blur,
                borderRadius: borderRadius.lg,
                borderColor: colors.modal.border,
                borderWidth: 2,
                zIndex: -1,
              }}
            />
            <LinearGradient
              colors={['rgb(18, 0, 22)', 'transparent']}
              pointerEvents="none"
              style={{
                width: '25%',
                height: '110%',
                position: 'absolute',
                bottom: -20,
                left: 0,
                // paddingHorizontal: 10,
                zIndex: 2,
              }}
              start={{x: 0, y: 1}}
              end={{x: 1, y: 1}}
            />
            <LinearGradient
              colors={['transparent', 'rgb(18, 0, 22)']}
              pointerEvents="none"
              style={{
                width: '25%',
                height: '110%',
                position: 'absolute',
                bottom: -20,
                right: 0,
                // paddingHorizontal: 10,
                zIndex: 2,
              }}
              start={{x: 0, y: 1}}
              end={{x: 1, y: 1}}
            />
            <FlatList
              data={item.tmdbResults}
              horizontal
              keyExtractor={m => m.title + m.year + m.type}
              renderItem={({item: media, index}) =>
                media.poster_path ? (
                  <ParallaxCard
                    media={media}
                    index={index}
                    navigation={navigation}
                    scrollX={scrollX}
                  />
                ) : null
              }
              contentContainerStyle={styles.carouselContent}
              showsHorizontalScrollIndicator={false}
              snapToInterval={100}
              decelerationRate={0.9}
              onScroll={Animated.event(
                [{nativeEvent: {contentOffset: {x: scrollX}}}],
                {useNativeDriver: false},
              )}
              scrollEventThrottle={16}
            />
          </View>
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
      style={{flex: 1}}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}>
      <Animated.View
        style={[
          {flex: 1, position: 'relative'},
          {
            opacity: fadeAnim,
            transform: [{translateY: slideUpAnim}, {scale: scaleAnim}],
          },
        ]}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={{
            position: 'absolute',
            top: 50,
            left: 20,
            zIndex: 1,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: borderRadius.round,
            height: 50,
            width: 50,
            borderColor: colors.modal.border,
            borderWidth: 1,
          }}
          onPress={() => {
            // Always navigate to MySpace screen instead of going back
            (navigation as any).navigate('MySpaceScreen');
          }}>
          <BlurView
            blurType="dark"
            blurAmount={5}
            style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}
            overlayColor={colors.modal.blur}
          />
          <Icon name="chevron-back" size={24} color="white" />
        </TouchableOpacity>
        {/* Thread controls */}
        <View style={{position: 'absolute', top: 50, right: 20, flexDirection: 'row', gap: 8, zIndex: 2}}>
          <TouchableOpacity
            onPress={() => setShowThreadPicker(true)}
            activeOpacity={0.9}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: colors.modal.border,
              backgroundColor: 'rgba(0,0,0,0.35)',
              marginRight: 8,
            }}>
            <Text style={{color: colors.text.primary, ...typography.caption}}>
              {threads.find(t => t.id === currentThreadId)?.title || 'Threads'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleNewThread}
            activeOpacity={0.9}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: colors.modal.border,
              backgroundColor: 'rgba(0,0,0,0.35)',
              marginRight: 8,
            }}>
            <Icon name="add" size={18} color={colors.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleClearCurrent}
            activeOpacity={0.9}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: colors.modal.border,
              backgroundColor: 'rgba(0,0,0,0.35)',
            }}>
            <Text style={{color: colors.text.primary, ...typography.caption}}>Clear</Text>
          </TouchableOpacity>
        </View>
        <LinearGradient
          colors={[
            'rgb(209, 8, 112)',
            'rgba(209, 8, 125, 0.72)',
            'rgba(75, 8, 209, 0.54)',
            'rgb(133, 7, 183)',
          ]}
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
          <LinearGradient
            colors={['rgba(57, 0, 40, 0.7)', 'rgba(98, 0, 55, 0)']}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 120,
              zIndex: 10,
              marginHorizontal: 2,
            }}
          />
          <FlatList
            ref={flatListRef}
            data={displayMessages}
            renderItem={renderItem}
            keyExtractor={(_, idx) => idx.toString()}
            contentContainerStyle={[styles.chat]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            ListFooterComponent={
              loading ? (
                <Animated.View
                  style={{
                    // position: 'absolute',
                    // bottom: 30,
                    marginHorizontal: spacing.lg,
                    marginBottom: 150,
                  }}>
                  <GradientSpinner
                    size={30}
                    thickness={3}
                    style={{
                      alignItems: 'center',
                      alignSelf: 'center',
                      backgroundColor: 'transparent',
                    }}
                    color={colors.primary}
                    colors={[
                      colors.primary,
                      colors.secondary,
                      'rgba(239, 0, 184, 0.06)',
                      'rgba(67, 2, 75, 0.06)',
                      'rgba(211, 0, 239, 0.06)',
                      'rgba(39, 1, 44, 0.06)',
                      'rgba(211, 0, 239, 0.06)',
                      'rgba(183, 0, 239, 0.34)',
                      'rgba(213, 146, 249, 0.06)',
                      'rgba(128, 0, 239, 0.06)',
                      'rgba(0, 96, 239, 0.06)',
                      'rgba(72, 0, 239, 0.06)',
                      'rgba(44, 0, 239, 0.06)',
                      'rgba(18, 0, 239, 0.06)',
                      'rgba(0, 0, 239, 0.06)',
                      'rgba(0, 123, 211, 0.06)',
                      'rgba(0, 117, 184, 0.06)',
                      'rgba(0, 0, 156, 0.06)',
                      'rgba(0, 92, 128, 0.06)',
                      'rgba(0, 0, 100, 0.06)',
                      'rgba(0, 0, 72, 0.06)',
                      'rgba(35, 0, 44, 0.06)',
                      'rgba(18, 0, 15, 0.06)',
                      'rgba(0, 0, 0, 0.06)',
                    ]}
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
                    Theater AI is thinking...
                  </Animated.Text>
                </Animated.View>
              ) : isRateLimitExceeded ? (
                <View
                  style={{
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginTop: -200,
                    marginBottom: 200,
                  }}>
                  <View style={{height: 250}} />
                  <Image
                    source={require('../assets/theater.webp')}
                    style={{width: 100, height: 100}}
                  />
                  <Text
                    style={{
                      color: colors.modal.activeBorder,
                      ...typography.h3,
                      fontSize: 18,
                    }}>
                    Theater AI
                  </Text>

                  {!isDefaultKey ? (
                    <Text
                      style={{
                        color: colors.modal.active,
                        ...typography.body2,
                        fontSize: 14,
                      }}>
                      Your Gemini API key is rate limited. Please try again
                      later.
                    </Text>
                  ) : (
                    <View style={{marginTop: spacing.lg, alignItems: 'center'}}>
                      <View
                        style={{
                          borderTopColor: colors.modal.blur,
                          borderTopWidth: 1,
                          paddingTop: spacing.md,
                          width: 200,
                        }}
                      />
                      <Text
                        style={{
                          color: colors.text.secondary,
                          ...typography.body2,
                          textAlign: 'center',
                          marginHorizontal: spacing.lg,
                        }}>
                        You are using the default Gemini API key, it's rate
                        limited. Add your own API key in AI Settings.
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          (navigation as any).navigate('AISettingsScreen')
                        }
                        activeOpacity={0.9}
                        style={{
                          marginTop: spacing.md,
                          borderRadius: 24,
                          overflow: 'hidden',
                        }}>
                        <LinearGradient
                          colors={[colors.primary, colors.secondary]}
                          start={{x: 0, y: 0}}
                          end={{x: 1, y: 1}}
                          style={{
                            paddingHorizontal: 16,
                            paddingVertical: 10,
                            borderRadius: 24,
                          }}>
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                            }}>
                            <Icon
                              name="settings-outline"
                              size={18}
                              color={colors.text.primary}
                            />
                            <Text
                              style={{
                                color: colors.text.primary,
                                ...typography.button,
                                marginLeft: 8,
                              }}>
                              Open AI Settings
                            </Text>
                          </View>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ) : null
            }
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
                  source={require('../assets/theater.webp')}
                  style={{width: 100, height: 100}}
                />
                <Text
                  style={{
                    color: colors.modal.activeBorder,
                    ...typography.h3,
                    fontSize: 18,
                  }}>
                  Start chatting with Theater AI
                </Text>
                <Text
                  style={{
                    color: colors.modal.active,
                    ...typography.body2,
                    fontSize: 14,
                  }}>
                  Ask anything about movies, TV shows, and more!
                </Text>
                {isDefaultKey && (
                  <View style={{marginTop: spacing.lg, alignItems: 'center'}}>
                    <View
                      style={{
                        borderTopColor: colors.modal.blur,
                        borderTopWidth: 1,
                        paddingTop: spacing.md,
                        width: 200,
                      }}
                    />
                    <Text
                      style={{
                        color: colors.text.secondary,
                        ...typography.body2,
                        textAlign: 'center',
                        marginHorizontal: spacing.lg,
                      }}>
                      You are using the default Gemini API key. For better
                      reliability, add your own API key in AI Settings.
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        (navigation as any).navigate('AISettingsScreen')
                      }
                      activeOpacity={0.9}
                      style={{
                        marginTop: spacing.md,
                        borderRadius: 24,
                        overflow: 'hidden',
                      }}>
                      <LinearGradient
                        colors={[colors.primary, colors.secondary]}
                        start={{x: 0, y: 0}}
                        end={{x: 1, y: 1}}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 10,
                          borderRadius: 24,
                        }}>
                        <View
                          style={{flexDirection: 'row', alignItems: 'center'}}>
                          <Icon
                            name="settings-outline"
                            size={18}
                            color={colors.text.primary}
                          />
                          <Text
                            style={{
                              color: colors.text.primary,
                              ...typography.button,
                              marginLeft: 8,
                            }}>
                            Open AI Settings
                          </Text>
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            }
          />
          <LinearGradient
            colors={['transparent', 'rgb(31, 2, 53)']}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: 150,
              marginHorizontal: 2,
              zIndex: 0,
            }}
          />
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: Platform.OS === 'android' ? androidInset : 30,
              marginHorizontal: isTablet ? 100 : spacing.lg,
              borderRadius: 50,
              overflow: 'hidden',
              zIndex: 1,
              marginBottom: spacing.lg,
            }}>
            <BlurView
              blurAmount={10}
              blurRadius={5}
              blurType="light"
              overlayColor={colors.modal.blur}
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: 50,
              }}
            />
            <TouchableWithoutFeedback onPress={() => inputRef.current?.focus()}>
              <View style={styles.inputRow}>
                <TextInput
                  ref={inputRef}
                  style={styles.input}
                  value={input}
                  onChangeText={setInput}
                  placeholder="Ask about movies, TV, actors..."
                  placeholderTextColor={colors.text.tertiary}
                  editable={true}
                  onFocus={() =>
                    setTimeout(
                      () => flatListRef.current?.scrollToEnd({animated: true}),
                      50,
                    )
                  }
                  onSubmitEditing={sendMessage}
                  returnKeyType="send"
                />
                <Animated.View>
                  <TouchableOpacity
                    style={[
                      styles.sendButton,
                      {
                        opacity: loading || !input.trim() ? 0.5 : 1,
                      },
                    ]}
                    onPress={sendMessage}
                    disabled={loading || !input.trim()}>
                    <Icon
                      name={'send'}
                      size={24}
                      color={
                        loading || !input.trim()
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
      </Animated.View>
      {/* Thread Picker Modal */}
      <Modal visible={showThreadPicker} transparent animationType="fade" onRequestClose={() => setShowThreadPicker(false)}>
        <TouchableOpacity style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.6)'}} activeOpacity={1} onPress={() => setShowThreadPicker(false)}>
          <View style={{position: 'absolute', top: 110, right: 20, left: 20, backgroundColor: 'rgb(18,0,22)', borderRadius: 12, borderWidth: 1, borderColor: colors.modal.border, padding: 12}}>
            {threads.map(th => {
              const label = th.title && th.title.trim().length > 0 ? th.title : '(New chat)';
              return (
                <TouchableOpacity key={th.id} onPress={() => switchThread(th.id)} style={{paddingVertical: 10}}>
                  <Text style={{color: th.id === currentThreadId ? colors.accent : colors.text.primary}} numberOfLines={1}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // margin: 5,
    backgroundColor: 'rgb(18, 0, 22)',
    elevation: 12,
    marginHorizontal: 2,
    overflow: 'hidden',
  },
  chat: {
    paddingVertical: spacing.md,
    paddingTop: 70,
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
  contentCarousel: {
    marginVertical: spacing.md,
    marginBottom: spacing.lg,
    position: 'relative',
  },
  carouselContent: {
    paddingHorizontal: spacing.md,
    marginTop: 20,
  },
  contentCard: {
    marginHorizontal: spacing.xs,
    width: 140,
  },
  posterContainer: {
    position: 'relative',
    width: 140,
    height: 220,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.modal.blur,
  },
  posterImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  posterGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  posterInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.sm,
  },
  posterTitle: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 2,
  },
  posterYear: {
    color: colors.text.secondary,
    fontSize: 11,
    fontWeight: '400',
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 2,
  },
});
