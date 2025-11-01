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
} from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import {
  useMovieDetails,
  useSimilarMovies,
  useAISimilarMovies,
} from '../hooks/useMovies';
import {getImageUrl} from '../services/tmdb';
import {Movie} from '../types/movie';
import {Video, Genre, Cast} from '../types/movie';
import Icon from 'react-native-vector-icons/Ionicons';
import {HorizontalList} from '../components/HorizontalList';
import {MovieTrivia} from '../components/MovieTrivia';
import {useNavigation, RouteProp} from '@react-navigation/native';
import {ContentItem} from '../components/MovieList';
import {MySpaceStackParamList} from '../types/navigation';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {
  DetailScreenSkeleton,
  BannerSkeleton,
  IMDBSkeleton,
} from '../components/LoadingSkeleton';
import {useWatchProviders} from '../hooks/useWatchProviders';
import {WatchProviders} from '../components/WatchProviders';
import {LinearGradient} from 'react-native-linear-gradient';
import {GradientButton} from '../components/GradientButton';
import {PersonCard} from '../components/PersonCard';
import {WatchlistModal} from '../components/WatchlistModal';
import {
  useIsItemInAnyWatchlist,
  useWatchlistContainingItem,
  useRemoveFromWatchlist,
} from '../hooks/useWatchlists';
import {useFocusEffect, useIsFocused} from '@react-navigation/native';
import {useNavigationState} from '../hooks/useNavigationState';
import {useContentTags} from '../hooks/useContentTags';
import {ContentTagsDisplay} from '../components/ContentTagsDisplay';
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
import {offlineCache} from '../services/offlineCache';
import {HistoryManager} from '../store/history';
import ShareLib from 'react-native-share';
import {requestPosterCapture} from '../components/PosterCaptureHost';
import {MaybeBlurView} from '../components/MaybeBlurView';
import {BlurPreference} from '../store/blurPreference';
import {getCriticRatings} from '../services/gemini';
import {IMDBModal} from '../components/IMDBModal';

type MovieDetailsScreenNavigationProp =
  NativeStackNavigationProp<MySpaceStackParamList>;
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

