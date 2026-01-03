import React, {useState, useEffect, useCallback, useMemo, useRef} from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  useWindowDimensions,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Linking,
} from 'react-native';
import {PermissionModal} from '../components/PermissionModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {notificationService} from '../services/NotificationService';
import YoutubePlayer from 'react-native-youtube-iframe';
import {
  useMovieDetails,
  useSimilarMovies,
  useAISimilarMovies,
  useMovieReviews,
} from '../hooks/useMovies';
import {
  getImageUrl,
  getDirectors,
  getWriters,
  getComposer,
  getCinematographer,
} from '../services/tmdb';
import {Cast, Genre, Movie, Video} from '../types/movie';
import Icon from 'react-native-vector-icons/Ionicons';
import {HorizontalList} from '../components/HorizontalList';
import {MovieTrivia} from '../components/MovieTrivia';
import {CastCrewTabbedSection} from '../components/CastCrewTabbedSection';
import {MediaTabs} from '../components/MediaTabs';
import {KeywordsDisplay} from '../components/KeywordsDisplay';
import {ProductionInfo} from '../components/ProductionInfo';
import {CollectionBanner} from '../components/CollectionBanner';
import {useNavigation, RouteProp} from '@react-navigation/native';
import {ContentItem} from '../components/MovieList';
import {
  MySpaceStackParamList,
  HomeStackParamList,
  SearchStackParamList,
  MoviesStackParamList,
  TVShowsStackParamList,
  MovieCategoryType,
} from '../types/navigation';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {
  DetailScreenSkeleton,
  BannerSkeleton,
  IMDBSkeleton,
} from '../components/LoadingSkeleton';
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
import {useIsFocused} from '@react-navigation/native';
import {useNavigationState} from '../hooks/useNavigationState';
import {useContentTags} from '../hooks/useContentTags';
import {ContentTagsDisplay} from '../components/ContentTagsDisplay';
import {ReviewsSection} from '../components/ReviewsSection';
import languageData from '../utils/language.json';
import {useQueryClient} from '@tanstack/react-query';
import Cinema from '../components/Cinema';
import {ServerModal} from '../components/ServerModal';
import {GradientSpinner} from '../components/GradientSpinner';
import {useResponsive} from '../hooks/useResponsive';
import {useIMDBRating} from '../hooks/useScrap';
import {ImageBackground} from 'react-native';
import FastImage from 'react-native-fast-image';
import {MovieAIChatModal} from '../components/MovieAIChatModal';
import {useAIEnabled} from '../hooks/useAIEnabled';
import {checkInternet} from '../services/connectivity';
import {NoInternet} from './NoInternet';
import {HistoryManager} from '../store/history';
import {getRealm} from '../database/realm';
import {CollectionsManager} from '../store/collections';
import {tmdbApi} from '../services/api';
import ShareLib, {Social} from 'react-native-share';
import {requestPosterCapture} from '../components/PosterCaptureHost';
import {MaybeBlurView} from '../components/MaybeBlurView';
import {BlurView} from '@react-native-community/blur';
import {BlurPreference} from '../store/blurPreference';
import {IMDBModal} from '../components/IMDBModal';
import {useContentAnalysis} from '../hooks/useContentAnalysis';
import {ScheduleWatchModal} from '../components/ScheduleWatchModal';
import {FeedbackModal} from '../components/FeedbackModal';

type MovieDetailsScreenNavigationProp = NativeStackNavigationProp<
  MySpaceStackParamList &
    HomeStackParamList &
    SearchStackParamList &
    MoviesStackParamList &
    TVShowsStackParamList
>;
type MovieDetailsScreenRouteProp = RouteProp<
  MySpaceStackParamList,
  'MovieDetails'
>;

interface MovieDetailsScreenProps {
  navigation: MovieDetailsScreenNavigationProp;
  route: MovieDetailsScreenRouteProp;
}

// Simple function to get language name
const getLanguage = (code: string) => {
  const language = languageData.find(lang => lang.iso_639_1 === code);
  return language?.english_name || code.toUpperCase();
};

// Format vote count number to string (e.g., 1200000 -> "1.2M")
const formatVoteCount = (votes: number): string => {
  if (votes >= 1000000) {
    return `${(votes / 1000000).toFixed(1)}M`;
  } else if (votes >= 1000) {
    return `${(votes / 1000).toFixed(1)}K`;
  }
  return votes.toString();
};

