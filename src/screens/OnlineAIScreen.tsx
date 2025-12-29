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
  Alert,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import {cinemaChat} from '../services/groq';
import {colors, spacing, borderRadius, typography} from '../styles/theme';
import {modalStyles} from '../styles/styles';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import Markdown from 'react-native-markdown-display';
import {BlurView} from '@react-native-community/blur';
import {useNavigation, useRoute, useIsFocused} from '@react-navigation/native';
import {GradientSpinner} from '../components/GradientSpinner';
import {MicButton} from '../components/MicButton';
import {AISettingsManager} from '../store/aiSettings';
import {useResponsive} from '../hooks/useResponsive';
import useAndroidKeyboardInset from '../hooks/useAndroidKeyboardInset';
import {ChatManager, RealmSettingsManager} from '../database/managers';
import {AIReportFlag} from '../components/AIReportFlag';
import {HorizontalList} from '../components/HorizontalList';
import {ContentItem} from '../components/MovieList';
import {MaybeBlurView} from '../components/MaybeBlurView';
import {BlurPreference} from '../store/blurPreference';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  tmdbResults?: Array<{
    id: number;
    type: string;
    poster_path?: string;
    backdrop_path?: string;
    overview?: string;
    title: string;
    year: number;
    release_date?: string;
    first_air_date?: string;
  }>;
}

interface ChatThread {
  id: string;
  title: string;
  messages: Message[];
}

// Parallax card removed; using Watchlists-style HorizontalList instead

