import React, {useState, useEffect, useCallback, useRef, useMemo} from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  ImageBackground,
  FlatList,
  Linking,
} from 'react-native';
import {PermissionModal} from '../components/PermissionModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {notificationService} from '../services/NotificationService';
import YoutubePlayer from 'react-native-youtube-iframe';
import {
  useTVShowDetails,
  useSimilarTVShows,
  useTVShowRecommendations,
  useSeasonDetails,
  useAISimilarTVShows,
  useTVShowReviews,
} from '../hooks/useTVShows';
import {
  getImageUrl,
  getLanguage,
  getDirectors,
  getWriters,
  getComposer,
  getCinematographer,
} from '../services/tmdb';
import {
  TVShow,
  TVShowDetails as TVShowDetailsType,
  Episode,
} from '../types/tvshow';
import {Video, Genre, Cast, Movie} from '../types/movie';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {HorizontalList} from '../components/HorizontalList';
import {MovieTrivia} from '../components/MovieTrivia';
import {CastCrewTabbedSection} from '../components/CastCrewTabbedSection';
import {MediaTabs} from '../components/MediaTabs';
import {KeywordsDisplay} from '../components/KeywordsDisplay';
import {TVShowMetaInfo} from '../components/TVShowMetaInfo';
import {ShowStatus} from '../components/ShowStatus';
import {TVShowProductionInfo} from '../components/TVShowProductionInfo';
import {
  useIsFocused,
  useNavigation,
  useFocusEffect,
} from '@react-navigation/native';
import {useNavigationState} from '../hooks/useNavigationState';
import {useContentTags} from '../hooks/useContentTags';
import {ContentTagsDisplay} from '../components/ContentTagsDisplay';
import {ReviewsSection} from '../components/ReviewsSection';
import {ContentItem} from '../components/MovieList';
import {
  MySpaceStackParamList,
  HomeStackParamList,
  SearchStackParamList,
  MoviesStackParamList,
  TVShowsStackParamList,
  CurationStackParamList,
} from '../types/navigation';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {
  DetailScreenSkeleton,
  BannerSkeleton,
  IMDBSkeleton,
} from '../components/LoadingSkeleton';
import {DiaryButton} from '../components/DiaryButton';
import {EpisodeActionButtons} from '../components/EpisodeActionButtons';
import {BlurView} from '@react-native-community/blur';
import {useWatchProviders} from '../hooks/useWatchProviders';
import {WatchProviders} from '../components/WatchProviders';
import {WatchProvidersButton} from '../components/WatchProvidersButton';
import {LinearGradient} from 'react-native-linear-gradient';
import {GradientButton} from '../components/GradientButton';
import {PersonCard} from '../components/PersonCard';
import {WatchlistModal} from '../components/WatchlistModal';
import {
  useIsItemInAnyWatchlist,
  useWatchlistContainingItem,
  useRemoveFromWatchlist,
} from '../hooks/useWatchlists';
import {useQueryClient} from '@tanstack/react-query';
import Cinema from '../components/Cinema';
import {ServerModal} from '../components/ServerModal';
import {GradientSpinner} from '../components/GradientSpinner';
import {useResponsive} from '../hooks/useResponsive';
import {MovieAIChatModal} from '../components/MovieAIChatModal';
import {useAIEnabled} from '../hooks/useAIEnabled';
import {checkInternet} from '../services/connectivity';
import {NoInternet} from './NoInternet';
import {HistoryManager} from '../store/history';
import {getRealm} from '../database/realm';
import ShareLib, {Social} from 'react-native-share';
import {requestPosterCapture} from '../components/PosterCaptureHost';
import {MaybeBlurView} from '../components/MaybeBlurView';
import {IMDBModal} from '../components/IMDBModal';
import {useContentAnalysis} from '../hooks/useContentAnalysis';
import {ScheduleWatchModal} from '../components/ScheduleWatchModal';
import {FeedbackModal} from '../components/FeedbackModal';
import {BlurPreference} from '../store/blurPreference';
import Icon from 'react-native-vector-icons/Ionicons';
import {CalendarMark as CalendarBold} from '@solar-icons/react-native/dist/icons/time/Bold/CalendarMark.mjs';
import {CalendarAdd as CalendarLinear} from '@solar-icons/react-native/dist/icons/time/Linear/CalendarAdd.mjs';
import {useConnectivity} from '../hooks/useConnectivity';

type TVShowDetailsScreenNavigationProp = NativeStackNavigationProp<
  MySpaceStackParamList &
    HomeStackParamList &
    SearchStackParamList &
    MoviesStackParamList &
    TVShowsStackParamList &
    CurationStackParamList
>;

interface TVShowDetailsScreenProps {
  route: {
    params: {
      show: TVShow;
    };
  };
}