export const MovieDetailsScreen: React.FC<MovieDetailsScreenProps> = ({
  route,
}) => {
  const navigation = useNavigation<MovieDetailsScreenNavigationProp>();
  const {movie} = route.params;
  const {isAIEnabled} = useAIEnabled();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPosterLoading, setIsPosterLoading] = useState(true);
  const [showWatchlistModal, setShowWatchlistModal] = useState(false);
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
  } | null>(null);

  // Poster share state
  const [showPosterModal, setShowPosterModal] = useState(false);
  const [posterLoading, setPosterLoading] = useState(false);

  // Rating modals state
  const [showIMDBModal, setShowIMDBModal] = useState(false);
  const [showRottenTomatoesModal, setShowRottenTomatoesModal] = useState(false);
  const [posterUri, setPosterUri] = useState<string | null>(null);
  const [isSharingPoster, setIsSharingPoster] = useState(false);

  // Record to history when user starts watching
  const addToHistory = useCallback(() => {
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
      type: 'movie' as const,
    };
    HistoryManager.add(item as any);
  }, [movie]);

  useEffect(() => {
    addToHistory();
  }, []);

  // Check connectivity and cache status for this specific movie
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const online = await checkInternet();
        const movieCache = await offlineCache.getCachedMovie(movie.id);
        setIsOnline(online);
        setHasCache(!!movieCache);
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
      const movieCache = await offlineCache.getCachedMovie(movie.id);
      setHasCache(!!movieCache);
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

  // Memory cleanup when screen loses focus
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        // Clean up when screen loses focus to free memory
        queryClient.removeQueries({
          queryKey: ['movie', movie.id],
        });
        // Clear any cached data for this movie
        queryClient.invalidateQueries({
          queryKey: ['similarMovies', movie.id],
        });
        queryClient.invalidateQueries({
          queryKey: ['recommendations', movie.id],
        });
      };
    }, [movie.id, queryClient]),
  );

  const {
    data: movieDetails,
    isLoading: isLoadingDetails,
    error: movieDetailsError,
  } = useMovieDetails(movie.id);

  // Generate and store thematic/emotional tags for this movie
  const {isGenerating: isGeneratingTags, tags: contentTags} = useContentTags({
    title: movie.title,
    overview: movie.overview,
    genres: movieDetails?.genres?.map((g: Genre) => g.name).join(', ') || '',
    type: 'movie',
    contentId: movie.id,
    enabled: !!(movieDetails && isAIEnabled),
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

  // Load AI critic ratings (used for RT and IMDb fallback)
  useEffect(() => {
    const loadRatings = async () => {
      try {
        const yearStr = (() => {
          const d = (movie as any).release_date;
          try {
            return d ? new Date(d).getFullYear().toString() : undefined;
          } catch {
            return undefined;
          }
        })();
        const res = await getCriticRatings({
          title: movie.title,
          year: yearStr,
          type: 'movie',
          contentId: movie.id,
        });
        if (__DEV__) {
          console.log('[AI Ratings][Movie]', movie.title, yearStr, res);
        }
        setAiRatings(res);
      } catch (e) {
        if (__DEV__) {
          console.warn('[AI Ratings][Movie] failed:', e);
        }
      }
    };
    loadRatings();
  }, [movie.id, movie.title]);

  const {data: similarMovies, isLoading: isLoadingSimilar} = useSimilarMovies(
    movie.id,
  );
  const {data: isInWatchlist} = useIsItemInAnyWatchlist(movie.id);

  const {data: watchlistContainingItem} = useWatchlistContainingItem(movie.id);
  const removeFromWatchlistMutation = useRemoveFromWatchlist();

  const {data: watchProviders} = useWatchProviders(movie.id, 'movie');

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
  const {data: imdbRating, isLoading: isLoadingImdbRating} = useIMDBRating(
    movieDetails?.imdb_id?.toString() || '',
  );
  const blurType = BlurPreference.getMode();

  // Use memoized AI similar movies hook
  const {data: aiSimilarMovies = [], isLoading: isLoadingAiSimilar} =
    useAISimilarMovies(
      movie.id,
      movieDetails?.title,
      movieDetails?.overview,
      movieDetails?.genres,
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
        navigateWithLimit('MovieDetails', {movie: item as Movie});
      } else {
        navigateWithLimit('TVShowDetails', {show: item as any});
      }
    },
    [navigateWithLimit],
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
    setShowPosterModal(true);
    setPosterLoading(true);
    setPosterUri(null);
    try {
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
      setPosterUri(uri);
    } catch (e) {
      console.warn('Create poster failed', e);
      setShowPosterModal(false);
    } finally {
      setPosterLoading(false);
    }
  }, [movie.title, posterItems, posterDetails, streamingIcon]);

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
          ? 400
          : isTablet && orientation === 'landscape'
          ? height * 0.7
          : 200,
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
      width: isTablet ? 300 : width - 100,
      marginTop: -spacing.sm,
    },
    watchButton: {
      borderRadius: 24,
      paddingHorizontal: 36,
      paddingVertical: 14,
    },
    watchButtonText: {
      fontWeight: '700',
      fontSize: 16,
      fontFamily: 'Inter_18pt-Regular',
    },
    addButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.modal.header,
      borderWidth: 1,
      borderColor: colors.modal.border,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 2},
      shadowOpacity: 0.18,
      shadowRadius: 6,
      elevation: 4,
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
    posterButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
  });

  // When not focused (another screen is on top), render an empty container to reduce load
  if (!isFocused) {
    return <View style={styles.container} />;
  }

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
        navigationBarTranslucent
        animationType="fade"
        backdropColor={colors.modal.blurDark}
        onRequestClose={() => setShowPosterModal(false)}>
        <MaybeBlurView
          blurAmount={20}
          blurType="dark"
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: spacing.md,
          }}>
          <View
            style={{
              width: '92%',
              borderRadius: borderRadius.lg,
              alignItems: 'center',
              padding: spacing.md,
            }}>
            {posterLoading ? (
              <View style={{padding: spacing.xl, alignItems: 'center'}}>
                <ActivityIndicator size="large" color={colors.text.primary} />
                <Text
                  style={{
                    marginTop: spacing.sm,
                    color: colors.text.secondary,
                    fontFamily: 'Inter_18pt-Regular',
                  }}>
                  Creating poster...
                </Text>
              </View>
            ) : posterUri ? (
              <View>
                <TouchableOpacity
                  onPress={() => setShowPosterModal(false)}
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
                    size={30}
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
                        paddingVertical: 16,
                      }}>
                      <Icon
                        name="share-social-outline"
                        size={22}
                        color={colors.text.primary}
                      />
                      <Text
                        style={{
                          color: colors.text.primary,
                          marginTop: 4,
                          fontFamily: 'Inter_18pt-Regular',
                        }}>
                        Share
                      </Text>
                    </TouchableOpacity>
                  </LinearGradient>
                </View>
              </View>
            ) : (
              <View style={{padding: spacing.lg}}>
                <Text
                  style={{
                    color: colors.text.secondary,
                    fontFamily: 'Inter_18pt-Regular',
                  }}>
                  Failed to create poster.
                </Text>
              </View>
            )}
          </View>
        </MaybeBlurView>
      </Modal>
      <FlatList
        data={[
          {type: 'header', id: 'header'},
          {type: 'content', id: 'content'},
          {type: 'cast', id: 'cast'},
          {type: 'providers', id: 'providers'},
          {type: 'trivia', id: 'trivia'},
          {type: 'similar', id: 'similar'},
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
                              'original',
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
                        {cinema && isFocused ? (
                          <Cinema
                            id={movie.id.toString()}
                            type="movie"
                            currentServer={currentServer || 1}
                          />
                        ) : (
                          <YoutubePlayer
                            width={
                              isTablet && orientation === 'portrait'
                                ? width
                                : isTablet && orientation === 'landscape'
                                ? width + 90
                                : width + 90
                            }
                            height={
                              isTablet && orientation === 'portrait'
                                ? '90%'
                                : isTablet && orientation === 'landscape'
                                ? height * 0.7
                                : '100%'
                            }
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
                        )}
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
                  <Text style={styles.title}>{movie.title}</Text>
                  <View style={styles.infoContainer}>
                    <View style={styles.infoRow}>
                      <Text style={styles.info}>
                        {new Date(
                          (movie as any).release_date ||
                            (movieDetails as any)?.release_date ||
                            new Date().toISOString(),
                        ).getFullYear()}
                      </Text>
                      {movieDetails?.runtime && (
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
                      {movieDetails?.vote_average && (
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
                  <View style={styles.buttonRow}>
                    {cinema && isFocused ? (
                      isPlaying ? (
                        <GradientButton
                          title="Switch Server"
                          onPress={() => {
                            setIsServerModalOpen(true);
                          }}
                          style={{...styles.watchButton}}
                          textStyle={styles.watchButtonText}
                          fullWidth
                          v2
                        />
                      ) : (
                        <GradientButton
                          title="Watch Now"
                          onPress={() => {
                            setIsPlaying(true);
                          }}
                          style={styles.watchButton}
                          textStyle={styles.watchButtonText}
                          fullWidth
                        />
                      )
                    ) : (
                      <GradientButton
                        title="Watch Now"
                        onPress={() => {
                          setIsPlaying(true);
                          addToHistory();
                        }}
                        style={{
                          ...styles.watchButton,
                          opacity: isPlaying ? 0.3 : 1,
                        }}
                        textStyle={styles.watchButtonText}
                        fullWidth
                      />
                    )}
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={handleWatchlistPress}
                      disabled={removeFromWatchlistMutation.isPending}>
                      <Icon
                        name={isInWatchlist ? 'checkmark' : 'add'}
                        size={24}
                        color={isInWatchlist ? colors.accent : '#fff'}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={handleOpenPoster}
                      activeOpacity={0.9}>
                      <Icon name="logo-instagram" size={20} color="#fff" />
                    </TouchableOpacity>
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
                  {isLoadingImdbRating ? (
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
                        }}>
                        <Image
                          source={require('../assets/imdb.webp')}
                          style={{
                            width: 50,
                            height: 30,
                            resizeMode: 'contain',
                          }}
                        />
                        {imdbRating?.rating && (
                          <>
                            <Text
                              style={{
                                ...typography.body1,
                                color: colors.text.primary,
                                fontWeight: 'bold',
                                marginLeft: spacing.sm,
                              }}>
                              {imdbRating?.rating}
                            </Text>
                            <Text
                              style={{
                                ...typography.body1,
                                color: colors.text.muted,
                                marginLeft: spacing.xs,
                              }}>
                              ({imdbRating?.voteCount})
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>

                      {/* Always show RT logo if AI is enabled */}
                      {isAIEnabled && (
                        <TouchableOpacity
                          onPress={() => setShowRottenTomatoesModal(true)}
                          activeOpacity={0.7}
                          style={{
                            marginTop: spacing.xs,
                            flexDirection: 'row',
                            alignItems: 'center',
                          }}>
                          <Image
                            source={require('../assets/tomato.png')}
                            style={{
                              width: 50,
                              height: 30,
                              resizeMode: 'contain',
                            }}
                          />
                          {aiRatings?.rotten_tomatoes != null && (
                            <Text
                              style={{
                                ...typography.body1,
                                color: colors.text.primary,
                                fontWeight: '600',
                              }}>
                              {aiRatings.rotten_tomatoes}%
                            </Text>
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
            case 'cast':
              return movieDetails?.credits?.cast?.length > 0 ? (
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
                  <Text style={styles.sectionTitle}>Cast</Text>
                  <FlatList
                    data={movieDetails.credits.cast.slice(0, 10)}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{paddingHorizontal: 16}}
                    renderItem={({item: person}: {item: Cast}) => (
                      <TouchableOpacity
                        style={styles.castItem}
                        onPress={() =>
                          handlePersonPress(person.id, person.name)
                        }>
                        <PersonCard
                          item={getImageUrl(person.profile_path || '', 'w154')}
                          onPress={() =>
                            handlePersonPress(person.id, person.name)
                          }
                        />
                        <Text style={styles.castName} numberOfLines={1}>
                          {person.name}
                        </Text>
                        <Text style={styles.character} numberOfLines={1}>
                          {person.character}
                        </Text>
                      </TouchableOpacity>
                    )}
                    keyExtractor={(person: Cast) => person.id.toString()}
                  />
                </Animated.View>
              ) : null;
            case 'trivia':
              return (
                <View style={{paddingHorizontal: spacing.md}}>
                  <MovieTrivia
                    title={movie.title}
                    year={new Date(movie.release_date).getFullYear().toString()}
                    type="movie"
                    contentId={movie.id}
                  />
                </View>
              );
            case 'providers':
              return watchProviders ? (
                <WatchProviders
                  providers={watchProviders}
                  contentId={movie.id.toString()}
                  title={movie.title}
                  type="movie"
                />
              ) : null;
            case 'similar':
              return (
                <Animated.View
                  style={{
                    zIndex: 2,
                    opacity: similarFadeAnim,
                    transform: [
                      {
                        translateY: similarFadeAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [30, 0],
                        }),
                      },
                    ],
                    minHeight: 200, // Ensure minimum height
                  }}>
                  {isAIEnabled && (
                    <>
                      {/* Content Tags Section */}
                      <ContentTagsDisplay
                        thematicTags={contentTags?.thematicTags}
                        emotionalTags={contentTags?.emotionalTags}
                        isLoading={isGeneratingTags}
                      />

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
                      ) : (
                        <View style={{minHeight: 200}}>
                          {Array.isArray(aiSimilarMovies) &&
                            aiSimilarMovies.length > 0 && (
                              <HorizontalList
                                title="Similar movies by Theater AI"
                                data={aiSimilarMovies}
                                onItemPress={handleItemPress}
                                isSeeAll={false}
                              />
                            )}
                        </View>
                      )}
                    </>
                  )}
                  {similarMoviesData.length > 0 ? (
                    <View style={{marginTop: spacing.md}}>
                      <HorizontalList
                        title="Similar movies"
                        data={similarMoviesData}
                        onItemPress={handleItemPress}
                        isSeeAll={false}
                      />
                    </View>
                  ) : null}
                </Animated.View>
              );
            default:
              return null;
          }
        }}
        keyExtractor={(item: any) => item.id}
        removeClippedSubviews={true}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingBottom: 150}}
        alwaysBounceVertical
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

      <IMDBModal
        visible={showIMDBModal}
        onClose={() => setShowIMDBModal(false)}
        imdbId={movieDetails?.imdb_id}
        searchQuery={movie.title}
        title={movie.title}
      />

      <IMDBModal
        visible={showRottenTomatoesModal}
        onClose={() => setShowRottenTomatoesModal(false)}
        searchQuery={movie.title}
        title={movie.title}
        type="rotten_tomatoes"
      />
    </View>
  );
};