export const MovieDetailsScreen: React.FC<MovieDetailsScreenProps> = ({
  route,
}) => {
  const navigation = useNavigation<MovieDetailsScreenNavigationProp>();
  const params = route.params as any;
  const movie = params.movie || {
    id: params.movieId || params.id,
    title: params.title || 'Loading...',
    overview: '',
    poster_path: null,
    backdrop_path: null,
  };
  const [isScheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [scheduledWatchDate, setScheduledWatchDate] = useState<Date | null>(
    null,
  );
  const {isAIEnabled} = useAIEnabled();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPosterLoading, setIsPosterLoading] = useState(true);
  const [showWatchlistModal, setShowWatchlistModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    (() => Promise<void>) | null
  >(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const {navigateWithLimit} = useNavigationState();
  const queryClient = useQueryClient();
  const cinema = false;
  const isFocused = useIsFocused();
  const [currentServer, setCurrentServer] = useState<number | null>(1);
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [isAIChatModalOpen, setIsAIChatModalOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [hasCache, setHasCache] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const {isTablet, orientation} = useResponsive();
  const {width, height} = useWindowDimensions();
  const [aiRatings, setAiRatings] = useState<{
    imdb?: number | null;
    rotten_tomatoes?: number | null;
    imdb_votes?: number | null;
  } | null>(null);
  const [scrapedRatings, setScrapedRatings] = useState<{
    imdb?: number | null;
    imdb_votes?: number | null;
  } | null>(null);

  // Poster share state
  const [showPosterModal, setShowPosterModal] = useState(false);
  const [posterLoading, setPosterLoading] = useState(false);
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
  // Rating modals state
  const [showIMDBModal, setShowIMDBModal] = useState(false);
  const [showRottenTomatoesModal, setShowRottenTomatoesModal] = useState(false);
  const [posterUri, setPosterUri] = useState<string | null>(null);
  const [isSharingPoster, setIsSharingPoster] = useState(false);

  // Collection state
  const [isCollectionSaved, setIsCollectionSaved] = useState(false);
  const [isCollectionLoading, setIsCollectionLoading] = useState(false);

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

  useEffect(() => {
    const checkCalendar = async () => {
      try {
        const stored = await AsyncStorage.getItem('calendar_items');
        if (stored) {
          const items = JSON.parse(stored);
          const exists = items.some(
            (i: any) =>
              i.id === movie.id && i.type === 'movie' && !i.schedulerType,
          ); // Check for release type (default)
          setIsInCalendar(exists);

          const customSchedule = items.find(
            (i: any) =>
              i.id === movie.id &&
              i.type === 'movie' &&
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
  }, [movie.id, isScheduleModalVisible]); // Re-run when modal closes (schedule might change)

  // Lazy loading state for reviews
  const [reviewsVisible, setReviewsVisible] = useState(false);

  // Ref for FlatList to preserve scroll position
  const flatListRef = useRef<FlatList>(null);
  const loadingRatingsRef = useRef<number | null>(null);

  // Check connectivity and cache status for this specific movie
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const online = await checkInternet();
        // Check if movie is cached in Realm
        const realm = getRealm();
        const cachedMovie = realm.objectForPrimaryKey('Movie', movie.id);
        setIsOnline(online);
        setHasCache(!!cachedMovie);
      } catch (error) {
        console.error('Error checking connectivity/cache status:', error);
        setIsOnline(true); // Default to online if check fails
        setHasCache(false);
      }
    };
    checkStatus();
  }, [movie.id]);

  const handleRetry = async () => {
    if (retrying) return;
    setRetrying(true);
    try {
      const online = await checkInternet();
      setIsOnline(online);

      if (online) {
        // If back online, invalidate and refetch all queries for this movie
        queryClient.invalidateQueries({
          queryKey: ['movie', movie.id],
        });
        queryClient.invalidateQueries({
          queryKey: ['similarMovies', movie.id],
        });
        queryClient.invalidateQueries({
          queryKey: ['recommendations', movie.id],
        });
        queryClient.invalidateQueries({
          queryKey: ['watchProviders', movie.id, 'movie'],
        });
        queryClient.invalidateQueries({
          queryKey: ['isInWatchlist', movie.id],
        });

        // Force refetch movie details
        queryClient.refetchQueries({
          queryKey: ['movie', movie.id],
        });
      }

      // Re-check cache status after retry
      const realm = getRealm();
      const cachedMovie = realm.objectForPrimaryKey('Movie', movie.id);
      setHasCache(!!cachedMovie);
    } catch (error) {
      console.error('Error during retry:', error);
    } finally {
      setRetrying(false);
    }
  };

  // Animation values for loading states and components
  const loadingPulseAnim = useRef(new Animated.Value(1)).current;
  const posterFadeAnim = useRef(new Animated.Value(1)).current;
  const contentFadeAnim = useRef(new Animated.Value(0)).current;
  const castFadeAnim = useRef(new Animated.Value(0)).current;
  const similarFadeAnim = useRef(new Animated.Value(0)).current;

  // Animate loading spinner with pulse effect
  useEffect(() => {
    if (isInitialLoading) {
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
  }, [isInitialLoading]);

  // Animate poster fade-in when image loads
  useEffect(() => {
    if (isImageLoaded) {
      Animated.timing(posterFadeAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [isImageLoaded]);

  // Animate content sections when data is available
  useEffect(() => {
    if (!isInitialLoading) {
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
  }, [isInitialLoading]);

  // Cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      // Clean up queries when screen unmounts
      queryClient.removeQueries({
        queryKey: ['movie', movie.id],
      });
    };
  }, [movie.id]);

  const {
    data: movieDetails,
    isLoading: isLoadingDetails,
    error: movieDetailsError,
  } = useMovieDetails(movie.id);

  // Memoize genres to prevent unnecessary re-renders
  const genresArray = useMemo(
    () => movieDetails?.genres?.map((g: Genre) => g.name) || [],
    [movieDetails?.genres],
  );

  // Unified AI Analysis
  const {data: analysisData, isLoading: isAnalysisLoading} = useContentAnalysis(
    {
      title: movie.title,
      year: (
        (movie as any).release_date || (movieDetails as any)?.release_date
      )?.split('-')[0],
      overview: movie.overview || movieDetails?.overview || '',
      genres: genresArray,
      type: 'movie',
      contentId: movie.id,
      releaseDate:
        (movie as any).release_date || (movieDetails as any)?.release_date,
      enabled: !!(movieDetails && isAIEnabled),
    },
  );

  // Use movieDetails title if available, otherwise fallback to movie.title
  const displayTitle = movieDetails?.title || movie.title;
  const displayOverview = movieDetails?.overview || movie.overview;
  const displayBackdrop = movieDetails?.backdrop_path || movie.backdrop_path;
  const displayPoster = movieDetails?.poster_path || movie.poster_path;

  // Record to history when user starts watching
  const addToHistory = useCallback(() => {
    const credits = movieDetails?.credits;
    const item = {
      id: movie.id,
      title: movie.title,
      name: movie.title,
      overview: movie.overview,
      poster_path: movie.poster_path,
      backdrop_path: movie.backdrop_path,
      vote_average: (movie as any).vote_average ?? 0,
      release_date: (movie as any).release_date,
      first_air_date: undefined,
      genre_ids: (movie as any).genre_ids ?? [],
      original_language: (movie as any).original_language,
      type: 'movie' as const,
      runtime: movieDetails?.runtime,
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
  }, [movie, movieDetails]);

  useEffect(() => {
    if (movieDetails) {
      addToHistory();
    }
  }, [movieDetails, addToHistory]);

  // Check collection status
  useEffect(() => {
    const checkCollectionStatus = async () => {
      if (movieDetails?.belongs_to_collection) {
        const saved = await CollectionsManager.isCollected(
          movieDetails.belongs_to_collection.id.toString(),
        );
        setIsCollectionSaved(saved);
      }
    };
    if (isFocused) {
      checkCollectionStatus();
    }
  }, [movieDetails?.belongs_to_collection, isFocused]);

  const handleToggleCollection = async () => {
    if (!movieDetails?.belongs_to_collection || isCollectionLoading) return;
    const collectionId = movieDetails.belongs_to_collection.id;

    setIsCollectionLoading(true);
    try {
      if (isCollectionSaved) {
        await CollectionsManager.deleteCollection(collectionId.toString());
        setIsCollectionSaved(false);
      } else {
        // Fetch full details
        const {data} = await tmdbApi.get(`/collection/${collectionId}`);
        await CollectionsManager.saveCollection({
          id: data.id,
          name: data.name,
          overview: data.overview,
          poster_path: data.poster_path,
          backdrop_path: data.backdrop_path,
          parts: data.parts,
        });
        setIsCollectionSaved(true);
      }
    } catch (e) {
      console.error('Failed to toggle collection', e);
      Alert.alert('Error', 'Could not update collection');
    } finally {
      setIsCollectionLoading(false);
    }
  };

  const isFuture = useMemo(() => {
    const d =
      (movie as any).release_date || (movieDetails as any)?.release_date;
    if (!d) return false;
    return new Date(d) > new Date();
  }, [movie, movieDetails]);

  const handleToggleCalendar = async () => {
    try {
      const hasPermission = await notificationService.checkPermission();
      if (!isInCalendar && !hasPermission) {
        setPendingAction(() => proceedToggleCalendar);
        setShowPermissionModal(true);
        return;
      }
      await proceedToggleCalendar();
    } catch (error) {
      console.error('Error toggling calendar', error);
    }
  };

  const proceedToggleCalendar = async () => {
    try {
      const stored = await AsyncStorage.getItem('calendar_items');
      let items = stored ? JSON.parse(stored) : [];

      if (isInCalendar) {
        // Remove
        const item = items.find(
          (i: any) => i.id === movie.id && i.type === 'movie',
        );
        if (item && item.notificationId) {
          await notificationService.cancelScheduledNotification(
            item.notificationId,
          );
        }
        items = items.filter(
          (i: any) => !(i.id === movie.id && i.type === 'movie'),
        );
        setIsInCalendar(false);
      } else {
        // Add
        const dateStr =
          (movie as any).release_date || (movieDetails as any)?.release_date;
        if (!dateStr) return;

        const releaseDate = new Date(dateStr);
        // Set notification for 7am on release day
        releaseDate.setHours(7, 0, 0, 0);

        const notifId = `movie_release_${movie.id}`;

        // Only schedule if date is future
        if (releaseDate > new Date()) {
          await notificationService.scheduleReleaseNotification(
            notifId,
            'Movie Release Today!',
            `${movie.title} is released today.`,
            releaseDate,
            {screen: 'MovieDetails', movieId: movie.id},
            movie.poster_path
              ? `https://image.tmdb.org/t/p/w200${movie.poster_path}`
              : null,
          );
        }

        items.push({
          id: movie.id,
          type: 'movie',
          title: movie.title,
          posterPath: movie.poster_path,
          releaseDate: dateStr,
          notificationId: notifId,
        });
        setIsInCalendar(true);
      }
      await AsyncStorage.setItem('calendar_items', JSON.stringify(items));
    } catch (error) {
      console.error('Error proceeding with calendar toggle', error);
    }
  };

  const handleScheduleWatch = async (
    date: Date,
    type?: 'release' | 'custom',
  ) => {
    // Handle release date notification
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

      // Remove any existing custom schedule for this movie
      const existingIndex = items.findIndex(
        (i: any) =>
          i.id === movie.id &&
          i.type === 'movie' &&
          i.schedulerType === 'custom',
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

      const notifId = `movie_schedule_${movie.id}`;

      await notificationService.scheduleReleaseNotification(
        notifId,
        'Movie Screening',
        `It's time to watch ${movie.title}!`,
        date,
        {screen: 'MovieDetails', movieId: movie.id},
        movie.poster_path
          ? `https://image.tmdb.org/t/p/w200${movie.poster_path}`
          : null,
      );

      items.push({
        id: movie.id,
        type: 'movie',
        title: movie.title,
        posterPath: movie.poster_path,
        releaseDate:
          (movie as any).release_date ||
          (movieDetails as any)?.release_date ||
          '',
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

  // Generate and store thematic/emotional tags for this movie
  const {isGenerating: isGeneratingTags, tags: contentTags} = useContentTags({
    title: movie.title,
    overview: movie.overview,
    genres: movieDetails?.genres?.map((g: Genre) => g.name).join(', ') || '',
    type: 'movie',
    contentId: movie.id,
    enabled: !!(movieDetails && isAIEnabled),
    poster_path: movie.poster_path || movieDetails?.poster_path,
    tags: analysisData?.tags,
  });

  // Set loading to false when data is available
  useEffect(() => {
    if (movieDetails && !isLoadingDetails) {
      setIsInitialLoading(false);
      const timer = setTimeout(() => {
        setIsInitialLoading(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [movieDetails, isLoadingDetails]);

  // 1. Initialize from Realm Cache immediately
  useEffect(() => {
    if (movie.id) {
      const {getMovie} = require('../database/contentCache');
      const cached = getMovie(movie.id);
      if (cached?.ai_ratings_cached_at) {
        setAiRatings({
          imdb: cached.ai_imdb_rating,
          rotten_tomatoes: cached.ai_rotten_tomatoes,
          imdb_votes: cached.ai_imdb_votes,
        });
      }
    }
  }, [movie.id]);

  // 2. TMDB Scraper: Aggressive priority for IMDB
  useEffect(() => {
    const runScraper = async () => {
      if (!movieDetails?.imdb_id) return;
      if (loadingRatingsRef.current === movie.id) return;
      loadingRatingsRef.current = movie.id;

      try {
        const {getIMDBRating} = await import('../services/scrap');
        const result = await getIMDBRating(movieDetails.imdb_id, movie.id);
        if (result?.rating) {
          setScrapedRatings({
            imdb: parseFloat(result.rating),
            imdb_votes: parseVoteCountString(result.voteCount),
          });
        }
      } catch (e) {
        console.warn('[Movie Ratings] Scraping error:', e);
      }
    };

    runScraper();
  }, [movie.id, movieDetails?.imdb_id]);

  // 3. Merge Logic: Prioritize Scraper > AI > Cache
  useEffect(() => {
    if (!analysisData && !scrapedRatings) return;

    setAiRatings(prev => {
      const current = prev || {};
      return {
        // IMDB: Scraper takes absolute priority. AI only if current is empty.
        imdb:
          scrapedRatings?.imdb ??
          current.imdb ??
          analysisData?.ratings?.imdb ??
          null,
        imdb_votes:
          scrapedRatings?.imdb_votes ??
          current.imdb_votes ??
          analysisData?.ratings?.imdb_votes ??
          null,
        // Rotten Tomatoes: AI is the source.
        rotten_tomatoes:
          analysisData?.ratings?.rotten_tomatoes ??
          current.rotten_tomatoes ??
          null,
      };
    });
  }, [analysisData, scrapedRatings]);

  // Helper to parse vote count strings (e.g., "1.2M" -> 1200000)
  const parseVoteCountString = (voteCountText: string): number | null => {
    if (!voteCountText) return null;
    try {
      const cleaned = voteCountText.replace(/[(),]/g, '').trim();
      if (cleaned.endsWith('M')) {
        return Math.round(parseFloat(cleaned) * 1000000);
      } else if (cleaned.endsWith('K')) {
        return Math.round(parseFloat(cleaned) * 1000);
      } else {
        return parseInt(cleaned.replace(/\D/g, ''), 10) || null;
      }
    } catch {
      return null;
    }
  };

  // Check if AI Analysis resulted in useful data (not placeholders)
  const isAnalysisUseful = useMemo(() => {
    if (!analysisData) return false;

    // 1. Check for "Unknown/Neutral" tags with low confidence
    const thematicTags = analysisData.tags?.thematicTags;
    if (thematicTags && thematicTags.length > 0) {
      if (
        thematicTags[0].tag === 'unknown' ||
        thematicTags[0].confidence === 0
      ) {
        return false;
      }
    }

    // 2. Check trivia for generic "not released/no information" phrases
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

    // 3. If everything is null or empty, it's not useful
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

  const {
    data: reviews,
    fetchNextPage: fetchNextReviews,
    hasNextPage: hasNextReviews,
    isFetchingNextPage: isFetchingReviews,
  } = useMovieReviews(movie.id, reviewsVisible);
  const {data: isInWatchlist} = useIsItemInAnyWatchlist(movie.id);

  const {data: watchlistContainingItem} = useWatchlistContainingItem(movie.id);
  const removeFromWatchlistMutation = useRemoveFromWatchlist();

  const {data: watchProviders} = useWatchProviders(movie.id, 'movie');

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

  // First available streaming provider icon (prefer flatrate → free → rent → buy → ads)
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
    const code = (movie as any)?.original_language as string | undefined;
    return code ? [code.toUpperCase()] : [];
  }, [movie]);
  const blurType = BlurPreference.getMode();
  const isSolid = blurType === 'normal';

  // AI Similar movies resolution
  const {data: resolvedAiSimilarMovies, isLoading: isLoadingAiSimilar} =
    useAISimilarMovies(
      movie.id,
      movie.title,
      movie.overview,
      movieDetails?.genres,
      analysisData?.similar,
    );

  // Determine if we should show AI similar content
  const hasAISimilarData =
    !isLoadingAiSimilar &&
    resolvedAiSimilarMovies &&
    resolvedAiSimilarMovies.length > 0;

  // CRITICAL: Never call TMDB similar API if AI is enabled and analysis is useful
  // Don't wait for AI to load - disable it from the start
  const shouldCallTMDBSimilar = !isAIEnabled || !isAnalysisUseful;

  // Only fetch TMDB similar movies when AI is completely disabled
  const {data: similarMovies, isLoading: isLoadingSimilar} = useSimilarMovies(
    movie.id,
    shouldCallTMDBSimilar,
  );

  const handleWatchlistPress = useCallback(async () => {
    if (isInWatchlist && watchlistContainingItem) {
      // If item is already in a watchlist, remove it
      try {
        await removeFromWatchlistMutation.mutateAsync({
          watchlistId: watchlistContainingItem,
          itemId: movie.id,
        });
      } catch (error) {
        Alert.alert('Error', 'Failed to remove from watchlist');
      }
    } else {
      // If item is not in any watchlist, show modal to add it
      setShowWatchlistModal(true);
    }
  }, [
    isInWatchlist,
    watchlistContainingItem,
    removeFromWatchlistMutation,
    movie.id,
  ]);

  const trailer = movieDetails?.videos.results.find(
    (video: Video) => video.type === 'Trailer' && video.site === 'YouTube',
  );

  const handleItemPress = useCallback(
    (item: ContentItem) => {
      if (item.type === 'movie') {
        (navigation as any).push('MovieDetails', {movie: item as Movie});
      } else {
        (navigation as any).push('TVShowDetails', {show: item as any});
      }
    },
    [navigation],
  );

  // Always ensure AI chat modal is closed when movie changes
  useEffect(() => {
    setIsAIChatModalOpen(false);
  }, [movie.id]);

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Build poster inputs
  const posterItems = useMemo(() => {
    return [
      {
        id: movie.id,
        type: 'movie' as const,
        title: movie.title,
        name: movie.title,
        poster_path: movie.poster_path || movieDetails?.poster_path,
        backdrop_path:
          movie.backdrop_path ||
          movieDetails?.backdrop_path ||
          movie.poster_path ||
          movieDetails?.poster_path,
        release_date:
          (movie as any).release_date || (movieDetails as any)?.release_date,
      },
    ];
  }, [movie, movieDetails]);

  const posterDetails = useMemo(() => {
    return {
      runtime: movieDetails?.runtime,
      year: (() => {
        const d =
          (movie as any).release_date || (movieDetails as any)?.release_date;
        try {
          return d ? new Date(d).getFullYear() : undefined;
        } catch {
          return undefined;
        }
      })(),
      rating: movieDetails?.vote_average,
      genres: movieDetails?.genres?.map((g: any) => g.name) || [],
    };
  }, [movie, movieDetails]);

  const handleOpenPoster = useCallback(async () => {
    try {
      setIsSharingPoster(true);
      const uri = await requestPosterCapture(
        {
          watchlistName: movie.title,
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
      console.warn('Poster capture failed', e);
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
              watchlistName: movie.title,
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
      setIsSharingPoster(false);
    }
  }, [movie.title, posterItems, posterDetails, streamingIcon, posterLanguages]);

  const handleSharePoster = useCallback(async () => {
    try {
      setIsSharingPoster(true);
      let uri = posterUri;
      if (!uri) {
        uri = await requestPosterCapture(
          {
            watchlistName: movie.title,
            items: posterItems as any,
            isFilter: false,
            showQR: false,
            details: posterDetails,
            streamingIcon,
            languages: posterLanguages,
          },
          'tmpfile',
        );
      }
      if (uri) {
        await ShareLib.open({url: uri, type: 'image/png'});
      }
    } catch (e) {
      console.warn('Poster share failed', e);
    } finally {
      setIsSharingPoster(false);
    }
  }, [posterUri, movie.title, posterItems, posterDetails]);

  const similarMoviesData = useMemo(() => {
    if (movieDetails?.genres?.some((genre: Genre) => genre.id === 10749)) {
      return [];
    }
    return (
      similarMovies?.pages?.flatMap(page =>
        page.results.map((movie: Movie) => ({
          ...movie,
          type: 'movie' as const,
        })),
      ) || []
    );
  }, [similarMovies]);

  const reviewsData = useMemo(() => {
    return reviews?.pages?.flatMap(page => page.results) || [];
  }, [reviews]);

  const totalReviews = useMemo(() => {
    return reviews?.pages[0]?.total_results || 0;
  }, [reviews]);

  // const recommendationsData = useMemo(() => {
  //   return (
  //     recommendations?.pages?.flatMap(page =>
  //       page.results.map((movie: Movie) => ({
  //         ...movie,
  //         type: 'movie' as const,
  //       })),
  //     ) || []
  //   );
  // }, [recommendations]);

  const handlePersonPress = useCallback(
    (personId: number, personName: string) => {
      navigateWithLimit('PersonCredits', {
        personId,
        personName,
        contentType: 'movie',
      });
    },
    [navigateWithLimit],
  );

  const handleCollectionPress = useCallback(
    (collectionId: number) => {
      navigateWithLimit('Collection', {collectionId});
    },
    [navigateWithLimit],
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
    content: {
      padding: 16,
      flexDirection: 'column',
      gap: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    trailerContainer: {
      // backgroundColor: '#000',
      zIndex: 10,
      flex: 1,
    },
    title: {
      fontSize: 24,
      fontWeight: '400',
      color: '#fff',
      textAlign: 'center',
      width: '100%',
      fontFamily: 'Inter_18pt-Regular',
      alignSelf: 'center',
    },
    tagline: {
      ...typography.body2,
      color: colors.text.muted,
      fontStyle: 'italic',
      textAlign: 'center',
      paddingHorizontal: spacing.md,
    },
    infoContainer: {
      flexDirection: 'column',
      gap: 8,
      marginBottom: 12,
      marginTop: 4,
      alignItems: 'center',
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
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
      color: 'rgba(163, 163, 163, 0.68)',
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
      borderRadius: borderRadius.round,
      paddingHorizontal: spacing.xl,
      paddingVertical: 16,
    },
    watchButtonText: {
      fontWeight: '700',
      fontSize: 14,
      fontFamily: 'Inter_18pt-Regular',
    },
    addButton: {
      width: 48,
      height: 48,
      borderRadius: borderRadius.round,
      backgroundColor: colors.modal.blur,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: colors.modal.header,
      alignItems: 'center',
      justifyContent: 'center',
    },
    genreContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
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
    posterContainer: {
      position: 'relative',
      width: '100%',
    },
    posterImage: {
      width: '100%',
      height: '100%',
      backgroundColor: colors.background.secondary,
      borderRadius: 40,
    },
    posterGradient: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 500,
    },
    posterGradientHorizontal: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 500,
    },
    posterGradientVertical: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 500,
    },
    backButton: {
      position: 'absolute',
      top: 30,
      left: 30,
      zIndex: 10,
      backgroundColor: colors.modal.blur,
      padding: 8,
      borderRadius: borderRadius.round,
    },
    posterContent: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: 16,
    },
    posterInfo: {
      flexDirection: 'column',
      gap: 8,
    },
    posterTitle: {
      fontSize: 24,
      fontWeight: '400',
      color: '#fff',
      fontFamily: 'Inter_18pt-Regular',
    },
    posterSubtitle: {
      fontSize: 14,
      color: 'rgba(255, 255, 255, 0.68)',
      fontFamily: 'Inter_18pt-Regular',
    },
    posterActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    actionButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 2},
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 4,
    },
    overviewSection: {
      flexDirection: 'column',
      gap: 8,
    },
    overviewText: {
      color: colors.text.muted,
      fontSize: 14,
      lineHeight: 20,
    },
    trailerSection: {
      flexDirection: 'column',
      gap: 16,
    },
    watchProvidersSection: {
      flexDirection: 'column',
      gap: 16,
    },
    similarSection: {
      flexDirection: 'column',
      gap: 16,
    },
    recommendedSection: {
      flexDirection: 'column',
      gap: 16,
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
      backgroundColor: 'rgba(15, 15, 15, 0.94)',
      borderWidth: 1,
      borderColor: 'rgba(43, 42, 42, 0.37)',
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

  // Show NoInternet if offline and no cache for movie details
  // Only show if we have an actual error and are offline with no cache
  if (!isOnline && !hasCache && movieDetailsError && !isLoadingDetails) {
    return <NoInternet onRetry={handleRetry} isRetrying={retrying} />;
  }

  // Show loading state immediately to prevent FPS drop
  if (isInitialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <DetailScreenSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MovieAIChatModal
        visible={isAIChatModalOpen}
        onClose={() => setIsAIChatModalOpen(false)}
        movieTitle={movie.title}
        movieYear={new Date(
          (movie as any).release_date ||
            (movieDetails as any)?.release_date ||
            new Date().toISOString(),
        ).getFullYear()}
        movieOverview={
          (movie as any).overview || (movieDetails as any)?.overview || ''
        }
        movieGenres={movieDetails?.genres?.map((g: any) => g.name) || []}
        contentId={movie.id}
      />
      {/* Floating AI chat button */}
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
          elevation: 5,
          shadowColor: 'rgba(46, 1, 39, 0.48)',
          shadowOffset: {width: 0, height: 0},
          shadowRadius: 10,
        }}>
        <TouchableOpacity
          onPress={() => setIsAIChatModalOpen(true)}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: borderRadius.round,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(15, 15, 15, 0.84)',
            borderWidth: 1.5,
            borderColor: 'rgba(255, 255, 255, 0.13)',
          }}
          activeOpacity={0.7}>
          <Image
            source={require('../assets/theaterai.webp')}
            style={{width: 30, height: 20}}
          />
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
                alignItems: 'center',
                padding: spacing.md,
              }}>
              {posterUri && (
                <View>
                  <TouchableOpacity
                    onPress={handleClosePoster}
                    style={{
                      position: 'absolute',
                      top: -48,
                      right: -48,
                      zIndex: 2,
                      backgroundColor: 'rgba(156, 155, 155, 0.13)',
                      borderRadius: borderRadius.round,
                      padding: 8,
                    }}>
                    <Icon
                      name="close-outline"
                      size={24}
                      color={colors.text.primary}
                    />
                  </TouchableOpacity>
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
                      display: 'flex',
                      gap: spacing.lg,
                      overflow: 'hidden',
                      borderRadius: borderRadius.round,
                      width: '70%',
                      alignSelf: 'center',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <LinearGradient
                      colors={[colors.primary, colors.secondary]}
                      start={{x: 0, y: 0}}
                      end={{x: 1, y: 0}}>
                      <TouchableOpacity
                        onPress={handleSharePoster}
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: spacing.sm,
                          borderRadius: borderRadius.round,
                          paddingHorizontal: 20,
                          paddingVertical: 12,
                        }}>
                        <Icon
                          name="share-social-outline"
                          size={18}
                          color={colors.text.primary}
                        />
                        <Text
                          style={{
                            color: colors.text.primary,
                            marginTop: 4,
                            fontFamily: 'Inter_18pt-Regular',
                            fontSize: 12,
                          }}>
                          Share
                        </Text>
                      </TouchableOpacity>
                    </LinearGradient>
                  </View>
                </View>
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
          {type: 'castCrew', id: 'castCrew'},
          {type: 'mediaTabs', id: 'mediaTabs'},
          {type: 'collection', id: 'collection'},
          {type: 'providers', id: 'providers'},
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
                      title={movie.title}
                      onSchedule={handleScheduleWatch}
                      releaseDate={
                        isFuture && (movie as any).release_date
                          ? new Date((movie as any).release_date)
                          : null
                      }
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
                        <FastImage
                          source={{
                            uri: getImageUrl(
                              movie.backdrop_path ||
                                movieDetails?.backdrop_path ||
                                movie.poster_path ||
                                movieDetails?.poster_path ||
                                '',
                              'w780',
                            ),
                          }}
                          style={styles.backdrop}
                          onLoadEnd={() => {
                            setIsPosterLoading(false);
                            setIsImageLoaded(true);
                          }}
                          onError={() => {
                            setIsPosterLoading(false);
                            setIsImageLoaded(true);
                          }}
                          resizeMode={FastImage.resizeMode.cover}
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
                            style: {
                              objectFit: 'cover',
                              marginBottom:
                                isTablet && orientation === 'portrait'
                                  ? 0
                                  : isTablet && orientation === 'landscape'
                                  ? -100
                                  : -60,
                            },
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
                    <Text style={styles.title}>{displayTitle}</Text>
                    {movieDetails?.tagline && (
                      <Text style={styles.tagline}>
                        "{movieDetails.tagline}"
                      </Text>
                    )}
                  </View>
                  <View style={styles.infoContainer}>
                    <View style={styles.infoRow}>
                      <Text style={styles.info}>
                        {new Date(
                          (movie as any).release_date ||
                            (movieDetails as any)?.release_date ||
                            new Date().toISOString(),
                        ).getFullYear()}
                      </Text>
                      {movieDetails?.runtime != null &&
                        movieDetails.runtime > 0 && (
                          <>
                            <Text style={styles.infoDot}>•</Text>
                            <Text style={styles.info}>
                              {Math.floor(movieDetails.runtime / 60)}h{' '}
                              {movieDetails.runtime % 60}m
                            </Text>
                          </>
                        )}
                      {movieDetails?.original_language && (
                        <>
                          <Text style={styles.infoDot}>•</Text>
                          <Text style={styles.info}>
                            {getLanguage(movieDetails?.original_language)}
                          </Text>
                        </>
                      )}
                      {movieDetails?.vote_average != null &&
                        movieDetails.vote_average > 0 && (
                          <>
                            <Text style={styles.infoDot}>•</Text>
                            <View
                              style={{
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: spacing.xs,
                              }}>
                              <Icon name="star" size={12} color="#ffffff70" />
                              <Text style={styles.info}>
                                {movieDetails.vote_average.toFixed(1)}
                              </Text>
                            </View>
                          </>
                        )}
                    </View>
                  </View>
                  <View
                    style={
                      hasOTT || isFuture
                        ? styles.buttonContainerColumn
                        : styles.buttonRow
                    }>
                    {hasOTT || isFuture ? (
                      <>
                        <View style={styles.buttonRowTop}>
                          <GradientButton
                            title="Watch Trailer"
                            isIcon={true}
                            onPress={() => {
                              // setIsPlaying(true);
                              navigation.navigate('CinemaScreen', {
                                id: movie.id.toString(),
                                type: 'movie',
                                title: displayTitle,
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
                            contentId={movie.id}
                            title={displayTitle}
                            type="movie"
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
                              <Icon
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
                                  {isInCalendar ? 'Releasing On' : 'Remind Me'}
                                </Text>
                                <Text
                                  style={{
                                    ...typography.body1,
                                    color: colors.text.primary,
                                    fontSize: 11,
                                  }}>
                                  {(() => {
                                    const dateStr =
                                      (movie as any).release_date ||
                                      (movieDetails as any)?.release_date;
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
                            onPress={() => {
                              setScheduleModalVisible(true);
                            }}
                            activeOpacity={0.7}>
                            <Icon
                              name={
                                scheduledWatchDate
                                  ? 'calendar'
                                  : 'calendar-outline'
                              }
                              size={18}
                              color={colors.text.primary}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.addButton}
                            onPress={handleWatchlistPress}
                            disabled={removeFromWatchlistMutation.isPending}>
                            <Icon
                              name={isInWatchlist ? 'checkmark' : 'add'}
                              size={18}
                              color={
                                isInWatchlist ? colors.text.primary : '#fff'
                              }
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.addButton}
                            onPress={handleOpenPoster}
                            disabled={isSharingPoster}
                            activeOpacity={0.9}>
                            {isSharingPoster ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <Icon
                                name="logo-instagram"
                                size={20}
                                color="#fff"
                              />
                            )}
                          </TouchableOpacity>
                        </View>
                      </>
                    ) : (
                      <>
                        <GradientButton
                          title="Watch Trailer"
                          isIcon={isTablet ? true : false}
                          onPress={() => {
                            // setIsPlaying(true);
                            navigation.navigate('CinemaScreen', {
                              id: movie.id.toString(),
                              type: 'movie',
                              title: displayTitle,
                            });
                          }}
                          style={{
                            ...styles.watchButton,
                            paddingHorizontal: isTablet
                              ? spacing.xl
                              : spacing.md,
                            opacity: isPlaying ? 0.3 : 1,
                          }}
                          textStyle={{
                            ...typography.body1,
                            fontWeight: 'bold',
                            fontSize: isTablet ? 14 : 11,
                          }}
                        />
                        <WatchProvidersButton
                          providers={watchProviders}
                          contentId={movie.id}
                          title={displayTitle}
                          type="movie"
                        />
                        <TouchableOpacity
                          style={styles.addButton}
                          onPress={() => {
                            setScheduleModalVisible(true);
                          }}
                          activeOpacity={0.7}>
                          <Icon
                            name={
                              scheduledWatchDate
                                ? 'calendar'
                                : 'calendar-outline'
                            }
                            size={18}
                            color={colors.text.primary}
                          />
                        </TouchableOpacity>
                        {isFuture && (
                          <TouchableOpacity
                            style={styles.addButton}
                            onPress={handleToggleCalendar}
                            activeOpacity={0.7}>
                            <Icon
                              name={
                                isInCalendar
                                  ? 'notifications'
                                  : 'notifications-outline'
                              }
                              size={18}
                              color={isInCalendar ? colors.accent : '#fff'}
                            />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={styles.addButton}
                          onPress={handleWatchlistPress}
                          disabled={removeFromWatchlistMutation.isPending}>
                          <Icon
                            name={isInWatchlist ? 'checkmark' : 'add'}
                            size={18}
                            color={isInWatchlist ? colors.text.primary : '#fff'}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.addButton}
                          onPress={handleOpenPoster}
                          disabled={isSharingPoster}
                          activeOpacity={0.9}>
                          {isSharingPoster ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Icon
                              name="logo-instagram"
                              size={20}
                              color="#fff"
                            />
                          )}
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                  <View style={styles.genreContainer}>
                    {movieDetails?.genres
                      ?.slice(0, 3)
                      .map((genre: Genre, index: number) => (
                        <View key={genre.id} style={styles.genreWrapper}>
                          <Text style={styles.genre}>{genre.name}</Text>
                          {index <
                            Math.min(movieDetails.genres.length - 1, 2) && (
                            <Text style={styles.genreDivider}>|</Text>
                          )}
                        </View>
                      ))}
                  </View>
                  {!movieDetails ? (
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
                        display: 'flex',
                        flexDirection: 'row',
                        gap: spacing.md,
                      }}>
                      {/* Always show IMDB logo */}
                      <TouchableOpacity
                        onPress={() => setShowIMDBModal(true)}
                        activeOpacity={0.7}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          flexDirection: 'row',
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
                                  ({formatVoteCount(aiRatings.imdb_votes)})
                                </Text>
                              )}
                            </>
                          )
                        )}
                      </TouchableOpacity>

                      {/* Always show RT logo if AI is enabled */}
                      {isAIEnabled && (
                        <TouchableOpacity
                          onPress={() => setShowRottenTomatoesModal(true)}
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
                            source={require('../assets/tomato.png')}
                            style={{
                              width: 20,
                              height: 20,
                              resizeMode: 'contain',
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
                                  marginLeft: spacing.xs,
                                }}>
                                {aiRatings.rotten_tomatoes}%
                              </Text>
                            )
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  <Text style={styles.overview}>
                    {(movie as any).overview ||
                      (movieDetails as any)?.overview ||
                      ''}
                  </Text>
                  <LinearGradient
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
                  </LinearGradient>
                </Animated.View>
              );
            case 'castCrew':
              // Deduplicate crew by person ID and combine roles
              const crewMap = new Map();
              movieDetails?.credits?.crew?.forEach((person: any) => {
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
                    cast={movieDetails?.credits?.cast || []}
                    crew={crew}
                    onPersonPress={handlePersonPress}
                  />
                </Animated.View>
              );
            case 'collection':
              return (
                <CollectionBanner
                  collection={movieDetails?.belongs_to_collection}
                  onPress={handleCollectionPress}
                  isCollected={isCollectionSaved}
                  onToggleCollect={handleToggleCollection}
                />
              );
            case 'productionInfo':
              return (
                <ProductionInfo
                  budget={movieDetails?.budget}
                  revenue={movieDetails?.revenue}
                  productionCompanies={movieDetails?.production_companies}
                  spokenLanguages={movieDetails?.spoken_languages}
                  certification={
                    movieDetails?.release_dates?.results?.find(
                      (r: any) => r.iso_3166_1 === 'US',
                    )?.release_dates?.[0]?.certification
                  }
                  releaseDate={movieDetails?.release_date}
                />
              );
            case 'mediaTabs':
              return (
                <MediaTabs
                  images={movieDetails?.images}
                  videos={movieDetails?.videos}
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
              }
              return isAnalysisUseful ? (
                <View style={{paddingHorizontal: spacing.md}}>
                  <MovieTrivia
                    title={displayTitle}
                    year={new Date(movie.release_date).getFullYear().toString()}
                    type="movie"
                    contentId={movie.id}
                    trivia={analysisData?.trivia}
                    loading={isAnalysisLoading}
                  />
                </View>
              ) : null;
            case 'providers':
              return watchProviders ? (
                <WatchProviders
                  providers={watchProviders}
                  contentId={movie.id.toString()}
                  title={displayTitle}
                  type="movie"
                />
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
              return isAnalysisUseful ? (
                <>
                  {isLoadingAiSimilar ? (
                    <View style={{minHeight: 200}}>
                      <Text
                        style={{
                          ...typography.body2,
                          color: colors.modal.activeBorder,
                          marginTop: spacing.md,
                          textAlign: 'center',
                        }}>
                        Theater AI is curating similar movies...
                      </Text>
                    </View>
                  ) : resolvedAiSimilarMovies &&
                    resolvedAiSimilarMovies.length > 0 ? (
                    <View style={{marginTop: spacing.md}}>
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
                        data={resolvedAiSimilarMovies}
                        onItemPress={handleItemPress}
                        isSeeAll={false}
                      />
                    </View>
                  ) : null}
                </>
              ) : null;
            case 'similar':
              // Only show TMDB similar if AI similar is not available
              return !hasAISimilarData && similarMoviesData.length > 0 ? (
                <View style={{marginTop: spacing.md}}>
                  <HorizontalList
                    title="Similar movies"
                    data={similarMoviesData}
                    onItemPress={handleItemPress}
                    isSeeAll={false}
                  />
                </View>
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
                    voteAverage={
                      movieDetails?.vote_average || movie.vote_average
                    }
                  />
                </View>
              );
            default:
              return null;
          }
        }}
        keyExtractor={(item: any) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingBottom: 150}}
        alwaysBounceVertical
      />
      <ScheduleWatchModal
        visible={isScheduleModalVisible}
        onClose={() => setScheduleModalVisible(false)}
        title={displayTitle}
        onSchedule={handleScheduleWatch}
        releaseDate={
          isFuture
            ? new Date(
                (movie as any).release_date ||
                  (movieDetails as any)?.release_date,
              )
            : null
        }
        existingDate={scheduledWatchDate}
        onRemove={async () => {
          try {
            const stored = await AsyncStorage.getItem('calendar_items');
            if (stored) {
              const items = JSON.parse(stored);
              const idx = items.findIndex(
                (i: any) =>
                  i.id === movie.id &&
                  i.type === 'movie' &&
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

      <PermissionModal
        visible={showPermissionModal}
        onClose={() => setShowPermissionModal(false)}
        onRequestPermission={() => notificationService.requestUserPermission()}
        onContinue={async () => {
          if (pendingAction) await pendingAction();
        }}
      />

      <WatchlistModal
        visible={showWatchlistModal}
        onClose={() => setShowWatchlistModal(false)}
        item={movie}
        itemType="movie"
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
        movieTitle={displayTitle}
        movieYear={
          movie.release_date
            ? new Date(movie.release_date).getFullYear()
            : new Date().getFullYear()
        }
        movieOverview={movie.overview || movieDetails?.overview || ''}
        movieGenres={movieDetails?.genres?.map((g: any) => g.name) || []}
        contentType="movie"
        contentId={movie.id}
        releaseDate={movie.release_date || movieDetails?.release_date}
      />

      <IMDBModal
        visible={showIMDBModal}
        onClose={() => setShowIMDBModal(false)}
        imdbId={movieDetails?.imdb_id}
        searchQuery={displayTitle}
        title={displayTitle}
      />

      <IMDBModal
        visible={showRottenTomatoesModal}
        onClose={() => setShowRottenTomatoesModal(false)}
        searchQuery={displayTitle}
        title={displayTitle}
        type="rotten_tomatoes"
      />
    </View>
  );
};