export const TVShowDetailsScreen: React.FC<TVShowDetailsScreenProps> = ({
  route,
}) => {
  const navigation = useNavigation<TVShowDetailsScreenNavigationProp>();
  const {navigateWithLimit} = useNavigationState();
  const params = route.params as any;
  const show = params.show || {
    id: params.tvShowId || params.id,
    name: params.name || params.title || '',
    overview: '',
    poster_path: null,
    backdrop_path: null,
    vote_average: 0,
    first_air_date: '',
    genre_ids: [],
    origin_country: [],
    popularity: 0,
    original_language: '',
  };
  const {isAIEnabled} = useAIEnabled();
  const themeMode = BlurPreference.getMode();
  const isSolid = themeMode === 'normal';
  const [isPlaying, setIsPlaying] = useState(false);
  const [isScheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [scheduledWatchDate, setScheduledWatchDate] = useState<Date | null>(
    null,
  );
  const [isPosterLoading, setIsPosterLoading] = useState(true);
  const [showWatchlistModal, setShowWatchlistModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    (() => Promise<void>) | null
  >(null);
  const {
    data: showDetails,
    isLoading,
    error: showDetailsError,
  } = useTVShowDetails(show.id);

  // Memoize genres to prevent unnecessary re-renders
  const genresArray = useMemo(
    () => showDetails?.genres?.map((g: Genre) => g.name) || [],
    [showDetails?.genres],
  );

  // Unified AI Analysis
  const {data: analysisData, isLoading: isAnalysisLoading} = useContentAnalysis(
    {
      title: show.name,
      year: (
        (show as any).first_air_date || (showDetails as any)?.first_air_date
      )?.split('-')[0],
      overview: show.overview || showDetails?.overview || '',
      genres: genresArray,
      type: 'tv',
      contentId: show.id,
      releaseDate:
        (show as any).first_air_date || (showDetails as any)?.first_air_date,
      enabled: !!(showDetails && isAIEnabled),
    },
  );

  // Calendar state
  const [isInCalendar, setIsInCalendar] = useState(false);
  const [feedback, setFeedback] = useState<{
    visible: boolean;
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
  }>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
  });

  const nextEpisode =
    (show as any)?.next_episode_to_air ||
    (showDetails as any)?.next_episode_to_air;

  console.log('[TVShowDetails] Debug:', {
    showId: show.id,
    showName: show.name,
    nextEpisode,
    showDetailsLoaded: !!showDetails,
    hasNextEpisodeInShow: !!(show as any)?.next_episode_to_air,
    hasNextEpisodeInDetails: !!(showDetails as any)?.next_episode_to_air,
  });

  const isFuture = useMemo(() => {
    if (!nextEpisode?.air_date) {
      console.log('[TVShowDetails] No air_date found');
      return false;
    }
    const airDate = new Date(nextEpisode.air_date);
    const now = new Date();
    const isFuture = airDate > now;
    return isFuture;
  }, [nextEpisode, showDetails, isLoading]);

  useEffect(() => {
    const checkCalendar = async () => {
      try {
        const stored = await AsyncStorage.getItem('calendar_items');
        if (stored) {
          const items = JSON.parse(stored);
          const exists = items.some(
            (i: any) => i.id === show.id && i.type === 'tv',
          );
          setIsInCalendar(exists);

          const customSchedule = items.find(
            (i: any) =>
              i.id === show.id &&
              i.type === 'tv' &&
              i.schedulerType === 'custom',
          );

          if (customSchedule) {
            setScheduledWatchDate(
              new Date(customSchedule.date || customSchedule.releaseDate),
            );
          } else {
            setScheduledWatchDate(null);
          }
        }
      } catch (e) {}
    };
    checkCalendar();
  }, [show.id, isScheduleModalVisible]);

  const proceedToggleCalendar = async () => {
    try {
      const stored = await AsyncStorage.getItem('calendar_items');
      let items = stored ? JSON.parse(stored) : [];

      if (isInCalendar) {
        // Remove
        const item = items.find(
          (i: any) => i.id === show.id && i.type === 'tv',
        );
        if (item && item.notificationId) {
          await notificationService.cancelScheduledNotification(
            item.notificationId,
          );
        }
        items = items.filter(
          (i: any) => !(i.id === show.id && i.type === 'tv'),
        );
        setIsInCalendar(false);
      } else {
        // Add
        if (!nextEpisode?.air_date) return;

        const releaseDate = new Date(nextEpisode.air_date);
        // Set notification for 7am on release day
        releaseDate.setHours(7, 0, 0, 0);

        const notifId = `tv_release_${show.id}_${nextEpisode.episode_number}`;

        // Only schedule if date is future
        if (releaseDate > new Date()) {
          await notificationService.scheduleReleaseNotification(
            notifId,
            'New Episode Today!',
            `${show.name} - ${
              nextEpisode.name || 'New Episode'
            } is airing today.`,
            releaseDate,
            {screen: 'TVShowDetails', showId: show.id},
            show.poster_path
              ? `https://image.tmdb.org/t/p/w200${show.poster_path}`
              : null,
          );
        }

        items.push({
          id: show.id,
          type: 'tv',
          title: show.name,
          posterPath: show.poster_path,
          releaseDate: nextEpisode.air_date,
          notificationId: notifId,
        });
        setIsInCalendar(true);
      }
      await AsyncStorage.setItem('calendar_items', JSON.stringify(items));
    } catch (error) {
      console.error('Error toggling calendar', error);
    }
  };

  const handleToggleCalendar = async () => {
    try {
      // Check notification permission
      const hasPermission = await notificationService.checkPermission();
      if (!isInCalendar && !hasPermission) {
        setPendingAction(() => proceedToggleCalendar);
        setShowPermissionModal(true);
        return;
      }
      await proceedToggleCalendar();
    } catch (error) {
      console.error('Error checking permission', error);
    }
  };

  const handleScheduleWatch = async (
    date: Date,
    type?: 'release' | 'custom',
  ) => {
    if (type === 'release') {
      if (!isInCalendar) {
        await handleToggleCalendar();
        setFeedback({
          visible: true,
          type: 'success',
          title: 'Scheduled',
          message: 'You have been subscribed to release notifications.',
        });
      } else {
        setFeedback({
          visible: true,
          type: 'info',
          title: 'Already Scheduled',
          message: 'You are already subscribed to release notifications.',
        });
      }
      return;
    }

    // Validate date is in the future
    if (date.getTime() <= Date.now()) {
      setFeedback({
        visible: true,
        type: 'error',
        title: 'Invalid Time',
        message:
          'You cannot schedule a screening in the past. Please select a future time.',
      });
      return;
    }

    // Check notification permission
    const hasPermission = await notificationService.checkPermission();
    if (!hasPermission) {
      setPendingAction(() => async () => await proceedScheduleWatch(date));
      setShowPermissionModal(true);
      return;
    }
    await proceedScheduleWatch(date);
  };

  const proceedScheduleWatch = async (date: Date) => {
    try {
      const stored = await AsyncStorage.getItem('calendar_items');
      let items = stored ? JSON.parse(stored) : [];

      // Remove existing custom schedule for this show
      const existingIndex = items.findIndex(
        (i: any) =>
          i.id === show.id && i.type === 'tv' && i.schedulerType === 'custom',
      );

      if (existingIndex > -1) {
        const oldItem = items[existingIndex];
        if (oldItem.notificationId) {
          await notificationService.cancelScheduledNotification(
            oldItem.notificationId,
          );
        }
        items.splice(existingIndex, 1);
      }

      const notifId = `tv_schedule_${show.id}`;

      await notificationService.scheduleReleaseNotification(
        notifId,
        'TV Screening',
        `It's time to watch ${show.name}!`,
        date,
        {screen: 'TVShowDetails', tvShowId: show.id},
        show.poster_path
          ? `https://image.tmdb.org/t/p/w200${show.poster_path}`
          : null,
      );

      items.push({
        id: show.id,
        type: 'tv',
        title: show.name,
        posterPath: show.poster_path,
        releaseDate: nextEpisode?.air_date || '', // Optional for custom schedule
        date: date.toISOString(),
        schedulerType: 'custom',
        notificationId: notifId,
      });

      await AsyncStorage.setItem('calendar_items', JSON.stringify(items));
      setIsInCalendar(true);
      setScheduledWatchDate(date); // Instant UI update
      setFeedback({
        visible: true,
        type: 'success',
        title: 'Scheduled',
        message: `Screening set for ${date.toLocaleString([], {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}`,
      });
    } catch (error) {
      console.error('Error scheduling watch', error);
      setFeedback({
        visible: true,
        type: 'error',
        title: 'Scheduling Failed',
        message: 'Could not schedule the screening. Please try again.',
      });
    }
  };

  // Generate and store thematic/emotional tags for this TV show
  const {isGenerating: isGeneratingTags, tags: contentTags} = useContentTags({
    title: show.name,
    overview: show.overview,
    genres:
      (showDetails?.genres || []).map((g: Genre) => g.name).join(', ') || '',
    type: 'tv',
    contentId: show.id,
    enabled: !!(showDetails && isAIEnabled),
    poster_path: show.poster_path || showDetails?.poster_path,
    tags: analysisData?.tags,
  });

  const {data: isInAnyWatchlist = false} = useIsItemInAnyWatchlist(show.id);
  const {data: watchlistContainingItem} = useWatchlistContainingItem(show.id);
  const removeFromWatchlistMutation = useRemoveFromWatchlist();
  const queryClient = useQueryClient();
  const cinema = true;
  const isFocused = useIsFocused();
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [currentServer, setCurrentServer] = useState<number | null>(1);
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [isAIChatModalOpen, setIsAIChatModalOpen] = useState(false);
  const {isOnline, checkLikelyOnline} = useConnectivity();
  const [hasCache, setHasCache] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const {isTablet, orientation} = useResponsive();
  const [showIMDBModal, setShowIMDBModal] = useState(false);
  const [showRottenTomatoesModal, setShowRottenTomatoesModal] = useState(false);
  const {width, height} = useWindowDimensions();
  const [aiRatings, setAiRatings] = useState<{
    imdb?: number | null;
    rotten_tomatoes?: number | null;
    imdb_votes?: number | null;
  } | null>(null);
  const [isLoadingAiImdb, setIsLoadingAiImdb] = useState(true);

  // Ref for FlatList to preserve scroll position
  const flatListRef = useRef<FlatList>(null);
  const loadingRatingsRef = useRef<number | null>(null);

  // Format large numbers to compact form (e.g., 1.5K, 2.3M)
  const formatCompact = (value?: number | null): string => {
    if (value == null || isNaN(Number(value))) return '0';
    const n = Number(value);
    if (n < 1000) return `${n}`;
    const units = [
      {v: 1e9, s: 'B'},
      {v: 1e6, s: 'M'},
      {v: 1e3, s: 'K'},
    ];
    for (const u of units) {
      if (n >= u.v) {
        const num = n / u.v;
        const str =
          num % 1 === 0 ? `${num.toFixed(0)}${u.s}` : `${num.toFixed(1)}${u.s}`;
        return str;
      }
    }
    return `${n}`;
  };

  // Poster share state
  const [showPosterModal, setShowPosterModal] = useState(false);
  const [posterScaleAnim] = useState(new Animated.Value(0));

  const handleShowPoster = () => {
    setShowPosterModal(true);
    Animated.spring(posterScaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  };

  const handleClosePoster = () => {
    Animated.timing(posterScaleAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setShowPosterModal(false));
  };
  const [posterLoading, setPosterLoading] = useState(false);
  const [posterUri, setPosterUri] = useState<string | null>(null);
  const [isSharingPoster, setIsSharingPoster] = useState(false);

  // Lazy loading state for reviews
  const [reviewsVisible, setReviewsVisible] = useState(false);

  // Record to history when user starts watching
  const addToHistory = useCallback(() => {
    const voteAvg =
      (showDetails && (showDetails as any).vote_average) ??
      (show as any).vote_average ??
      0;
    const firstAir =
      (showDetails && (showDetails as any).first_air_date) ??
      (show as any).first_air_date ??
      '';
    const genres =
      (showDetails && (showDetails as any).genres
        ? (showDetails as any).genres.map((g: any) => g.id)
        : (show as any).genre_ids) ?? [];

    const credits = showDetails?.credits;
    const item = {
      id: show?.id,
      title: show?.name,
      name: show?.name,
      overview: show?.overview,
      poster_path: show?.poster_path,
      backdrop_path: show?.backdrop_path,
      vote_average: voteAvg,
      release_date: undefined,
      first_air_date: firstAir,
      genre_ids: genres,
      original_language: (show as any).original_language,
      origin_country: (show as any).origin_country,
      type: 'tv' as const,
      runtime: showDetails?.episode_run_time?.[0],
      // Crew data (stringify for Realm)
      directors: credits ? JSON.stringify(getDirectors(credits)) : undefined,
      writers: credits ? JSON.stringify(getWriters(credits)) : undefined,
      cast: credits ? JSON.stringify(credits.cast.slice(0, 10)) : undefined,
      composer: credits ? JSON.stringify(getComposer(credits)) : undefined,
      cinematographer: credits
        ? JSON.stringify(getCinematographer(credits))
        : undefined,
    };
    HistoryManager.add(item as any);
  }, [show, showDetails]);

  // Watch providers and first streaming icon (prefer flatrate → free → rent → buy → ads)
  const {data: watchProviders} = useWatchProviders(show.id, 'tv');
  const hasOTT = useMemo(() => {
    if (!watchProviders) return false;
    return (
      (watchProviders.flatrate && watchProviders.flatrate.length > 0) ||
      (watchProviders.rent && watchProviders.rent.length > 0) ||
      (watchProviders.buy && watchProviders.buy.length > 0) ||
      (watchProviders.free && watchProviders.free.length > 0) ||
      (watchProviders.ads && watchProviders.ads.length > 0)
    );
  }, [watchProviders]);
  const streamingIcon = useMemo(() => {
    const p = (watchProviders || {}) as any;
    const pick =
      p?.flatrate?.[0]?.logo_path ||
      p?.free?.[0]?.logo_path ||
      p?.rent?.[0]?.logo_path ||
      p?.buy?.[0]?.logo_path ||
      p?.ads?.[0]?.logo_path ||
      null;
    return pick ? getImageUrl(pick, 'w185') : null;
  }, [watchProviders]);

  // Languages for poster metadata (only original language code)
  const posterLanguages = useMemo(() => {
    const code = (show as any)?.original_language as string | undefined;
    return code ? [code.toUpperCase()] : [];
  }, [show]);

  // Seasons/Episodes counts for TV poster
  const seasonsCount =
    showDetails?.number_of_seasons ?? showDetails?.seasons?.length ?? undefined;
  const episodesCount = showDetails?.number_of_episodes ?? undefined;

  // 1. Initialize from Realm Cache immediately
  useEffect(() => {
    if (show.id) {
      const {getTVShow} = require('../database/contentCache');
      const cached = getTVShow(show.id);
      if (cached?.ai_ratings_cached_at) {
        setAiRatings({
          imdb: cached.ai_imdb_rating,
          rotten_tomatoes: cached.ai_rotten_tomatoes,
          imdb_votes: cached.ai_imdb_votes,
        });
        setIsLoadingAiImdb(false); // Cache found, stop loading immediately
      }
    }
  }, [show.id]);

  useEffect(() => {
    addToHistory();
  }, []);

  // 2. AI Analysis updates
  useEffect(() => {
    if (!isAnalysisLoading) {
      setIsLoadingAiImdb(false); // Analysis finished (win or lose), stop loading
    }

    const ratings = analysisData?.ratings;
    if (!ratings) return;

    setAiRatings(prev => {
      const current = prev || {};
      return {
        imdb: ratings.imdb ?? current.imdb ?? null,
        rotten_tomatoes:
          ratings.rotten_tomatoes ?? current.rotten_tomatoes ?? null,
        imdb_votes: ratings.imdb_votes ?? current.imdb_votes ?? null,
      };
    });
  }, [analysisData, isAnalysisLoading]);

  // Check if AI Analysis resulted in useful data (not placeholders)
  const isAnalysisUseful = useMemo(() => {
    if (!analysisData) return false;

    // 1. Check if ratings are null (new prompt returns null for unknown)
    if (analysisData.ratings === null) {
      // If we don't even have ratings, it's likely a completely unknown project
      // But we check other fields too.
    }

    // 2. Check for "Unknown/Neutral" tags with low confidence
    const thematicTags = analysisData.tags?.thematicTags;
    if (thematicTags && thematicTags.length > 0) {
      if (
        thematicTags[0].tag === 'unknown' ||
        thematicTags[0].confidence === 0
      ) {
        return false;
      }
    }

    // 3. Check trivia for generic "not released/no information" phrases
    const trivia = analysisData.trivia;
    if (trivia && trivia.length > 0) {
      const firstFact =
        typeof trivia[0] === 'string' ? trivia[0] : trivia[0].fact;
      if (
        firstFact?.toLowerCase().includes('not been released yet') ||
        firstFact?.toLowerCase().includes('limited information available') ||
        firstFact?.toLowerCase().includes('upcoming or announced project')
      ) {
        return false;
      }
    }

    // 4. If trivia is null or empty, and tags are null or empty, it's not useful
    if (
      (!trivia || trivia.length === 0) &&
      (!analysisData.tags ||
        (analysisData.tags.thematicTags?.length === 0 &&
          analysisData.tags.emotionalTags?.length === 0))
    ) {
      return false;
    }

    return true;
  }, [analysisData]);

  const showAiSections = isAIEnabled && isAnalysisUseful;

  // Check connectivity and cache status for this specific TV show
  useFocusEffect(
    useCallback(() => {
      const checkStatus = async () => {
        try {
          // Re-check internet status on focus to avoid stale state
          await checkLikelyOnline();

          // Check if TV show is cached in Realm
          const realm = getRealm();
          const cachedShow = realm.objectForPrimaryKey('TVShow', show.id);
          setHasCache(!!cachedShow);
        } catch (error) {
          setHasCache(false);
        }
      };
      checkStatus();
    }, [show.id, checkLikelyOnline]),
  );

  const retryAiRatings = useCallback(async () => {
    queryClient.invalidateQueries({
      queryKey: ['contentAnalysis', show.id, 'tv'],
    });
  }, [show.id, queryClient]);

  const handleRetry = async () => {
    if (retrying) return;
    setRetrying(true);
    try {
      const online = await checkLikelyOnline();

      if (online) {
        // If back online, invalidate and refetch all queries for this TV show
        queryClient.invalidateQueries({
          queryKey: ['tvshow', show.id],
        });
        queryClient.invalidateQueries({
          queryKey: ['similarTVShows', show.id],
        });
        queryClient.invalidateQueries({
          queryKey: ['tvRecommendations', show.id],
        });
        queryClient.invalidateQueries({
          queryKey: ['watchProviders', show.id, 'tv'],
        });
        queryClient.invalidateQueries({
          queryKey: ['isInWatchlist', show.id],
        });

        // Force refetch TV show details
        queryClient.refetchQueries({
          queryKey: ['tvshow', show.id],
        });
      }

      // Re-check cache status after retry
      const realm = getRealm();
      const cachedShow = realm.objectForPrimaryKey('TVShow', show.id);
      setHasCache(!!cachedShow);
    } catch (error) {
    } finally {
      setRetrying(false);
    }
  };

  // Animation values for loading states and components (same as MovieDetails)
  const loadingPulseAnim = useRef(new Animated.Value(1)).current;
  const posterFadeAnim = useRef(new Animated.Value(1)).current;
  const contentFadeAnim = useRef(new Animated.Value(0)).current;
  const castFadeAnim = useRef(new Animated.Value(0)).current;
  const similarFadeAnim = useRef(new Animated.Value(0)).current;

  const {
    data: reviews,
    fetchNextPage: fetchNextReviews,
    hasNextPage: hasNextReviews,
    isFetchingNextPage: isFetchingReviews,
  } = useTVShowReviews(show.id, reviewsVisible);

  const {
    data: recommendedShows,
    fetchNextPage: fetchNextRecommended,
    hasNextPage: hasNextRecommended,
    isFetchingNextPage: isFetchingRecommended,
  } = useTVShowRecommendations(show.id);

  const [showSeasonModal, setShowSeasonModal] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<
    TVShowDetailsType['seasons'][0] | undefined
  >(undefined);

  const {data: episodes} = useSeasonDetails(
    show.id,
    selectedSeason?.season_number,
  );

  const reviewsData = useMemo(() => {
    return reviews?.pages?.flatMap(page => page.results) || [];
  }, [reviews]);

  const totalReviews = useMemo(() => {
    return reviews?.pages[0]?.total_results || 0;
  }, [reviews]);

  // Build poster inputs
  const posterItems = useMemo(() => {
    return [
      {
        id: show.id,
        type: 'tv' as const,
        title: show.name,
        name: show.name,
        poster_path: show.poster_path || showDetails?.poster_path,
        backdrop_path:
          show.backdrop_path ||
          showDetails?.backdrop_path ||
          show.poster_path ||
          showDetails?.poster_path,
        first_air_date:
          (show as any).first_air_date || (showDetails as any)?.first_air_date,
      },
    ];
  }, [show, showDetails]);

  const posterDetails = useMemo(() => {
    const runtime = undefined; // TV runtime varies by episode; omit
    return {
      runtime,
      year: (() => {
        const d =
          (show as any).first_air_date || (showDetails as any)?.first_air_date;
        try {
          return d ? new Date(d).getFullYear() : undefined;
        } catch {
          return undefined;
        }
      })(),
      rating: (showDetails as any)?.vote_average ?? (show as any)?.vote_average,
      genres: (showDetails?.genres || []).map((g: any) => g.name),
    };
  }, [show, showDetails]);

  const handleOpenPoster = useCallback(async () => {
    try {
      setPosterLoading(true);
      const uri = await requestPosterCapture(
        {
          watchlistName: show.name,
          items: posterItems as any,
          isFilter: false,
          showQR: false,
          details: posterDetails,
          streamingIcon: streamingIcon,
          languages: posterLanguages,
          seasons: seasonsCount,
          episodes: episodesCount,
        },
        'tmpfile',
      );

      if (uri) {
        // Share directly to Instagram Stories
        await ShareLib.shareSingle({
          social: Social.InstagramStories,
          appId: '1234567890', // Dummy appId for Instagram Stories
          backgroundImage: uri,
          backgroundBottomColor: '#000000',
          backgroundTopColor: '#000000',
        });
      }
    } catch (e) {
      console.warn('Instagram Stories share failed', e);
      // Fallback: Try to open Instagram app directly
      try {
        const instagramURL = 'instagram://story-camera';
        const canOpen = await Linking.canOpenURL(instagramURL);
        if (canOpen) {
          await Linking.openURL(instagramURL);
        } else {
          // If Instagram not installed, use general share
          const uri = await requestPosterCapture(
            {
              watchlistName: show.name || showDetails?.name,
              items: posterItems as any,
              isFilter: false,
              showQR: false,
              details: posterDetails,
              streamingIcon: streamingIcon,
              languages: posterLanguages,
            },
            'tmpfile',
          );
          if (uri) {
            await ShareLib.open({url: uri, type: 'image/png'});
          }
        }
      } catch (fallbackError) {
        console.warn('Fallback share failed', fallbackError);
      }
    } finally {
      setPosterLoading(false);
    }
  }, [
    show.name,
    posterItems,
    posterDetails,
    streamingIcon,
    posterLanguages,
    seasonsCount,
    episodesCount,
  ]);

  const handleSharePoster = useCallback(async () => {
    try {
      setIsSharingPoster(true);
      let uri = posterUri;
      if (!uri) {
        uri = await requestPosterCapture(
          {
            watchlistName: show.name,
            items: posterItems as any,
            isFilter: false,
            showQR: false,
            details: posterDetails,
            streamingIcon,
            languages: posterLanguages,
            seasons: seasonsCount,
            episodes: episodesCount,
          },
          'tmpfile',
        );
      }
      if (uri) {
        await ShareLib.open({url: uri, type: 'image/png'});
      }
    } catch (e) {
    } finally {
      setIsSharingPoster(false);
    }
  }, [
    posterUri,
    show.name,
    posterItems,
    posterDetails,
    streamingIcon,
    posterLanguages,
    seasonsCount,
    episodesCount,
  ]);

  // Animate loading spinner with pulse effect (same as MovieDetails)
  useEffect(() => {
    if (isLoading) {
      const pulseAnimation = Animated.sequence([
        Animated.timing(loadingPulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(loadingPulseAnim, {
          toValue: 1.1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]);
      pulseAnimation.start();
      return () => pulseAnimation.stop();
    }
  }, [isLoading]);

  // Animate poster fade-in when image loads
  useEffect(() => {
    if (!isPosterLoading) {
      Animated.timing(posterFadeAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [isPosterLoading]);

  // Animate content sections when data is available
  useEffect(() => {
    if (!isLoading && showDetails) {
      Animated.timing(contentFadeAnim, {
        toValue: 1,
        duration: 500,
        delay: 100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();

      Animated.timing(castFadeAnim, {
        toValue: 1,
        duration: 500,
        delay: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();

      Animated.timing(similarFadeAnim, {
        toValue: 1,
        duration: 500,
        delay: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [isLoading, showDetails]);

  const handleWatchlistPress = useCallback(async () => {
    if (isInAnyWatchlist && watchlistContainingItem) {
      // If item is already in a watchlist, remove it
      try {
        await removeFromWatchlistMutation.mutateAsync({
          watchlistId: watchlistContainingItem,
          itemId: show.id,
        });
      } catch (error) {
        Alert.alert('Error', 'Failed to remove from watchlist');
      }
    } else {
      // If item is not in any watchlist, show modal to add it
      setShowWatchlistModal(true);
    }
  }, [
    isInAnyWatchlist,
    watchlistContainingItem,
    removeFromWatchlistMutation,
    show.id,
  ]);

  useEffect(() => {
    if (
      showDetails?.seasons &&
      showDetails.seasons.length > 0 &&
      !selectedSeason
    ) {
      // Find the first non-empty season (skip specials if empty)
      const firstValidSeason = showDetails.seasons.find(
        (season: TVShowDetailsType['seasons'][0]) =>
          season.season_number > 0 ||
          (season.season_number === 0 && season.episode_count > 0),
      );
      if (firstValidSeason) {
        setSelectedSeason(firstValidSeason);
      }
    }
  }, [showDetails, selectedSeason]);

  // AI Similar TV shows resolution (re-enabled with Groq's better rate limits)
  const {data: resolvedAiSimilarShows, isLoading: isLoadingAiSimilar} =
    useAISimilarTVShows(
      show.id,
      show.name,
      show.overview,
      showDetails?.genres,
      analysisData?.similar,
    );

  // Determine if we should show AI similar content
  const hasAISimilarData =
    !isLoadingAiSimilar &&
    resolvedAiSimilarShows &&
    resolvedAiSimilarShows.length > 0;

  // CRITICAL: Never call TMDB similar API if AI is enabled and analysis is useful
  // Don't wait for AI to load - disable it from the start
  const shouldCallTMDBSimilar = !isAIEnabled || !isAnalysisUseful;

  // Only fetch TMDB similar TV shows when AI is completely disabled
  const {
    data: similarShows,
    fetchNextPage: fetchNextSimilar,
    hasNextPage: hasNextSimilar,
    isFetchingNextPage: isFetchingSimilar,
  } = useSimilarTVShows(show.id, shouldCallTMDBSimilar);

  // Process similar shows data
  const similarShowsData = useMemo(() => {
    return (
      similarShows?.pages?.flatMap(page =>
        page.results.map((show: TVShow) => ({
          ...show,
          type: 'tv' as const,
        })),
      ) || []
    );
  }, [similarShows]);

  const trailer = showDetails?.videos?.results?.find(
    (video: Video) => video.type === 'Trailer' && video.site === 'YouTube',
  );

  const handleItemPress = useCallback(
    (item: ContentItem) => {
      if (item.type === 'movie') {
        (navigation as any).push('MovieDetails', {movie: item as Movie});
      } else {
        (navigation as any).push('TVShowDetails', {show: item as TVShow});
      }
    },
    [navigation],
  );

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Always ensure AI chat modal is closed when TV show changes
  useEffect(() => {
    setIsAIChatModalOpen(false);
  }, [show.id]);

  const handlePersonPress = useCallback(
    (personId: number, personName: string) => {
      navigateWithLimit('PersonCredits', {
        personId,
        personName,
        contentType: 'tv',
      });
    },
    [navigateWithLimit],
  );

  const renderEpisodeItem = ({item: episode}: {item: Episode}) => (
    <TouchableOpacity
      key={episode.episode_number}
      style={styles.episodeCard}
      activeOpacity={0.9}
      onPress={() => setEpisode(episode.episode_number)}>
      <Image
        source={{
          uri: episode.still_path
            ? getImageUrl(episode.still_path, 'w500')
            : 'https://via.placeholder.com/200x112',
        }}
        style={styles.episodeImage}
      />
      <View style={styles.episodeContent}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}>
          <Text style={[styles.episodeTitle, {flex: 1}]} numberOfLines={1}>
            {episode.name}
          </Text>
          {/* Action Buttons */}
          <View style={{marginLeft: 8}}>
            <EpisodeActionButtons
              showId={show.id}
              showTitle={show.name}
              seasonNumber={episode.season_number}
              episodeNumber={episode.episode_number}
              episodeTitle={episode.name}
              posterPath={show.poster_path}
              backdropPath={show.backdrop_path}
              totalSeasons={showDetails?.number_of_seasons}
              seasonData={showDetails?.seasons}
            />
          </View>
        </View>

        <View style={styles.episodeInfo}>
          {episode?.episode_number != null && (
            <Text style={styles.info}>
              S{episode.season_number} E{episode.episode_number}
            </Text>
          )}
          <Text style={styles.infoDot}>•</Text>
          <Text style={styles.info}>
            {new Date(episode.air_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
          {episode?.runtime != null && episode.runtime > 0 && (
            <>
              <Text style={styles.infoDot}>•</Text>
              <Text style={styles.info}>{episode.runtime} min</Text>
            </>
          )}
          {episode?.vote_average != null && episode.vote_average > 0 && (
            <>
              <Text style={styles.infoDot}>•</Text>
              <View
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.xs,
                }}>
                <Ionicons name="star" size={12} color="#ffffff70" />
                <Text style={styles.info}>
                  {episode.vote_average.toFixed(1)}
                </Text>
              </View>
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.primary,
    },
    loadingContainer: {
      flex: 1,
      backgroundColor: colors.background.primary,
    },
    trailerContainer: {
      // backgroundColor: '#000',
      zIndex: 10,
      flex: 1,
    },
    gradientShade: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: isTablet ? 900 : 500,
    },
    main: {
      position: 'relative',
      width: width - 32,
      height:
        isTablet && orientation === 'portrait'
          ? height * 0.33
          : isTablet && orientation === 'landscape'
          ? height * 0.7
          : height * 0.25,
      margin: 16,
      borderRadius: isTablet ? 40 : 20,
      alignSelf: 'center',
      borderCurve: 'continuous',
      overflow: 'hidden',
      elevation: 20,
      shadowColor: '#000',
      shadowOffset: {width: 5, height: 20},
      shadowOpacity: 0.25,
      shadowRadius: 10,
      backgroundColor: colors.background.primary,
    },
    backdrop: {
      width: '100%',
      height: '100%',
      backgroundColor: colors.background.primary,
    },
    headerControls: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingTop: spacing.xl,
      paddingBottom: spacing.lg,
      zIndex: 300,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    aiChatButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.lg,
    },
    aiChatButtonText: {
      color: colors.text.primary,
      fontSize: typography.body1.fontSize,
      fontWeight: '600',
      marginLeft: spacing.xs,
    },
    content: {
      padding: 16,
      flexDirection: 'column',
      gap: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: 24,
      fontWeight: '400',
      color: '#fff',
      textAlign: 'center',
      width: '100%',
      fontFamily: 'Inter_18pt-Regular',
    },
    tagline: {
      ...typography.body2,
      color: colors.text.muted,
      fontStyle: 'italic',
      textAlign: 'center',
      paddingHorizontal: spacing.md,
    },
    infoContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      alignItems: 'center',
      justifyContent: 'center',
    },
    infoWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    info: {
      ...typography.body2,
      color: 'rgba(255, 255, 255, 0.68)',
    },
    infoDot: {
      ...typography.h3,
      color: colors.modal.active,
      marginHorizontal: spacing.xs,
    },
    buttonRow: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      width: '100%',
      marginTop: -spacing.sm,
      paddingHorizontal: spacing.sm,
    },
    buttonContainerColumn: {
      flexDirection: 'column',
      alignItems: 'center',
      gap: 12,
      width: '100%',
      marginTop: -spacing.sm,
      paddingHorizontal: spacing.sm,
    },
    buttonRowTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    buttonRowBottom: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    watchButton: {
      flex: 1,
      borderRadius: borderRadius.round,
      paddingHorizontal: spacing.md,
      paddingVertical: 14,
    },
    watchButtonText: {
      fontWeight: '700',
      fontSize: 14,
      fontFamily: 'Inter_18pt-Regular',
    },
    addButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.modal.blur,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: colors.modal.header,
    },
    genreContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      alignItems: 'center',
      justifyContent: 'center',
    },
    genreWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    genre: {
      ...typography.body2,
      color: colors.text.primary,
      marginRight: spacing.xs,
    },
    genreDivider: {
      ...typography.body2,
      color: colors.text.primary,
      marginHorizontal: spacing.xs,
    },
    overview: {
      color: colors.text.muted,
      fontSize: 14,
      lineHeight: 20,
      fontFamily: 'Inter_18pt-Regular',
    },
    sectionTitle: {
      ...typography.h3,
      color: colors.text.primary,
      marginBottom: 16,
      marginLeft: 16,
    },
    castItem: {
      marginRight: 16,
      width: 100,
    },
    castImage: {
      width: 100,
      height: 150,
      borderRadius: 8,
      marginBottom: 8,
      backgroundColor: '#2a2a2a',
    },
    castName: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '500',
      textAlign: 'center',
      fontFamily: 'Inter_18pt-Regular',
    },
    character: {
      color: '#888',
      fontSize: 12,
      textAlign: 'center',
      fontFamily: 'Inter_18pt-Regular',
    },
    scrollView: {
      flex: 1,
    },
    seasonsSection: {
      marginVertical: spacing.md,
      marginBottom: spacing.xl,
    },
    seasonDropdown: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.card.background,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.card.border,
      marginTop: 8,
      marginHorizontal: 16,
    },
    seasonDropdownText: {
      color: colors.text.primary,
      fontSize: 16,
      fontWeight: '500',
      fontFamily: 'Inter_18pt-Regular',
    },
    episodesContainer: {
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    episodesScroll: {
      paddingHorizontal: 16,
    },
    episodeCard: {
      width: 280,
      marginRight: 12,
      borderRadius: 8,
      overflow: 'hidden',
    },
    episodeImage: {
      width: '100%',
      height: 157,
      backgroundColor: colors.background.secondary,
      borderRadius: 20,
    },
    episodeContent: {
      padding: 12,
      alignItems: 'center',
    },
    episodeInfo: {
      flexDirection: 'row',
      gap: spacing.xs,
      alignItems: 'center',
    },
    episodeTitle: {
      color: colors.text.primary,
      fontSize: 14,
      fontWeight: '500',
      marginTop: 8,
      marginBottom: 4,
      fontFamily: 'Inter_18pt-Regular',
    },
    blurView: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      borderTopLeftRadius: borderRadius.xl,
      borderTopRightRadius: borderRadius.xl,
      maxHeight: '80%',
      overflow: 'hidden',
      flex: 1,
      marginTop: 100,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.background.secondary,
    },
    modalTitle: {
      color: colors.text.primary,
      fontSize: 18,
      fontWeight: '600',
      fontFamily: 'Inter_18pt-Regular',
    },
    seasonsList: {
      padding: 16,
    },
    seasonItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      backgroundColor: colors.modal.blur,
      borderRadius: borderRadius.lg,
      marginBottom: 8,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: colors.modal.border,
      borderBottomWidth: 0,
    },
    seasonItemPoster: {
      width: 60,
      height: 90,
      borderRadius: 4,
      marginRight: 12,
    },
    seasonItemInfo: {
      flex: 1,
    },
    seasonItemName: {
      color: colors.text.primary,
      fontSize: 14,
      fontWeight: '500',
      marginBottom: 4,
      fontFamily: 'Inter_18pt-Regular',
    },
    seasonItemEpisodes: {
      color: colors.text.primary,
      fontSize: 12,
    },
    noEpisodesContainer: {
      padding: spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    noEpisodesText: {
      color: colors.text.tertiary,
      ...typography.body1,
      textAlign: 'center',
      marginTop: spacing.sm,
    },
    aiButtonWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: borderRadius.round,
    },
    aiButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: 'rgba(34, 0, 54, 0.94)',
      borderWidth: 1,
      borderColor: 'rgba(43, 42, 42, 0.7)',
      padding: 8,
      paddingHorizontal: 12,
      borderRadius: borderRadius.round,
    },
    aiButtonText: {
      color: colors.text.primary,
      fontSize: 10,
      fontWeight: '500',
      fontFamily: 'Inter_18pt-Regular',
    },
    posterModalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    posterModalContent: {
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    posterModalBlur: {
      ...StyleSheet.absoluteFillObject,
    },
  });

  // When not focused (another screen is on top), hide content but keep mounted to preserve scroll position
  // Removed the early return that was unmounting the FlatList

  // Show NoInternet if offline and no cache for TV show details
  // Only show if we have an actual error and are offline with no cache
  if (!isOnline && !hasCache && showDetailsError && !isLoading) {
    return <NoInternet onRetry={handleRetry} isRetrying={retrying} />;
  }

  if (isLoading || !showDetails) {
    return (
      <View style={styles.loadingContainer}>
        <DetailScreenSkeleton />
      </View>
    );
  }

  // const recommendedShowsData =
  //   recommendedShows?.pages.flatMap(page =>
  //     page.results.map((show: TVShow) => ({...show, type: 'tv' as const})),
  //   ) || [];

  const getSeasonTitle = (season: TVShowDetailsType['seasons'][0]) => {
    if (season.season_number === 0) {
      return 'Specials';
    }
    return `Season ${season.season_number}`;
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(142, 4, 255, 0.46)', 'rgba(255, 4, 125, 0.65)']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 0}}
        style={{
          position: 'absolute',
          bottom: isTablet ? 60 : 100,
          right: 36,
          width: 60,
          height: 60,
          zIndex: 5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: borderRadius.round,
          overflow: 'hidden',
        }}>
        <TouchableOpacity
          onPress={() => setIsAIChatModalOpen(true)}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: borderRadius.round,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(15, 0, 24, 1)',
            borderWidth: 2,
            borderColor: 'rgba(99, 66, 108, 0.3)',
          }}
          activeOpacity={0.7}>
          <Icon name="sparkles" size={18} color="white" />
        </TouchableOpacity>
      </LinearGradient>
      {/* Poster Preview Modal */}
      <Modal
        visible={showPosterModal}
        statusBarTranslucent
        transparent={true}
        animationType="none"
        onRequestClose={handleClosePoster}>
        <TouchableOpacity
          style={styles.posterModalContainer}
          activeOpacity={1}
          onPress={handleClosePoster}>
          <Animated.View
            style={[
              styles.posterModalBlur,
              {
                opacity: posterScaleAnim,
              },
            ]}>
            {!isSolid && (
              <BlurView
                blurType="dark"
                blurAmount={15}
                style={StyleSheet.absoluteFill}
              />
            )}
            <View
              style={[
                StyleSheet.absoluteFill,
                {backgroundColor: isSolid ? 'black' : 'rgba(0,0,0,0.4)'},
              ]}
            />
          </Animated.View>

          <Animated.View
            style={[
              styles.posterModalContent,
              {
                opacity: posterScaleAnim,
                transform: [
                  {
                    scale: posterScaleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.9, 1],
                    }),
                  },
                ],
              },
            ]}>
            <View
              style={{
                width: '92%',
                borderRadius: borderRadius.lg,
                overflow: 'hidden',
                alignItems: 'center',
                padding: spacing.md,
              }}>
              {posterUri && (
                <>
                  <Image
                    source={{uri: posterUri}}
                    style={{
                      width: 270,
                      height: 480,
                      borderRadius: borderRadius.md,
                      backgroundColor: '#000',
                    }}
                    resizeMode="cover"
                  />
                  <View
                    style={{
                      marginTop: spacing.md,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.lg,
                    }}>
                    <TouchableOpacity
                      onPress={handleSharePoster}
                      style={{alignItems: 'center'}}>
                      <Ionicons
                        name="share-social-outline"
                        size={22}
                        color={colors.text.primary}
                      />
                      <Text
                        style={{
                          color: colors.text.secondary,
                          marginTop: 4,
                          fontFamily: 'Inter_18pt-Regular',
                        }}>
                        Share
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleClosePoster}
                      style={{alignItems: 'center'}}>
                      <Ionicons
                        name="close-circle-outline"
                        size={22}
                        color={colors.text.primary}
                      />
                      <Text
                        style={{
                          color: colors.text.secondary,
                          marginTop: 4,
                          fontFamily: 'Inter_18pt-Regular',
                        }}>
                        Close
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
      <FlatList
        ref={flatListRef}
        data={[
          {type: 'header', id: 'header'},
          {type: 'content', id: 'content'},
          {type: 'tvMetaInfo', id: 'tvMetaInfo'},
          {type: 'castCrew', id: 'castCrew'},
          {type: 'mediaTabs', id: 'mediaTabs'},
          {type: 'providers', id: 'providers'},
          {type: 'seasons', id: 'seasons'},
          ...(isAIEnabled
            ? [
                {type: 'trivia', id: 'trivia'},
                {type: 'tags', id: 'tags'},
                {type: 'aiSimilar', id: 'aiSimilar'},
              ]
            : []),
          {type: 'similar', id: 'similar'},
          {type: 'productionInfo', id: 'productionInfo'},
          {type: 'reviews', id: 'reviews'},
          {type: 'recommendations', id: 'recommendations'},
        ]}
        renderItem={({item}: {item: any}) => {
          switch (item.type) {
            case 'header':
              return (
                <View>
                  <View style={styles.main}>
                    <ImageBackground
                      source={require('../assets/curve.webp')}
                      style={{
                        width: width,
                        alignSelf: 'center',
                        height: width * 0.02,
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        zIndex: 200,
                      }}
                      resizeMode="contain"></ImageBackground>

                    <ImageBackground
                      source={require('../assets/curve.webp')}
                      style={{
                        width: width,
                        alignSelf: 'center',
                        height: width * 0.02,
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        zIndex: 200,
                        transform: [{rotateX: '180deg'}],
                      }}
                      resizeMode="contain"></ImageBackground>

                    <ScheduleWatchModal
                      visible={isScheduleModalVisible}
                      onClose={() => setScheduleModalVisible(false)}
                      title={show.name}
                      onSchedule={handleScheduleWatch}
                      releaseDate={
                        isFuture && nextEpisode?.air_date
                          ? new Date(nextEpisode.air_date)
                          : null
                      }
                      existingDate={scheduledWatchDate}
                      onRemove={async () => {
                        try {
                          const stored = await AsyncStorage.getItem(
                            'calendar_items',
                          );
                          if (stored) {
                            const items = JSON.parse(stored);
                            const idx = items.findIndex(
                              (i: any) =>
                                i.id === show.id &&
                                i.type === 'tv' &&
                                i.schedulerType === 'custom',
                            );
                            if (idx > -1) {
                              const item = items[idx];
                              if (item.notificationId) {
                                await notificationService.cancelScheduledNotification(
                                  item.notificationId,
                                );
                              }
                              items.splice(idx, 1);
                              await AsyncStorage.setItem(
                                'calendar_items',
                                JSON.stringify(items),
                              );
                              setScheduledWatchDate(null);
                              setFeedback({
                                visible: true,
                                type: 'success',
                                title: 'Removed',
                                message: 'Schedule has been removed.',
                              });
                            }
                          }
                        } catch (e) {}
                      }}
                    />

                    <FeedbackModal
                      visible={feedback.visible}
                      type={feedback.type}
                      title={feedback.title}
                      message={feedback.message}
                      onClose={() => setFeedback({...feedback, visible: false})}
                    />

                    {isPosterLoading && !isPlaying && <BannerSkeleton />}
                    {!isPlaying ? (
                      <Animated.View style={{opacity: posterFadeAnim}}>
                        <Image
                          source={{
                            uri: getImageUrl(
                              (show as any).backdrop_path ||
                                (showDetails as any)?.backdrop_path ||
                                (show as any).poster_path ||
                                (showDetails as any)?.poster_path ||
                                '',
                              'w780',
                            ),
                          }}
                          style={styles.backdrop}
                          onLoadEnd={() => setIsPosterLoading(false)}
                          onError={() => setIsPosterLoading(false)}
                          resizeMode="cover"
                        />
                      </Animated.View>
                    ) : (
                      <View style={styles.trailerContainer}>
                        <YoutubePlayer
                          width={'100%'}
                          height={'100%'}
                          play={isPlaying}
                          videoId={trailer?.key}
                          webViewProps={{
                            allowsInlineMediaPlayback: true,
                            allowsPictureInPicture: true,
                            allowsFullscreenVideo: true,
                            allowsPictureInPictureMediaPlayback: true,
                          }}
                          key={trailer?.key}
                          onChangeState={(state: string) => {
                            if (state === 'ended') setIsPlaying(false);
                          }}
                        />
                      </View>
                    )}
                  </View>
                </View>
              );
            case 'content':
              return (
                <Animated.View
                  style={[
                    styles.content,
                    {
                      opacity: contentFadeAnim,
                      transform: [
                        {
                          translateY: contentFadeAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [15, 0],
                          }),
                        },
                      ],
                    },
                  ]}>
                  <View
                    style={{
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '80%',
                    }}>
                    <Text style={styles.title}>
                      {showDetails?.name || show.name}
                    </Text>
                    {showDetails?.tagline && (
                      <Text style={styles.tagline}>
                        "{showDetails.tagline}"
                      </Text>
                    )}
                  </View>
                  <View style={styles.infoContainer}>
                    {showDetails?.first_air_date && (
                      <Text style={styles.info}>
                        {new Date(showDetails.first_air_date).getFullYear()}
                      </Text>
                    )}
                    {showDetails?.first_air_date &&
                      showDetails?.number_of_seasons != null && (
                        <Text style={styles.infoDot}>•</Text>
                      )}
                    {showDetails?.number_of_seasons != null && (
                      <Text style={styles.info}>
                        {showDetails.number_of_seasons} Season
                        {showDetails.number_of_seasons !== 1 ? 's' : ''}
                      </Text>
                    )}
                    {showDetails?.number_of_episodes != null && (
                      <>
                        <Text style={styles.infoDot}>•</Text>
                        <Text style={styles.info}>
                          {showDetails.number_of_episodes} Episodes
                        </Text>
                      </>
                    )}
                    {showDetails?.original_language && (
                      <>
                        <Text style={styles.infoDot}>•</Text>
                        <Text style={styles.info}>
                          {getLanguage(showDetails?.original_language)}
                        </Text>
                      </>
                    )}
                  </View>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginBottom: spacing.md,
                    }}>
                    <Image
                      source={require('../assets/tmdb_icon.png')}
                      style={{
                        width: 50,
                        height: 20,
                        resizeMode: 'contain',
                      }}
                    />

                    <Text
                      style={{
                        ...typography.body1,
                        color: colors.text.primary,
                        fontWeight: 'bold',
                        marginLeft: spacing.sm,
                      }}>
                      {showDetails?.vote_average.toFixed(1)}
                    </Text>
                    <Text
                      style={{
                        ...typography.body1,
                        color: colors.text.muted,
                        marginLeft: spacing.xs,
                      }}>
                      ({formatCompact(showDetails?.vote_count)})
                    </Text>
                  </View>
                  <View style={styles.buttonContainerColumn}>
                    <View style={styles.buttonRowTop}>
                      <GradientButton
                        title="Watch Trailer"
                        isIcon={true}
                        onPress={() => {
                          // setIsPlaying(true);
                          navigation.navigate('CinemaScreen', {
                            id: show.id.toString(),
                            type: 'tv',
                            title: show.name,
                            season,
                            episode,
                          });
                        }}
                        style={{
                          ...styles.watchButton,
                          opacity: isPlaying ? 0.3 : 1,
                        }}
                        textStyle={styles.watchButtonText}
                      />
                      <WatchProvidersButton
                        providers={watchProviders}
                        contentId={show.id}
                        title={show.name}
                        type="tv"
                        posterPath={show.poster_path}
                        seasonData={showDetails?.seasons}
                      />
                    </View>
                    <View style={styles.buttonRowBottom}>
                      {isFuture && (
                        <TouchableOpacity
                          style={{
                            paddingHorizontal: spacing.md,
                            paddingVertical: 12,
                            borderRadius: borderRadius.round,
                            backgroundColor: colors.modal.blur,
                            borderColor: colors.modal.content,
                            borderWidth: 1,
                            borderBottomWidth: 0,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                          }}
                          onPress={handleToggleCalendar}
                          activeOpacity={0.7}>
                          <Ionicons
                            name={
                              isInCalendar
                                ? 'notifications'
                                : 'notifications-outline'
                            }
                            size={18}
                            color={isInCalendar ? colors.accent : '#fff'}
                          />
                          <View>
                            <Text
                              style={{
                                ...typography.body1,
                                color: colors.text.secondary,
                                fontSize: 9,
                              }}>
                              {isInCalendar ? 'Airing On' : 'Remind Me'}
                            </Text>
                            <Text
                              style={{
                                ...typography.body1,
                                color: colors.text.primary,
                                fontSize: 11,
                              }}>
                              {(() => {
                                const dateStr = nextEpisode?.air_date;
                                if (!dateStr) return '';
                                return new Date(dateStr).toLocaleDateString(
                                  undefined,
                                  {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  },
                                );
                              })()}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.addButton}
                        onPress={handleWatchlistPress}
                        disabled={removeFromWatchlistMutation.isPending}>
                        <Ionicons
                          name={isInAnyWatchlist ? 'checkmark' : 'add'}
                          size={18}
                          color={
                            isInAnyWatchlist ? colors.text.primary : '#fff'
                          }
                        />
                      </TouchableOpacity>
                      <DiaryButton
                        contentId={show.id}
                        type="tv"
                        title={show.name}
                        posterPath={show.poster_path}
                        backdropPath={show.backdrop_path}
                        totalSeasons={showDetails?.number_of_seasons}
                        seasonData={showDetails?.seasons}
                        style={styles.addButton}
                        showLabel={false}
                      />
                      <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => {
                          setScheduleModalVisible(true);
                        }}
                        activeOpacity={0.7}>
                        {scheduledWatchDate ? (
                          <CalendarBold size={18} color={colors.text.primary} />
                        ) : (
                          <CalendarLinear
                            size={18}
                            color={colors.text.primary}
                          />
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.addButton}
                        onPress={handleOpenPoster}
                        disabled={isSharingPoster}
                        activeOpacity={0.9}>
                        {isSharingPoster ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Ionicons
                            name="logo-instagram"
                            size={20}
                            color="#fff"
                          />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.genreContainer}>
                    {showDetails?.genres &&
                      Array.isArray(showDetails.genres) &&
                      showDetails.genres
                        .slice(0, 3)
                        .map((genre: Genre, index: number) => (
                          <View key={index} style={styles.genreWrapper}>
                            <Text style={styles.genre}>{genre?.name}</Text>
                            {index <
                              Math.min(showDetails.genres.length - 1, 2) && (
                              <Text style={styles.genreDivider}>|</Text>
                            )}
                          </View>
                        ))}
                  </View>

                  {isLoadingAiImdb ? (
                    <View
                      style={{
                        width: 100,
                        height: 30,
                        borderRadius: 10,
                        position: 'relative',
                        paddingHorizontal: spacing.sm,
                      }}>
                      <Image
                        source={require('../assets/imdb.webp')}
                        style={{
                          width: 50,
                          height: 30,
                          resizeMode: 'contain',
                          opacity: 0.5,
                        }}
                      />
                      <View
                        style={{
                          position: 'absolute',
                          width: 70,
                          height: 30,
                          overflow: 'hidden',
                          borderRadius: 10,
                          top: 0,
                          left: -10,
                          opacity: 0.5,
                        }}>
                        <IMDBSkeleton />
                      </View>
                    </View>
                  ) : (
                    <View
                      style={{
                        marginTop: spacing.xs,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: spacing.md,
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                      }}>
                      {/* Always show IMDB logo */}
                      <TouchableOpacity
                        onPress={() => setShowIMDBModal(true)}
                        activeOpacity={0.7}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: colors.modal.blur,
                          paddingHorizontal: spacing.sm,
                          height: 40,
                          borderRadius: borderRadius.md,
                          borderWidth: 1,
                          borderBottomWidth: 0,
                          borderColor: colors.modal.content,
                        }}>
                        <Image
                          source={require('../assets/imdb.webp')}
                          style={{
                            width: 50,
                            height: 20,
                            resizeMode: 'contain',
                            opacity: 0.6,
                          }}
                        />
                        {isAnalysisLoading && !aiRatings?.imdb ? (
                          <View style={{marginLeft: spacing.xs}}>
                            <GradientSpinner
                              color={colors.modal.activeBorder}
                              size={10}
                            />
                          </View>
                        ) : (
                          !!aiRatings?.imdb && (
                            <>
                              <Text
                                style={{
                                  ...typography.body1,
                                  color: colors.text.primary,
                                  fontWeight: 'bold',
                                  marginLeft: spacing.sm,
                                }}>
                                {aiRatings.imdb.toFixed(1)}
                              </Text>
                              {!!aiRatings.imdb_votes && (
                                <Text
                                  style={{
                                    ...typography.body1,
                                    color: colors.text.muted,
                                    marginLeft: spacing.xs,
                                  }}>
                                  ({formatCompact(aiRatings.imdb_votes)})
                                </Text>
                              )}
                            </>
                          )
                        )}
                      </TouchableOpacity>
                      {/* Always show RT logo */}
                      <TouchableOpacity
                        onPress={() => setShowRottenTomatoesModal(true)}
                        activeOpacity={0.7}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: spacing.sm,
                          backgroundColor: colors.modal.blur,
                          paddingHorizontal: spacing.sm,
                          height: 40,
                          borderRadius: borderRadius.md,
                          borderWidth: 1,
                          borderBottomWidth: 0,
                          borderColor: colors.modal.content,
                        }}>
                        <Image
                          source={require('../assets/tomato.png')}
                          style={{
                            width: 20,
                            height: 20,
                            resizeMode: 'contain',
                            opacity: 0.8,
                            marginVertical: 2,
                          }}
                        />
                        {isAnalysisLoading && !aiRatings?.rotten_tomatoes ? (
                          <View style={{marginLeft: spacing.xs}}>
                            <GradientSpinner
                              color={colors.modal.activeBorder}
                              size={10}
                            />
                          </View>
                        ) : (
                          !!aiRatings?.rotten_tomatoes && (
                            <Text
                              style={{
                                ...typography.body1,
                                color: colors.text.primary,
                                fontWeight: '600',
                              }}>
                              {aiRatings?.rotten_tomatoes}%
                            </Text>
                          )
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                  {/* <LinearGradient
                    colors={[colors.primary, colors.secondary]}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 0}}
                    style={styles.aiButtonWrapper}>
                    <TouchableOpacity
                      onPress={() => setIsAIChatModalOpen(true)}
                      style={styles.aiButton}
                      activeOpacity={0.7}>
                      <Image
                        source={require('../assets/theaterai.webp')}
                        style={{width: 18, height: 10}}
                      />
                      <Text style={styles.aiButtonText}>Ask Theater AI</Text>
                    </TouchableOpacity>
                  </LinearGradient> */}
                  <Text style={styles.overview}>{showDetails?.overview}</Text>
                </Animated.View>
              );
            case 'tvMetaInfo':
              return (
                <TVShowMetaInfo
                  creators={showDetails?.created_by}
                  networks={showDetails?.networks}
                  onCreatorPress={handlePersonPress}
                />
              );
            case 'mediaTabs':
              return (
                <MediaTabs
                  images={showDetails?.images}
                  videos={showDetails?.videos}
                />
              );
            case 'trivia':
              if (isAnalysisLoading) {
                return (
                  <View
                    style={{
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: spacing.xl,
                      paddingVertical: 100,
                      gap: spacing.sm,
                    }}>
                    <GradientSpinner size={20} />
                    <Text
                      style={{...typography.body2, color: colors.text.muted}}>
                      Theater AI is curating...
                    </Text>
                  </View>
                );
              } else {
                return (
                  <View style={{paddingHorizontal: spacing.md}}>
                    <MovieTrivia
                      title={show.name}
                      year={
                        (show as any).first_air_date ||
                        (showDetails as any)?.first_air_date
                          ? new Date(
                              (show as any).first_air_date ||
                                (showDetails as any)?.first_air_date,
                            )
                              .getFullYear()
                              .toString()
                          : undefined
                      }
                      type="tv"
                      contentId={show.id}
                      trivia={analysisData?.trivia}
                      loading={isAnalysisLoading}
                    />
                  </View>
                );
              }
            case 'castCrew':
              // Deduplicate crew by person ID and combine roles
              const crewMap = new Map();
              showDetails?.credits?.crew?.forEach((person: any) => {
                if (crewMap.has(person.id)) {
                  // Add role to existing person
                  const existing = crewMap.get(person.id);
                  existing.job = `${existing.job}, ${person.job}`;
                } else {
                  crewMap.set(person.id, {...person});
                }
              });
              const crew = Array.from(crewMap.values());

              return (
                <Animated.View
                  style={{
                    marginVertical: spacing.lg,
                    marginTop: 0,
                    opacity: castFadeAnim,
                    transform: [
                      {
                        translateY: castFadeAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [20, 0],
                        }),
                      },
                    ],
                  }}>
                  <CastCrewTabbedSection
                    cast={showDetails?.credits?.cast || []}
                    crew={crew}
                    onPersonPress={handlePersonPress}
                  />
                </Animated.View>
              );
            case 'providers':
              return watchProviders ? (
                <WatchProviders
                  providers={watchProviders}
                  contentId={show.id.toString()}
                  title={show.name}
                  type="tv"
                  posterPath={show.poster_path}
                />
              ) : null;
            case 'seasons':
              return showDetails?.seasons &&
                Array.isArray(showDetails.seasons) &&
                showDetails.seasons.length > 0 ? (
                <View style={styles.seasonsSection}>
                  <Text style={styles.sectionTitle}>Seasons</Text>
                  <TouchableOpacity
                    style={styles.seasonDropdown}
                    onPress={() => setShowSeasonModal(true)}>
                    <Text style={styles.seasonDropdownText}>
                      {selectedSeason
                        ? getSeasonTitle(selectedSeason)
                        : 'Select Season'}
                    </Text>
                    <Ionicons
                      name="chevron-down"
                      size={20}
                      color={colors.text.primary}
                    />
                  </TouchableOpacity>

                  {selectedSeason &&
                  episodes &&
                  episodes.episodes &&
                  Array.isArray(episodes.episodes) &&
                  episodes.episodes.length > 0 ? (
                    <FlatList
                      data={episodes.episodes}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.episodesContainer}
                      keyExtractor={(ep: Episode) => ep.id.toString()}
                      renderItem={renderEpisodeItem}
                    />
                  ) : (
                    <View style={styles.noEpisodesContainer}>
                      <View
                        style={[
                          styles.noEpisodesContainer,
                          {marginVertical: 50},
                        ]}>
                        <GradientSpinner
                          size={30}
                          style={{
                            alignItems: 'center',
                            alignSelf: 'center',
                          }}
                          color={colors.text.primary}
                        />
                      </View>
                    </View>
                  )}

                  <Modal
                    visible={showSeasonModal}
                    backdropColor={colors.modal.blurDark}
                    animationType="slide"
                    statusBarTranslucent={true}
                    onRequestClose={() => setShowSeasonModal(false)}>
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
                    <View
                      style={{
                        flex: 1,
                        margin: isTablet ? spacing.xl : spacing.md,
                        borderRadius: borderRadius.xl,
                        backgroundColor: 'transparent',
                        alignItems: 'stretch',
                        justifyContent: 'flex-end',
                      }}>
                      <MaybeBlurView
                        header
                        style={[
                          {
                            marginTop: '30%',
                          },
                        ]}>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: spacing.sm,
                          }}>
                          <Ionicons
                            name="tv"
                            size={20}
                            color={colors.text.muted}
                          />
                          <Text style={styles.modalTitle}>Select Season</Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => setShowSeasonModal(false)}
                          style={{
                            padding: spacing.sm,
                            backgroundColor: colors.modal.blur,
                            borderRadius: borderRadius.round,
                            borderTopWidth: 1,
                            borderLeftWidth: 1,
                            borderRightWidth: 1,
                            borderColor: colors.modal.content,
                          }}>
                          <Ionicons
                            name="close"
                            size={20}
                            color={colors.text.primary}
                          />
                        </TouchableOpacity>
                      </MaybeBlurView>
                      <View
                        style={{
                          // flex: 1,
                          overflow: 'hidden',
                          borderRadius: borderRadius.xl,
                          maxHeight: height - (isTablet ? 200 : 130),
                        }}>
                        <MaybeBlurView body>
                          <ScrollView
                            style={styles.seasonsList}
                            contentContainerStyle={{
                              paddingBottom: spacing.lg,
                            }}
                            showsVerticalScrollIndicator={false}>
                            {showDetails?.seasons &&
                              Array.isArray(showDetails.seasons) &&
                              showDetails.seasons.map(
                                (s: TVShowDetailsType['seasons'][0]) => (
                                  <TouchableOpacity
                                    key={s.season_number}
                                    activeOpacity={0.9}
                                    style={[
                                      styles.seasonItem,
                                      selectedSeason?.id === s.id && {
                                        backgroundColor: colors.modal.active,
                                        borderWidth: 1,
                                        borderColor: colors.modal.activeBorder,
                                      },
                                    ]}
                                    onPress={() => {
                                      setSelectedSeason(s);
                                      setSeason(s.season_number);
                                      setShowSeasonModal(false);
                                    }}>
                                    <Image
                                      source={{
                                        uri: s?.poster_path
                                          ? getImageUrl(s?.poster_path, 'w185')
                                          : 'https://via.placeholder.com/100x150',
                                      }}
                                      style={styles.seasonItemPoster}
                                    />

                                    <Text
                                      style={{
                                        position: 'absolute',
                                        left: -10,
                                        fontSize: 40,
                                        color: colors.text.primary,
                                        fontWeight: 'bold',
                                      }}>
                                      {s.season_number === 0
                                        ? 'S'
                                        : s.season_number}
                                    </Text>

                                    <View style={styles.seasonItemInfo}>
                                      <Text
                                        style={{
                                          ...typography.h3,
                                          color: colors.text.primary,
                                        }}>
                                        {s.name}
                                      </Text>
                                      <View
                                        style={{
                                          flexDirection: 'row',
                                          alignItems: 'center',
                                          gap: spacing.xs,
                                        }}>
                                        <Text style={styles.seasonItemEpisodes}>
                                          {s.episode_count} Episodes
                                        </Text>

                                        {s.air_date && (
                                          <>
                                            <Text style={styles.infoDot}>
                                              •
                                            </Text>
                                            <Text
                                              style={styles.seasonItemEpisodes}>
                                              {s.air_date}
                                            </Text>
                                          </>
                                        )}
                                      </View>
                                      <Text
                                        style={{
                                          ...typography.body2,
                                          fontSize: 11,
                                          color: colors.text.secondary,
                                        }}
                                        numberOfLines={3}>
                                        {s.overview}
                                      </Text>
                                    </View>

                                    {/* Season Action Button */}
                                    <View
                                      style={{
                                        position: 'absolute',
                                        right: 10,
                                        top: 10,
                                        zIndex: 999,
                                        elevation: 5,
                                      }}
                                      pointerEvents="box-none">
                                      <EpisodeActionButtons
                                        showId={show.id}
                                        showTitle={show.name}
                                        seasonNumber={s.season_number}
                                        episodeNumber={s.episode_count} // Treat marking season as watching ALL episodes
                                        episodeTitle={`Season ${s.season_number}`}
                                        posterPath={show.poster_path}
                                        backdropPath={show.backdrop_path}
                                        totalSeasons={
                                          showDetails?.number_of_seasons
                                        }
                                        seasonData={showDetails?.seasons}
                                      />
                                    </View>
                                  </TouchableOpacity>
                                ),
                              )}
                          </ScrollView>
                        </MaybeBlurView>
                      </View>
                    </View>
                  </Modal>
                </View>
              ) : null;

            case 'tags':
              return isAnalysisUseful ? (
                <ContentTagsDisplay
                  thematicTags={contentTags?.thematicTags}
                  emotionalTags={contentTags?.emotionalTags}
                  isLoading={isGeneratingTags || isAnalysisLoading}
                />
              ) : null;
            case 'aiSimilar':
              return showDetails && isAIEnabled && isAnalysisUseful ? (
                <>
                  {isLoadingAiSimilar ? (
                    <View
                      style={[
                        styles.noEpisodesContainer,
                        {marginVertical: isTablet ? 150 : 50},
                      ]}>
                      <GradientSpinner
                        size={24}
                        style={{
                          alignItems: 'center',
                          alignSelf: 'center',
                        }}
                        colors={[colors.primary, colors.secondary]}
                      />
                      <Text
                        style={[
                          styles.noEpisodesText,
                          {fontStyle: 'italic', color: colors.text.primary},
                        ]}>
                        Theater AI is curating similar shows...
                      </Text>
                    </View>
                  ) : resolvedAiSimilarShows &&
                    resolvedAiSimilarShows.length > 0 ? (
                    <View>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: spacing.md,
                          marginLeft: spacing.md,
                          marginBottom: -spacing.md,
                        }}>
                        <Icon name="sparkles" size={20} color={colors.accent} />
                        <Text
                          style={{
                            ...typography.h3,
                            color: colors.text.primary,
                          }}>
                          More Like This
                        </Text>
                      </View>
                      <HorizontalList
                        title=""
                        data={resolvedAiSimilarShows.map((s: TVShow) => ({
                          ...s,
                          type: 'tv',
                        }))}
                        onItemPress={item =>
                          navigation.push('TVShowDetails', {
                            show: item as TVShow,
                          })
                        }
                        isSeeAll={false}
                      />
                    </View>
                  ) : null}
                </>
              ) : null;
            case 'productionInfo':
              return (
                <TVShowProductionInfo
                  status={showDetails?.status}
                  networks={showDetails?.networks}
                  productionCompanies={showDetails?.production_companies}
                  certification={
                    showDetails?.content_ratings?.results?.find(
                      (r: any) => r.iso_3166_1 === 'US',
                    )?.rating
                  }
                  firstAirDate={showDetails?.first_air_date}
                />
              );
            case 'similar':
              // Only show TMDB similar if AI similar is not available
              return !hasAISimilarData && similarShowsData.length > 0 ? (
                <Animated.View
                  style={{
                    opacity: similarFadeAnim,
                    transform: [
                      {
                        translateY: similarFadeAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [30, 0],
                        }),
                      },
                    ],
                  }}>
                  <HorizontalList
                    title="Similar shows"
                    data={similarShowsData}
                    onItemPress={handleItemPress}
                    onEndReached={hasNextSimilar ? fetchNextSimilar : undefined}
                    isLoading={isFetchingSimilar}
                    isSeeAll={false}
                  />
                </Animated.View>
              ) : null;
            case 'reviews':
              return (
                <View onLayout={() => setReviewsVisible(true)}>
                  <ReviewsSection
                    reviews={reviewsData}
                    totalReviews={totalReviews}
                    onLoadMore={fetchNextReviews}
                    hasMore={hasNextReviews}
                    isLoading={isFetchingReviews}
                    voteAverage={showDetails?.vote_average || show.vote_average}
                  />
                </View>
              );
            default:
              return null;
          }
        }}
        keyExtractor={(item: any) => item.id}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={<View style={{height: 200}} />}
      />

      <WatchlistModal
        visible={showWatchlistModal}
        onClose={() => setShowWatchlistModal(false)}
        item={show}
        itemType="tv"
      />

      <PermissionModal
        visible={showPermissionModal}
        onClose={() => setShowPermissionModal(false)}
        onRequestPermission={() => notificationService.requestUserPermission()}
        onContinue={async () => {
          if (pendingAction) await pendingAction();
        }}
      />

      <ServerModal
        visible={isServerModalOpen}
        onClose={() => setIsServerModalOpen(false)}
        currentServer={currentServer}
        setCurrentServer={setCurrentServer}
      />

      <MovieAIChatModal
        visible={isAIChatModalOpen}
        onClose={() => setIsAIChatModalOpen(false)}
        movieTitle={show.name}
        movieYear={
          showDetails?.first_air_date
            ? new Date(showDetails.first_air_date).getFullYear()
            : new Date().getFullYear()
        }
        movieOverview={show.overview}
        movieGenres={(showDetails?.genres || []).map((g: any) => g.name)}
        contentType="tv"
        contentId={show.id}
        releaseDate={
          showDetails?.first_air_date || (show as any).first_air_date
        }
      />

      <IMDBModal
        visible={showIMDBModal}
        onClose={() => setShowIMDBModal(false)}
        searchQuery={show.name}
        title={show.name}
      />

      <IMDBModal
        visible={showRottenTomatoesModal}
        onClose={() => setShowRottenTomatoesModal(false)}
        searchQuery={show.name}
        title={show.name}
        type="rotten_tomatoes"
      />
    </View>
  );
};
