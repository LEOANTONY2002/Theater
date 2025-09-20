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
} from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import {
  useTVShowDetails,
  useSimilarTVShows,
  useTVShowRecommendations,
  useSeasonDetails,
  useAISimilarTVShows,
} from '../hooks/useTVShows';
import {getImageUrl, getLanguage} from '../services/tmdb';
import {
  TVShow,
  TVShowDetails as TVShowDetailsType,
  Episode,
} from '../types/tvshow';
import {Video, Genre, Cast, Movie} from '../types/movie';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {HorizontalList} from '../components/HorizontalList';
import {MovieTrivia} from '../components/MovieTrivia';
import {useIsFocused, useNavigation} from '@react-navigation/native';
import {useNavigationState} from '../hooks/useNavigationState';
import {ContentItem} from '../components/MovieList';
import {MySpaceStackParamList} from '../types/navigation';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {
  DetailScreenSkeleton,
  BannerSkeleton,
} from '../components/LoadingSkeleton';
import {BlurView} from '@react-native-community/blur';
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
import {useQueryClient} from '@tanstack/react-query';
import Cinema from '../components/Cinema';
import {ServerModal} from '../components/ServerModal';
import {GradientSpinner} from '../components/GradientSpinner';
import {useResponsive} from '../hooks/useResponsive';
import {MovieAIChatModal} from '../components/MovieAIChatModal';
import {useAIEnabled} from '../hooks/useAIEnabled';
import {FlashList} from '@shopify/flash-list';
import {checkInternet} from '../services/connectivity';
import {NoInternet} from './NoInternet';
import {offlineCache} from '../services/offlineCache';
import {HistoryManager} from '../store/history';
import ShareLib from 'react-native-share';
import {requestPosterCapture} from '../components/PosterCaptureHost';