export const OnlineAIScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const isFocused = useIsFocused();
  const themeMode = BlurPreference.getMode();
  const isSolid = themeMode === 'normal';
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [animatedContent, setAnimatedContent] = useState('');
  const [isDefaultKey, setIsDefaultKey] = useState<boolean>(false);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const {isTablet} = useResponsive();
  const [showMenu, setShowMenu] = useState(false);
  const [isRateLimitExceeded, setIsRateLimitExceeded] = useState(false);
  const [rateLimitRetryAfter, setRateLimitRetryAfter] = useState<number | null>(
    null,
  ); // seconds until can retry
  const [rateLimitCountdown, setRateLimitCountdown] = useState<number | null>(
    null,
  ); // countdown timer
  const androidInset = useAndroidKeyboardInset(10);

  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string>('');
  const [showThreadPicker, setShowThreadPicker] = useState(false);
  const {height} = useWindowDimensions();
  // Helpers to work with threads
  const cap20 = (msgs: Message[]) => msgs.slice(-20);

  const findCurrentIndex = (all: ChatThread[], id: string) =>
    Math.max(
      0,
      all.findIndex(t => t.id === id),
    );

  const setAndPersistMessages = async (newHistory: Message[]) => {
    // Identify truly new messages by comparing with current state length
    // This allows us to persist even when 'messages' is capped at 20
    const diff = newHistory.length - messages.length;

    if (diff > 0) {
      const newMessagesToSave = newHistory.slice(-diff);
      const savedMessages = await ChatManager.getMessages(currentThreadId);
      const savedCount = savedMessages.length;

      for (let i = 0; i < newMessagesToSave.length; i++) {
        const msg = newMessagesToSave[i];
        await ChatManager.addMessage(currentThreadId, msg.role, msg.content);

        // Save recommendations if assistant message has them
        if (
          msg.role === 'assistant' &&
          msg.tmdbResults &&
          msg.tmdbResults.length > 0
        ) {
          const messageIndex = savedCount + i;
          const recommendations = msg.tmdbResults
            .filter(r => r.id && r.id !== 0 && r.type)
            .map(r => ({
              id: r.id,
              type: r.type || 'movie',
              title: r.title || '',
              name: r.title || '',
              poster_path: r.poster_path,
              vote_average: 0,
              release_date: r.release_date || '',
              first_air_date: r.first_air_date || '',
              overview: r.overview || '',
            }));
          await ChatManager.saveRecommendations(
            currentThreadId,
            messageIndex,
            recommendations,
          );
        }
      }
    }

    const capped = cap20(newHistory);
    setMessages(capped);

    // Update threads state for the picker
    setThreads(prev => {
      const idx = findCurrentIndex(prev, currentThreadId);
      if (idx === -1) return prev;
      const updated: ChatThread = {...prev[idx], messages: capped};
      return [...prev.slice(0, idx), updated, ...prev.slice(idx + 1)];
    });
  };

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  // Removed parallax scrollX; not needed with HorizontalList

  // Scroll to bottom helper
  const scrollToBottom = (animated = true) => {
    if (!flatListRef.current) return;

    // Multiple attempts with different timings to ensure layout is ready
    const handleScroll = () => {
      flatListRef.current?.scrollToEnd({animated});
    };

    // Immediate
    handleScroll();

    // Request animation frame for next tick
    requestAnimationFrame(handleScroll);

    // Backup with small delay
    setTimeout(handleScroll, 150);
  };

  // Scroll to bottom when messages change or animation updates
  useEffect(() => {
    if (messages.length > 0 || animating) {
      scrollToBottom(true);
    }
  }, [messages, animating, animatedContent]);

  // When screen regains focus, scroll to the latest message
  useEffect(() => {
    if (isFocused && messages.length > 0) {
      // Small delay to let the screen mount
      setTimeout(() => {
        scrollToBottom(false);
      }, 50);
    }
  }, [isFocused]);

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

  // Load threads from Realm
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const realmThreads = await ChatManager.getThreads();

        let loadedThreads: ChatThread[] = [];
        let loadedCurrentId = '';

        if (realmThreads && realmThreads.length > 0) {
          // Load messages for each thread
          loadedThreads = await Promise.all(
            realmThreads.map(async t => {
              const realmMessages = await ChatManager.getMessages(t.threadId);

              // Load recommendations for each assistant message
              const messagesWithRecs = await Promise.all(
                realmMessages.map(async (msg, index) => {
                  if (msg.role === 'assistant') {
                    const recs = await ChatManager.getRecommendations(
                      t.threadId,
                      index,
                    );
                    if (recs && recs.length > 0) {
                      return {
                        ...msg,
                        tmdbResults: recs.map(r => ({
                          id: r.id,
                          type: r.type,
                          title: r.title || r.name,
                          year: r.release_date
                            ? parseInt(r.release_date.slice(0, 4))
                            : r.first_air_date
                            ? parseInt(r.first_air_date.slice(0, 4))
                            : 0,
                          poster_path: r.poster_path,
                          overview: r.overview,
                        })),
                      };
                    }
                  }
                  return msg;
                }),
              );

              return {
                id: t.threadId,
                title: t.title,
                messages: messagesWithRecs,
              };
            }),
          );

          // Load last active thread ID
          const savedThreadId = await RealmSettingsManager.getSetting(
            'lastActiveThreadId',
          );
          if (
            savedThreadId &&
            loadedThreads.find(t => t.id === savedThreadId)
          ) {
            loadedCurrentId = savedThreadId;
          } else {
            loadedCurrentId = realmThreads[0].threadId;
          }
        }

        // Create default thread if none exist
        if (loadedThreads.length === 0) {
          const threadId = String(Date.now());
          await ChatManager.createThread(threadId, '');
          loadedThreads = [
            {
              id: threadId,
              title: '',
              messages: [],
            },
          ];
          loadedCurrentId = threadId;
        }

        // Normalize titles: replace default 'Chat N' with first user message preview if available
        loadedThreads = (loadedThreads || []).map((t, idx) => {
          const looksDefault = !t.title || /^Chat\s\d+$/i.test(t.title);
          if (looksDefault) {
            const firstUserMsg = (t.messages || []).find(
              m => m.role === 'user',
            );
            if (firstUserMsg?.content) {
              const preview = firstUserMsg.content
                .split(/\s+/)
                .slice(0, 6)
                .join(' ');
              return {...t, title: preview};
            }
          }
          return t;
        });

        // If still empty, create a default thread
        if (!loadedThreads || loadedThreads.length === 0) {
          const initial: ChatThread = {
            id: String(Date.now()),
            title: '',
            messages: [],
          };
          loadedThreads = [initial];
          loadedCurrentId = initial.id;
        }

        if (mounted) {
          setThreads(loadedThreads);
          setCurrentThreadId(loadedCurrentId || loadedThreads[0].id);
          const current = loadedThreads.find(
            t => t.id === (loadedCurrentId || loadedThreads[0].id),
          );
          setMessages(cap20(current?.messages || []));
        }
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

  // Countdown timer for rate limit
  useEffect(() => {
    if (rateLimitRetryAfter !== null && rateLimitRetryAfter > 0) {
      setRateLimitCountdown(rateLimitRetryAfter);

      const interval = setInterval(() => {
        setRateLimitCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            setIsRateLimitExceeded(false);
            setRateLimitRetryAfter(null);
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [rateLimitRetryAfter]);

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
        const firstWords = userMessage.content
          .split(/\s+/)
          .slice(0, 6)
          .join(' ');
        const updated: ChatThread = {...t, title: firstWords || t.title};
        ChatManager.updateThread(currentThreadId, {
          title: firstWords || t.title,
        });
        const next = [...prev.slice(0, idx), updated, ...prev.slice(idx + 1)];
        return next;
      }
      return prev;
    });
    setInput('');
    setLoading(true);
    setAnimating(false);
    setAnimatedContent('');
    try {
      const aiMessages = newMessages.slice(-4).map(({role, content}) => ({
        role: role as 'user' | 'assistant',
        content,
      }));
      const response = await cinemaChat(aiMessages);
      let tmdbResults:
        | Array<{
            id: number;
            type: string;
            poster_path?: string;
            backdrop_path?: string;
            overview?: string;
            title: string;
            year: number;
            release_date?: string;
            first_air_date?: string;
          }>
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
            backdrop_path?: string;
            overview?: string;
            title: string;
            year: number;
            release_date?: string;
            first_air_date?: string;
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
              const candidates = Array.isArray(data.results)
                ? data.results
                : [];
              // Prefer language match first, then score by year and popularity
              const aiLang = item.original_language;
              const aiYear =
                typeof item.year === 'string'
                  ? parseInt(item.year, 10)
                  : item.year;
              const normalize = (t: string | undefined) =>
                (t || '')
                  .toLowerCase()
                  .normalize('NFD')
                  .replace(/\p{Diacritic}/gu, '')
                  .replace(/[^a-z0-9]+/g, ' ')
                  .trim();
              const aiTitleN = normalize(item.title);
              let pool = aiLang
                ? candidates.filter((c: any) => c?.original_language === aiLang)
                : candidates;
              // Fallback: if language-filtered pool is empty, retry without year constraint
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
              if (pool.length === 0) {
                found = null;
              } else {
                const score = (c: any) => {
                  let s = 0;
                  const candTitle = c?.title || c?.name || '';
                  const candTitleN = normalize(candTitle);
                  if (candTitleN === aiTitleN)
                    s += 2; // exact normalized title match bonus
                  else if (
                    candTitleN.startsWith(aiTitleN) ||
                    aiTitleN.startsWith(candTitleN)
                  )
                    s += 1; // prefix containment bonus
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
                found = pool.reduce(
                  (best: any, cur: any) =>
                    score(cur) > score(best) ? cur : best,
                  pool[0],
                );
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
              const normalize = (t: string | undefined) =>
                (t || '')
                  .toLowerCase()
                  .normalize('NFD')
                  .replace(/\p{Diacritic}/gu, '')
                  .replace(/[^a-z0-9]+/g, ' ')
                  .trim();
              const aiTitleN = normalize(item.title);
              let pool = aiLang
                ? candidates.filter((c: any) => c?.original_language === aiLang)
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
              if (pool.length === 0) {
                found = null;
              } else {
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
                found = pool.reduce(
                  (best: any, cur: any) =>
                    score(cur) > score(best) ? cur : best,
                  pool[0],
                );
              }
            }
            if (found) {
              tmdbResults.push({
                id: found.id,
                type: item.type,
                poster_path: found.poster_path,
                backdrop_path: found.backdrop_path,
                overview: found.overview,
                title: found.title || found.name || item.title,
                year: item.year,
                release_date: found.release_date,
                first_air_date: found.first_air_date,
              });
            } else {
              tmdbResults.push({
                id: 0,
                type: item.type,
                poster_path: undefined,
                backdrop_path: undefined,
                overview: undefined,
                title: item.title,
                year: item.year,
                release_date: undefined,
                first_air_date: undefined,
              });
            }
          }
          text = response.aiResponse;
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
        } catch (e) {}
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
      console.error('[OnlineAIScreen] Chat error:', e);
      const errText = (e as any)?.message
        ? String((e as any).message)
        : String(e);
      const is429 = /429/.test(errText);
      const is401or403 = /401|403/.test(errText);
      const is503 = /503/.test(errText);
      const noApiKey = /NO_API_KEY/i.test(errText);

      // Extract retry-after from error if available
      const retryAfter = (e as any)?.retryAfter;

      setIsRateLimitExceeded(is429);
      if (is429 && retryAfter) {
        setRateLimitRetryAfter(retryAfter);
        console.warn(
          `[OnlineAIScreen] Rate limit countdown started: ${retryAfter}s`,
        );
      }

      let friendly = 'Sorry, there was an error.';
      if (noApiKey) {
        friendly =
          'AI key missing. Please open AI Settings and add your Groq API key.';
      } else if (is401or403) {
        friendly =
          'Your AI API key seems invalid or unauthorized. Please update it in AI Settings.';
      } else if (is429) {
        if (retryAfter) {
          const minutes = Math.floor(retryAfter / 60);
          const seconds = retryAfter % 60;
          const timeStr =
            minutes > 0
              ? `${minutes} minute${
                  minutes > 1 ? 's' : ''
                } and ${seconds} second${seconds !== 1 ? 's' : ''}`
              : `${seconds} second${seconds !== 1 ? 's' : ''}`;
          friendly = `Rate limit exceeded. Please wait ${timeStr} before trying again. You can also try a different API key in AI Settings.`;
        } else {
          friendly =
            'Rate limit exceeded. Please wait a moment or try a different API key in AI Settings.';
        }
      } else if (is503) {
        friendly =
          'The AI service is temporarily unavailable (503). Please try again shortly.';
      }

      const errorMessage: Message = {role: 'assistant', content: friendly};
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
    await ChatManager.createThread(newThread.id, newThread.title);
    await RealmSettingsManager.setSetting('lastActiveThreadId', newThread.id);
  };

  const handleClearCurrent = () => {
    Alert.alert(
      'Clear chat?',
      'This will delete all messages in this conversation.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          onPress: async () => {
            await ChatManager.deleteThread(currentThreadId);
            await ChatManager.createThread(
              currentThreadId,
              threads.find(t => t.id === currentThreadId)?.title || '',
            );
            setMessages([]);
            setThreads(prev => {
              const idx = findCurrentIndex(prev, currentThreadId);
              if (idx === -1) return prev;
              const updated: ChatThread = {...prev[idx], messages: []};
              const next = [
                ...prev.slice(0, idx),
                updated,
                ...prev.slice(idx + 1),
              ];
              return next;
            });
          },
        },
      ],
      {cancelable: true},
    );
  };

  const switchThread = async (id: string) => {
    setCurrentThreadId(id);
    const t = threads.find(th => th.id === id);
    setMessages(cap20(t?.messages || []));
    setShowThreadPicker(false);
    // Save last active thread
    await RealmSettingsManager.setSetting('lastActiveThreadId', id);
  };

  const deleteThread = async (id: string) => {
    await ChatManager.deleteThread(id);

    const remaining = threads.filter(t => t.id !== id);

    // If deleting current thread, choose a new current
    if (id === currentThreadId) {
      if (remaining.length > 0) {
        const nextId = remaining[0].id;
        setCurrentThreadId(nextId);
        const nextThread = remaining.find(t => t.id === nextId);
        setMessages(cap20(nextThread?.messages || []));
        setThreads(remaining);
        await RealmSettingsManager.setSetting('lastActiveThreadId', nextId);
      } else {
        // No threads left: create a new empty thread
        const newThread: ChatThread = {
          id: String(Date.now()),
          title: '',
          messages: [],
        };
        await ChatManager.createThread(newThread.id, newThread.title);
        setCurrentThreadId(newThread.id);
        setMessages([]);
        setThreads([newThread]);
        await RealmSettingsManager.setSetting(
          'lastActiveThreadId',
          newThread.id,
        );
      }
    } else {
      // If deleting a non-current thread
      setThreads(remaining);
    }
  };

  const renderItem = ({item, index}: {item: Message; index: number}) => {
    // Check if this is the last message and from AI
    const isLast =
      index === displayMessages.length - 1 && item.role === 'assistant';
    // Find previous user message text
    const getPrevUserText = (i: number) => {
      for (let j = i - 1; j >= 0; j--) {
        const m = displayMessages[j];
        if (m?.role === 'user') return m.content;
      }
      return undefined;
    };
    const prevUserText = getPrevUserText(index);

    // Sanitize assistant content: remove trailing empty fenced code blocks (e.g., ```json\n\n```)
    const stripTrailingEmptyCodeFence = (s: string) =>
      typeof s === 'string'
        ? s
            // remove a trailing empty fenced block with optional language
            .replace(/\n?```[a-zA-Z0-9]*\s*```\s*$/s, '')
            // remove any dangling lone fence at end
            .replace(/\n?```\s*$/s, '')
            .trimEnd()
        : s;
    const contentToRender =
      item.role === 'assistant'
        ? stripTrailingEmptyCodeFence(item?.content)
        : item?.content;

    // Markdown styles to avoid white background blocks
    const markdownStyles = {
      body: styles.messageText,
      code_block: {backgroundColor: 'transparent'},
      fence: {backgroundColor: 'transparent'},
      code_inline: {backgroundColor: 'transparent'},
    } as const;

    return (
      <View style={isLast && {paddingBottom: 120}}>
        {item.role === 'user' ? (
          <View style={[styles.message, styles.user]}>
            <Text style={styles.userText}>{item?.content}</Text>
          </View>
        ) : (
          <View>
            <View style={[styles.message, styles.assistant]}>
              <Markdown style={markdownStyles}>{contentToRender}</Markdown>
            </View>
            <AIReportFlag
              aiText={item?.content}
              userText={prevUserText}
              context="OnlineAIScreen"
              threadId={currentThreadId}
              timestamp={Date.now()}
            />
          </View>
        )}
        {item.tmdbResults && item.tmdbResults.length > 0 && (
          <View style={{marginTop: spacing.md}}>
            <View style={styles.watchlistItemBox}>
              <LinearGradient
                colors={['transparent', 'rgb(18, 0, 22)', 'rgb(18, 0, 22)']}
                pointerEvents="none"
                style={[styles.watchlistItemGradient]}
                start={{x: 0, y: 0}}
                end={{x: 0, y: 1}}
              />
              <View
                style={[
                  styles.listContainerAI,
                  {height: isTablet ? 350 : 250},
                ]}>
                <HorizontalList
                  title={''}
                  data={
                    (item.tmdbResults || []).map(m => ({
                      id: m.id,
                      title: m.title,
                      name: m.title,
                      overview: m.overview || '',
                      poster_path: m.poster_path,
                      backdrop_path: m.backdrop_path,
                      vote_average: 0,
                      release_date: m.release_date || '',
                      first_air_date: m.first_air_date || '',
                      type: (m.type === 'tv'
                        ? 'tv'
                        : 'movie') as ContentItem['type'],
                    })) as unknown as ContentItem[]
                  }
                  isLoading={false}
                  onItemPress={(ci: ContentItem) => {
                    if (ci.type === 'movie') {
                      (navigation as any).navigate('MovieDetails', {movie: ci});
                    } else {
                      (navigation as any).navigate('TVShowDetails', {show: ci});
                    }
                  }}
                  isSeeAll={false}
                  isFilter={true}
                  isHeadingSkeleton={false}
                />
                <LinearGradient
                  colors={['transparent', 'rgb(18, 0, 22)']}
                  pointerEvents="none"
                  style={{
                    width: '100%',
                    height: 200,
                    position: 'absolute',
                    bottom: isTablet ? 50 : 20,
                    zIndex: 1,
                    opacity: 0.9,
                  }}
                />
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  // Use displayMessages for FlatList data
  const displayMessages: Message[] = animating
    ? [...messages, {role: 'assistant', content: animatedContent} as Message]
    : messages;

  // When not focused, render a lightweight container to prevent heavy list/animations causing stutter
  if (!isFocused) {
    return <View style={{flex: 1, backgroundColor: 'rgb(18, 0, 22)'}} />;
  }

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
        ]}
        pointerEvents="box-none">
        <TouchableOpacity
          activeOpacity={0.9}
          style={{
            position: 'absolute',
            top: 30,
            left: 20,
            zIndex: 100,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: borderRadius.round,
            height: 50,
            width: 50,
            borderColor: colors.modal.border,
            borderWidth: 1,
            borderBottomWidth: 0,
            backgroundColor: colors.modal.blur,
          }}
          onPress={() => {
            // Always navigate to MySpace screen instead of going back
            (navigation as any).navigate('MySpaceScreen');
          }}>
          <Icon name="chevron-back" size={20} color="white" />
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            position: 'absolute',
            top: 30,
            right: 20,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            borderRadius: borderRadius.round,
            height: 50,
            paddingHorizontal: 12,
            borderColor: colors.modal.border,
            borderWidth: 1,
            borderBottomWidth: 0,
            zIndex: 100,
            overflow: 'hidden',
            backgroundColor: colors.modal.blur,
          }}
          onPress={() => setShowMenu(true)}>
          <Icon name="chatbubble-ellipses-outline" size={20} color="white" />
          <Text style={{color: 'white', fontSize: 12}}>Chats</Text>
        </TouchableOpacity>

        <View style={styles.container}>
          <LinearGradient
            colors={['rgba(32, 0, 22, 0.97)', 'rgba(98, 0, 55, 0)']}
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
            key={`chat-list-${currentThreadId}`} // Force re-mount on thread switch
            data={displayMessages}
            renderItem={renderItem}
            keyExtractor={(_, idx) => `${currentThreadId}-${idx}`}
            contentContainerStyle={[
              styles.chat,
              {
                paddingBottom:
                  Platform.OS === 'android' ? androidInset + 60 : 84,
              },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            onContentSizeChange={() => {
              // Always scroll on content size change for new messages/animations
              scrollToBottom(true);
            }}
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
                    Theater AI is thinking...
                  </Animated.Text>
                </Animated.View>
              ) : null
            }
            ListEmptyComponent={
              <View
                style={{
                  height: height,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginTop: -100,
                }}>
                <Image
                  source={require('../assets/theater.webp')}
                  style={{
                    width: 120,
                    height: 120,
                    marginBottom: spacing.md,
                    objectFit: 'contain',
                  }}
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
        </View>
      </Animated.View>
      {/* Floating input bar (outside Animated.View to avoid transform shifting) */}
      <LinearGradient
        colors={['transparent', 'rgba(36, 1, 37, 1)']}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 90,
          marginHorizontal: 2,
          zIndex: 0,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: Platform.OS === 'android' ? androidInset : 20,
          marginHorizontal: isTablet ? 100 : spacing.lg,
          borderRadius: 50,
          zIndex: 100,
        }}>
        <View style={{overflow: 'hidden', borderRadius: 50}}>
          <BlurView
            blurAmount={10}
            blurRadius={5}
            blurType="dark"
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
                placeholder={
                  rateLimitCountdown !== null && rateLimitCountdown > 0
                    ? 'Rate limit active - please wait...'
                    : 'Ask about movies, TV, actors...'
                }
                placeholderTextColor={colors.text.tertiary}
                editable={
                  rateLimitCountdown === null || rateLimitCountdown <= 0
                }
                onFocus={() =>
                  setTimeout(
                    () => flatListRef.current?.scrollToEnd({animated: true}),
                    50,
                  )
                }
                onSubmitEditing={sendMessage}
                returnKeyType="send"
              />
              <MicButton
                onPartialText={text => {
                  // live partial updates
                  if (text) setInput(text);
                }}
                onFinalText={text => {
                  setInput(text);
                  // keep focus in the input so user can tap send
                  inputRef.current?.focus();
                }}
                locale={Platform.OS === 'android' ? 'en-IN' : undefined}
              />
              <Animated.View>
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    {
                      opacity:
                        loading ||
                        !input.trim() ||
                        (rateLimitCountdown !== null && rateLimitCountdown > 0)
                          ? 0.5
                          : 1,
                    },
                  ]}
                  onPress={sendMessage}
                  disabled={
                    loading ||
                    !input.trim() ||
                    (rateLimitCountdown !== null && rateLimitCountdown > 0)
                  }>
                  <Icon
                    name={'send'}
                    size={24}
                    color={
                      loading ||
                      !input.trim() ||
                      (rateLimitCountdown !== null && rateLimitCountdown > 0)
                        ? colors.modal.active
                        : colors.text.primary
                    }
                  />
                </TouchableOpacity>
              </Animated.View>
            </View>
          </TouchableWithoutFeedback>
        </View>
        {/* Rate limit countdown indicator */}
        {rateLimitCountdown !== null && rateLimitCountdown > 0 && (
          <Animated.View
            style={{
              marginTop: spacing.sm,
              marginBottom: -spacing.sm,
              marginHorizontal: spacing.sm,
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.md,
              backgroundColor: 'rgba(255, 100, 100, 0.15)',
              borderRadius: borderRadius.md,
              borderWidth: 1,
              borderColor: 'rgba(255, 100, 100, 0.3)',
              opacity: pulseAnim,
            }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.xs,
              }}>
              <Icon name="time-outline" size={16} color="#ff6464" />
              <Text
                style={{
                  textAlign: 'center',
                  ...typography.body2,
                  fontSize: 12,
                  color: '#ff6464',
                  fontWeight: '600',
                }}>
                Rate limit active. Retry in{' '}
                {Math.floor(rateLimitCountdown / 60) > 0
                  ? `${Math.floor(rateLimitCountdown / 60)}:${String(
                      rateLimitCountdown % 60,
                    ).padStart(2, '0')}`
                  : `${rateLimitCountdown}s`}
              </Text>
            </View>
          </Animated.View>
        )}
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
            Responses are AI generated and for entertainment purposes only.
          </Text>
        </View>
      </View>
      {/* Menu Modal: uses shared modalStyles for consistent UI */}
      <Modal
        visible={showMenu}
        animationType="slide"
        statusBarTranslucent={true}
        backdropColor={colors.modal.blurDark}
        onRequestClose={() => setShowMenu(false)}>
        {!isSolid && (
          <BlurView
            blurType="dark"
            blurAmount={10}
            overlayColor={colors.modal.blurDark}
            style={{
              flex: 1,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
        )}
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: isSolid ? 'rgba(0, 0, 0, 0.5)' : 'transparent',
          }}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}>
          <View style={{flex: 1, justifyContent: 'flex-end'}}>
            <View
              style={{
                margin: isTablet ? spacing.xl : spacing.md,
                borderRadius: borderRadius.xl,
                backgroundColor: 'transparent',
              }}>
              <MaybeBlurView
                header
                style={[
                  {
                    marginTop: 20,
                  },
                ]}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                  }}>
                  <Icon name="sparkles" size={20} color={colors.text.muted} />
                  <Text style={modalStyles.modalTitle}>Theater AI</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowMenu(false)}
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
                  minHeight: 300,
                  maxHeight: 500,
                  overflow: 'hidden',
                  borderRadius: borderRadius.xl,
                }}>
                <MaybeBlurView body style={{flex: 1}}>
                  <View style={{padding: spacing.md, paddingTop: spacing.sm}}>
                    {/* New chat */}
                    <TouchableOpacity
                      onPress={async () => {
                        setShowMenu(false);
                        await handleNewThread();
                      }}
                      activeOpacity={0.9}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 24,
                        borderWidth: 1,
                        borderColor: colors.modal.border,
                        backgroundColor: colors.modal.content,
                        paddingVertical: 12,
                        marginBottom: spacing.md,
                      }}>
                      <Icon name="add" size={18} color={colors.text.primary} />
                      <Text
                        style={{
                          color: colors.text.primary,
                          ...typography.button,
                          marginLeft: 8,
                        }}>
                        New chat
                      </Text>
                    </TouchableOpacity>

                    {/* Recent */}
                    <Text
                      style={{
                        color: colors.text.secondary,
                        ...typography.body2,
                        marginBottom: spacing.xs,
                        marginTop: 2,
                      }}>
                      Recent
                    </Text>
                    <View
                      style={{
                        borderTopColor: colors.modal.border,
                        borderTopWidth: 1,
                        marginBottom: spacing.xs,
                        opacity: 0.6,
                      }}
                    />
                    {threads.length === 0 ? (
                      <Text
                        style={{
                          color: colors.text.tertiary,
                          fontFamily: 'Inter_18pt-Regular',
                        }}>
                        No chats yet
                      </Text>
                    ) : (
                      <ScrollView
                        contentContainerStyle={{paddingBottom: 200}}
                        showsVerticalScrollIndicator={false}>
                        {threads.map(th => {
                          const label =
                            th.title && th.title.trim().length > 0
                              ? th.title
                              : '(New chat)';
                          return (
                            <TouchableOpacity
                              key={th.id}
                              onPress={async () => {
                                setShowMenu(false);
                                await switchThread(th.id);
                              }}
                              style={{
                                paddingVertical: 10,
                                paddingHorizontal: 10,
                                borderRadius: 8,
                                backgroundColor:
                                  th.id === currentThreadId
                                    ? colors.modal.blur
                                    : 'transparent',
                                borderWidth: 1,
                                borderColor:
                                  th.id === currentThreadId
                                    ? colors.modal.content
                                    : 'transparent',
                                marginBottom: 6,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                              }}>
                              <Text
                                style={{
                                  color: colors.text.primary,
                                  fontFamily: 'Inter_18pt-Regular',
                                }}
                                numberOfLines={1}>
                                {label}
                              </Text>
                              <TouchableOpacity
                                onPress={() => deleteThread(th.id)}
                                hitSlop={{
                                  top: 10,
                                  bottom: 10,
                                  left: 10,
                                  right: 10,
                                }}
                                style={{
                                  paddingHorizontal: 2,
                                  paddingVertical: 2,
                                }}>
                                <Icon
                                  name="close"
                                  size={18}
                                  color={colors.text.tertiary}
                                />
                              </TouchableOpacity>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    )}
                  </View>
                </MaybeBlurView>
              </View>
            </View>
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
    overflow: 'visible',
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
    borderEndColor: colors.modal.blur,
    borderRadius: 50,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
  // Watchlists-like container for tmdbResults under AI response
  watchlistItemBox: {
    backgroundColor: colors.background.tertiary,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.modal.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    position: 'relative',
    height: 300,
    marginHorizontal: spacing.md,
  },
  watchlistItemGradient: {
    width: '180%',
    height: '130%',
    position: 'absolute',
    bottom: -25,
    left: -50,
    zIndex: 0,
    transform: [{rotate: '-15deg'}],
  },
  listContainerAI: {
    position: 'relative',
    width: '120%',
    overflow: 'scroll',
    bottom: 10,
    left: -30,
    zIndex: 1,
  },
  watchlistItemBottomFade: {},
});