type TVShowDetailsScreenNavigationProp =
  NativeStackNavigationProp<MySpaceStackParamList>;

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
  const {show} = route.params;
  const {isAIEnabled} = useAIEnabled();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPosterLoading, setIsPosterLoading] = useState(true);
  const [showWatchlistModal, setShowWatchlistModal] = useState(false);
  const {
    data: showDetails,
    isLoading,
    error: showDetailsError,
  } = useTVShowDetails(show.id);
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
  const [isOnline, setIsOnline] = useState(true);
  const [hasCache, setHasCache] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const {isTablet, orientation} = useResponsive();
  const {width, height} = useWindowDimensions();

  // Poster share state
  const [showPosterModal, setShowPosterModal] = useState(false);
  const [posterLoading, setPosterLoading] = useState(false);
  const [posterUri, setPosterUri] = useState<string | null>(null);
  const [isSharingPoster, setIsSharingPoster] = useState(false);

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
      type: 'tv' as const,
    };
    HistoryManager.add(item as any);
  }, [show, showDetails]);

  // Watch providers and first streaming icon (prefer flatrate → free → rent → buy → ads)
  const {data: watchProviders} = useWatchProviders(show.id, 'tv');
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

  useEffect(() => {
    addToHistory();
  }, []);

  // Check connectivity and cache status for this specific TV show
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const online = await checkInternet();
        const showCache = await offlineCache.getCachedTVShow(show.id);
        setIsOnline(online);
        setHasCache(!!showCache);
      } catch (error) {
        console.error('Error checking connectivity/cache status:', error);
        setIsOnline(true); // Default to online if check fails
        setHasCache(false);
      }
    };
    checkStatus();
  }, [show.id]);

  const handleRetry = async () => {
    if (retrying) return;
    setRetrying(true);
    try {
      const online = await checkInternet();
      setIsOnline(online);

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
      const showCache = await offlineCache.getCachedTVShow(show.id);
      setHasCache(!!showCache);
    } catch (error) {
      console.error('Error during retry:', error);
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
    data: similarShows,
    fetchNextPage: fetchNextSimilar,
    hasNextPage: hasNextSimilar,
    isFetchingNextPage: isFetchingSimilar,
  } = useSimilarTVShows(show.id);

  const {
    data: recommendedShows,
    fetchNextPage: fetchNextRecommended,
    hasNextPage: hasNextRecommended,
    isFetchingNextPage: isFetchingRecommended,
  } = useTVShowRecommendations(show.id);

  const [showSeasonModal, setShowSeasonModal] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(showDetails?.seasons[0]);

  const {data: episodes} = useSeasonDetails(
    show.id,
    selectedSeason?.season_number,
  );

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
      genres: showDetails?.genres?.map((g: any) => g.name) || [],
    };
  }, [show, showDetails]);

  const handleOpenPoster = useCallback(async () => {
    setShowPosterModal(true);
    setPosterLoading(true);
    setPosterUri(null);
    try {
      const uri = await requestPosterCapture(
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
      setPosterUri(uri);
    } catch (e) {
      console.warn('Create poster failed', e);
      setShowPosterModal(false);
    } finally {
      setPosterLoading(false);
    }
  }, [show.name, posterItems, posterDetails, streamingIcon]);

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
      console.warn('Poster share failed', e);
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

  // Use memoized AI similar TV shows hook
  const {data: aiSimilarShows = [], isLoading: isLoadingAiSimilar} =
    useAISimilarTVShows(
      show.id,
      showDetails?.name,
      showDetails?.overview,
      showDetails?.genres,
    );

  const trailer = showDetails?.videos.results.find(
    (video: Video) => video.type === 'Trailer' && video.site === 'YouTube',
  );

  const handleItemPress = useCallback(
    (item: ContentItem) => {
      if (item.type === 'movie') {
        navigateWithLimit('MovieDetails', {movie: item as Movie});
      } else {
        navigateWithLimit('TVShowDetails', {show: item as TVShow});
      }
    },
    [navigateWithLimit],
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

  const renderEpisodeItem = useCallback(
    ({item: episode}: {item: Episode}) => (
      <TouchableOpacity
        key={episode.id}
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
          <Text style={styles.episodeTitle} numberOfLines={1}>
            {episode.name}
          </Text>
          <View style={styles.episodeInfo}>
            {episode?.episode_number && (
              <Text style={styles.info}>
                S{episode.season_number} E{episode.episode_number}
              </Text>
            )}
            <Text style={styles.infoDot}>•</Text>
            <Text style={styles.info}>
              {new Date(episode.air_date).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
            {episode?.runtime && (
              <>
                <Text style={styles.infoDot}>•</Text>
                <Text style={styles.info}>{episode.runtime} min</Text>
              </>
            )}
            {episode?.vote_average && (
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
    ),
    [],
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
      zIndex: 100,
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
    infoContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
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
      flex: 1,
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
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.modal.border,
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 2},
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 4,
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
      marginBottom: 30,
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
      backgroundColor: 'transparent',
      justifyContent: 'flex-end',
    },
    modalContent: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '80%',
      overflow: 'hidden',
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
      borderRadius: 8,
      marginBottom: 8,
      paddingHorizontal: 12,
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
      fontSize: 16,
      fontWeight: '500',
      marginBottom: 4,
      fontFamily: 'Inter_18pt-Regular',
    },
    seasonItemEpisodes: {
      color: colors.text.secondary,
      fontSize: 14,
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
  });

  // When not focused (another screen is on top), render an empty container to reduce load
  if (!isFocused) {
    return <View style={styles.container} />;
  }

  // Show NoInternet if offline and no cache for TV show details
  // Only show if we have an actual error and are offline with no cache
  if (!isOnline && !hasCache && showDetailsError && !isLoading) {
    return <NoInternet onRetry={handleRetry} isRetrying={retrying} />;
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <DetailScreenSkeleton />
      </View>
    );
  }

  const similarShowsData = showDetails?.genres?.some(
    (genre: Genre) => genre.id === 10749,
  )
    ? []
    : similarShows?.pages.flatMap(page =>
        page.results.map((show: TVShow) => ({...show, type: 'tv' as const})),
      ) || [];

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
        transparent
        onRequestClose={() => setShowPosterModal(false)}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.8)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: spacing.md,
          }}>
          <View
            style={{
              width: '92%',
              borderRadius: borderRadius.lg,
              overflow: 'hidden',
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
                    onPress={() => setShowPosterModal(false)}
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
        </View>
      </Modal>
      <FlashList
        data={[
          {type: 'header', id: 'header'},
          {type: 'content', id: 'content'},
          ...(isAIEnabled ? [{type: 'trivia', id: 'trivia'}] : []),
          {type: 'cast', id: 'cast'},
          {type: 'providers', id: 'providers'},
          {type: 'seasons', id: 'seasons'},
          ...(isAIEnabled ? [{type: 'aiSimilar', id: 'aiSimilar'}] : []),
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
                        <Image
                          source={{
                            uri: getImageUrl(
                              (show as any).backdrop_path ||
                                (showDetails as any)?.backdrop_path ||
                                (show as any).poster_path ||
                                (showDetails as any)?.poster_path ||
                                '',
                              'original',
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
                        {cinema && isFocused ? (
                          <Cinema
                            id={show.id.toString()}
                            type="tv"
                            season={season}
                            episode={episode}
                            currentServer={currentServer || 1}
                          />
                        ) : (
                          <YoutubePlayer
                            height={width * 0.5625}
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
                  <Text style={styles.title}>{show.name}</Text>
                  <View style={styles.infoContainer}>
                    <Text style={styles.info}>
                      {new Date(showDetails?.first_air_date).getFullYear()}
                    </Text>
                    {showDetails?.number_of_seasons && (
                      <>
                        <Text style={styles.infoDot}>•</Text>
                        <Text style={styles.info}>
                          {showDetails.number_of_seasons} Season
                          {showDetails.number_of_seasons !== 1 ? 's' : ''}
                        </Text>
                      </>
                    )}
                    {showDetails?.number_of_episodes && (
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
                    {showDetails?.vote_average && (
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
                            {showDetails.vote_average.toFixed(1)}
                          </Text>
                        </View>
                      </>
                    )}
                  </View>
                  <View style={styles.buttonRow}>
                    {cinema && isFocused ? (
                      isPlaying ? (
                        <GradientButton
                          title="Switch Server"
                          onPress={() => {
                            setIsServerModalOpen(true);
                          }}
                          style={styles.watchButton}
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
                      <Ionicons
                        name={isInAnyWatchlist ? 'checkmark' : 'add'}
                        size={24}
                        color={isInAnyWatchlist ? colors.accent : '#fff'}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={handleOpenPoster}
                      activeOpacity={0.9}>
                      <Ionicons
                        name="share-social-outline"
                        size={20}
                        color="#fff"
                      />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.genreContainer}>
                    {showDetails?.genres
                      ?.slice(0, 3)
                      .map((genre: Genre, index: number) => (
                        <View key={genre?.id} style={styles.genreWrapper}>
                          <Text style={styles.genre}>{genre?.name}</Text>
                          {index <
                            Math.min(showDetails.genres.length - 1, 2) && (
                            <Text style={styles.genreDivider}>|</Text>
                          )}
                        </View>
                      ))}
                  </View>
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
                  <Text style={styles.overview}>{showDetails.overview}</Text>
                </Animated.View>
              );
            case 'trivia':
              return (
                <View style={{paddingHorizontal: spacing.md}}>
                  <MovieTrivia
                    title={show.name}
                    year={
                      showDetails?.first_air_date
                        ? new Date(showDetails.first_air_date)
                            .getFullYear()
                            .toString()
                        : undefined
                    }
                    type="tv"
                  />
                </View>
              );
            case 'cast':
              return showDetails?.credits?.cast?.length > 0 ? (
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
                  <FlashList
                    data={showDetails.credits.cast.slice(0, 10)}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{paddingHorizontal: spacing.md}}
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
                        <Text style={styles.castName} numberOfLines={2}>
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
            case 'providers':
              return watchProviders ? (
                <WatchProviders
                  providers={watchProviders}
                  contentId={show.id.toString()}
                  title={show.name}
                  type="tv"
                />
              ) : null;
            case 'seasons':
              return showDetails?.seasons ? (
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
                  episodes.episodes.length > 0 ? (
                    <FlashList
                      data={episodes.episodes}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.episodesContainer}
                      estimatedItemSize={280}
                      keyExtractor={(ep: Episode) => ep.id.toString()}
                      removeClippedSubviews={true}
                      renderItem={renderEpisodeItem}
                    />
                  ) : (
                    <View style={styles.noEpisodesContainer}>
                      <View style={styles.noEpisodesContainer}>
                        <GradientSpinner
                          size={30}
                          style={{
                            marginVertical: 50,
                            alignItems: 'center',
                            alignSelf: 'center',
                          }}
                          color={colors.modal.activeBorder}
                        />
                        <Text style={styles.noEpisodesText}>
                          Fetching episodes...
                        </Text>
                      </View>
                    </View>
                  )}

                  <Modal
                    visible={showSeasonModal}
                    transparent
                    animationType="slide"
                    statusBarTranslucent={true}
                    onRequestClose={() => setShowSeasonModal(false)}>
                    <TouchableOpacity
                      style={styles.modalOverlay}
                      activeOpacity={0.9}
                      onPress={() => setShowSeasonModal(false)}>
                      <View style={styles.modalContent}>
                        <BlurView
                          style={styles.blurView}
                          blurType="dark"
                          blurAmount={10}
                          overlayColor={colors.modal.blur}
                          reducedTransparencyFallbackColor={colors.modal.blur}
                        />
                        <View style={styles.modalHeader}>
                          <Text style={styles.modalTitle}>Select Season</Text>
                          <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={() => setShowSeasonModal(false)}>
                            <Ionicons
                              name="close"
                              size={24}
                              color={colors.text.primary}
                            />
                          </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.seasonsList}>
                          {showDetails.seasons.map(
                            (s: TVShowDetailsType['seasons'][0]) => (
                              <TouchableOpacity
                                key={s.id}
                                activeOpacity={0.9}
                                style={[
                                  styles.seasonItem,
                                  selectedSeason?.id === s.id && {
                                    backgroundColor: colors.modal.active,
                                    borderWidth: 1,
                                    borderColor: colors.text.tertiary,
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
                                <View style={styles.seasonItemInfo}>
                                  <Text style={styles.seasonItemName}>
                                    {getSeasonTitle(s)}
                                  </Text>
                                  <Text style={styles.seasonItemEpisodes}>
                                    {s.episode_count} Episodes
                                  </Text>
                                </View>
                              </TouchableOpacity>
                            ),
                          )}
                        </ScrollView>
                      </View>
                    </TouchableOpacity>
                  </Modal>
                </View>
              ) : null;
            case 'aiSimilar':
              return showDetails ? (
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
                  ) : (
                    <>
                      {Array.isArray(aiSimilarShows) &&
                        aiSimilarShows.length > 0 && (
                          <HorizontalList
                            title="Similar shows by Theater AI"
                            data={aiSimilarShows}
                            onItemPress={handleItemPress}
                            isSeeAll={false}
                          />
                        )}
                    </>
                  )}
                </>
              ) : null;
            case 'similar':
              return similarShowsData.length > 0 ? (
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
            default:
              return null;
          }
        }}
        estimatedItemSize={200}
        keyExtractor={(item: any) => item.id}
        getItemType={(item: any) => item.type}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={<View style={{height: 200}} />}
      />

      <WatchlistModal
        visible={showWatchlistModal}
        onClose={() => setShowWatchlistModal(false)}
        item={show}
        itemType="tv"
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
        movieGenres={showDetails?.genres?.map((g: any) => g.name) || []}
        contentType="tv"
      />
    </View>
  );
};
