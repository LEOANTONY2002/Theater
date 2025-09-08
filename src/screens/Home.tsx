import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Dimensions,
  Text,
  Modal,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import {useMoviesList, useTop10MoviesTodayByRegion} from '../hooks/useMovies';
import {useTop10ShowsTodayByRegion, useTVShowsList} from '../hooks/useTVShows';
import {ContentItem} from '../components/MovieList';
import {HorizontalList} from '../components/HorizontalList';
import {Movie} from '../types/movie';
import {TVShow} from '../types/tvshow';
import {
  MovieCategoryType,
  TVShowCategoryType,
  ContentType,
} from '../types/navigation';
import {colors, spacing, borderRadius} from '../styles/theme';
import {
  BannerHomeSkeleton,
  HeadingSkeleton,
  HorizontalListSkeleton,
} from '../components/LoadingSkeleton';
import {FeaturedBannerHome} from '../components/FeaturedBannerHome';
import {useRegion} from '../hooks/useApp';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {FiltersManager} from '../store/filters';
import {SavedFilter} from '../types/filters';
import {searchFilterContent} from '../services/tmdb';
import {HomeFilterRow} from '../components/HomeFilterRow';
import {useNavigation} from '@react-navigation/native';
import {useNavigationState} from '../hooks/useNavigationState';
import LinearGradient from 'react-native-linear-gradient';
import {SettingsManager} from '../store/settings';
import {useResponsive} from '../hooks/useResponsive';
import {MyNextWatch} from '../components/MyNextWatch';
import {BecauseYouWatched} from '../components/BecauseYouWatched';
import {MoodQuestionnaire} from '../components/MoodQuestionnaire';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FastImage from 'react-native-fast-image';
import {BlurView} from '@react-native-community/blur';
import {useAIEnabled} from '../hooks/useAIEnabled';
import {cache, CACHE_KEYS} from '../utils/cache';

export const HomeScreen = React.memo(() => {
  const {data: region} = useRegion();
  const navigation = useNavigation();
  const {navigateWithLimit} = useNavigationState();
  const [showMoodQuestionnaire, setShowMoodQuestionnaire] = useState(false);
  const {isAIEnabled} = useAIEnabled();
  const [top10ContentByRegion, setTop10ContentByRegion] = useState<
    ContentItem[]
  >([]);
  const [renderPhase, setRenderPhase] = useState(2);
  const [showMoreContent, setShowMoreContent] = useState(true);
  const [moodAnswers, setMoodAnswers] = useState<{
    [key: string]: string;
  } | null>(null);
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [moodLoaded, setMoodLoaded] = useState(false);
  // Increment only when mood is updated to signal MyNextWatch to refresh
  const [moodVersion, setMoodVersion] = useState(0);
  // We no longer force-remount MyNextWatch on Home focus; it can refresh itself via its own UI
  // const [moodRefreshKey, setMoodRefreshKey] = useState(0);
  const queryClient = useQueryClient();

  const {
    data: latestMoviesByRegion,
    hasNextPage: hasNextLatestMoviesByRegion,
    isFetchingNextPage: isFetchingLatestMoviesByRegion,
    fetchNextPage: fetchNextLatestMoviesByRegion,
  } = useMoviesList('latest_by_region');

  const {
    data: popularMovies,
    fetchNextPage: fetchNextPopularMovies,
    hasNextPage: hasNextPopularMovies,
    isFetchingNextPage: isFetchingPopularMovies,
  } = useMoviesList('popular');

  const {
    data: topRatedMovies,
    fetchNextPage: fetchNextTopRatedMovies,
    hasNextPage: hasNextTopRatedMovies,
    isFetchingNextPage: isFetchingTopRatedMovies,
  } = useMoviesList('top_rated');

  const {
    data: upcomingMovies,
    fetchNextPage: fetchNextUpcomingMovies,
    hasNextPage: hasNextUpcomingMovies,
    isFetchingNextPage: isFetchingUpcomingMovies,
  } = useMoviesList('upcoming');

  const {
    data: upcomingMoviesByRegion,
    fetchNextPage: fetchNextUpcomingMoviesByRegion,
    hasNextPage: hasNextUpcomingMoviesByRegion,
    isFetchingNextPage: isFetchingUpcomingMoviesByRegion,
  } = useMoviesList('upcoming_by_region');

  const {
    data: popularTVShows,
    fetchNextPage: fetchNextPopularTV,
    hasNextPage: hasNextPopularTV,
    isFetchingNextPage: isFetchingPopularTV,
  } = useTVShowsList('popular');

  const {
    data: topRatedTVShows,
    fetchNextPage: fetchNextTopRatedTV,
    hasNextPage: hasNextTopRatedTV,
    isFetchingNextPage: isFetchingTopRatedTV,
  } = useTVShowsList('top_rated');

  // Recent Movies (Now Playing)
  const {
    data: recentMovies,
    fetchNextPage: fetchNextRecentMovies,
    hasNextPage: hasNextRecentMovies,
    isFetchingNextPage: isFetchingRecentMovies,
  } = useMoviesList('latest');

  // Recent TV Shows (On Air)
  const {
    data: recentTVShows,
    fetchNextPage: fetchNextRecentTV,
    hasNextPage: hasNextRecentTV,
    isFetchingNextPage: isFetchingRecentTV,
  } = useTVShowsList('latest');

  // // Trending Movies
  // const {
  //   data: trendingMovies,
  //   fetchNextPage: fetchNextTrendingMovies,
  //   hasNextPage: hasNextTrendingMovies,
  //   isFetchingNextPage: isFetchingTrendingMovies,
  //   refetch: refetchTrendingMovies,
  // } = useTrendingMovies('day');

  // // Trending TV Shows
  // const {
  //   data: trendingTVShows,
  //   fetchNextPage: fetchNextTrendingTVShows,
  //   hasNextPage: hasNextTrendingTVShows,
  //   isFetchingNextPage: isFetchingTrendingTVShows,
  //   refetch: refetchTrendingTVShows,
  // } = useTrendingTVShows('day');

  // Get a random popular item for the banner
  const featuredItems = useMemo(() => {
    const items: Array<{item: any; type: 'movie' | 'tv'; title: string}> = [];
    const usedMovieIds = new Set<number>();

    const getUniqueMovie = (movieList: any[], title: string) => {
      if (!movieList || movieList.length === 0) return null;

      // Try to find a movie that hasn't been used yet
      const availableMovies = movieList.filter(
        movie => !usedMovieIds.has(movie.id),
      );

      if (availableMovies.length === 0) {
        // If all movies are used, reset and pick from first 10
        usedMovieIds.clear();
        const firstTen = movieList.slice(0, 10);
        const randomIndex = Math.floor(Math.random() * firstTen.length);
        const selectedMovie = firstTen[randomIndex];
        usedMovieIds.add(selectedMovie.id);
        return selectedMovie;
      }

      // Pick a random movie from available ones
      const randomIndex = Math.floor(Math.random() * availableMovies.length);
      const selectedMovie = availableMovies[randomIndex];
      usedMovieIds.add(selectedMovie.id);
      return selectedMovie;
    };

    // Get unique movies for each category
    const latestMovie = getUniqueMovie(
      recentMovies?.pages?.[0]?.results || [],
      'Latest',
    );
    if (latestMovie) {
      items.push({
        item: latestMovie,
        type: 'movie' as const,
        title: 'Latest',
      });
    }

    const popularMovie = getUniqueMovie(
      popularMovies?.pages?.[0]?.results || [],
      'Popular',
    );
    if (popularMovie) {
      items.push({
        item: popularMovie,
        type: 'movie' as const,
        title: 'Popular',
      });
    }

    const topRatedMovie = getUniqueMovie(
      topRatedMovies?.pages?.[0]?.results || [],
      'Top',
    );
    if (topRatedMovie) {
      items.push({
        item: topRatedMovie,
        type: 'movie' as const,
        title: 'Top',
      });
    }

    return items;
  }, [
    recentMovies,
    recentTVShows,
    popularMovies,
    topRatedMovies,
    topRatedTVShows,
  ]);

  const {
    data: top10MoviesTodayByRegion,
    isFetching: isFetchingTop10MoviesTodayByRegion,
  } = useTop10MoviesTodayByRegion();

  const {
    data: top10ShowsTodayByRegion,
    isFetching: isFetchingTop10ShowsTodayByRegion,
  } = useTop10ShowsTodayByRegion();

  useEffect(() => {
    if (top10MoviesTodayByRegion && top10ShowsTodayByRegion) {
      const top10ContentByRegion = [
        ...top10MoviesTodayByRegion.map((movie: Movie) => ({
          ...movie,
          type: 'movie' as const,
        })),
        ...top10ShowsTodayByRegion.map((show: TVShow) => ({
          ...show,
          type: 'tv' as const,
        })),
      ];
      const sortedContent = top10ContentByRegion.sort(
        (a: ContentItem, b: ContentItem) => {
          return b.popularity - a.popularity;
        },
      );
      setTop10ContentByRegion(sortedContent.slice(0, 10));
    }
  }, [top10MoviesTodayByRegion, top10ShowsTodayByRegion]);

  const {data: savedFilters, isLoading: isLoadingSavedFilters} = useQuery({
    queryKey: ['savedFilters'],
    queryFn: () => FiltersManager.getSavedFilters(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  const filterContent = useMemo(() => {
    if (savedFilters && savedFilters?.length > 0) {
      return savedFilters.map(async (filter: SavedFilter) => {
        const data = await searchFilterContent(filter);
        return {
          ...data,
          isLoading: false,
        };
      });
    }
  }, [savedFilters]);

  const handleItemPress = useCallback(
    (item: ContentItem) => {
      if (item.type === 'movie') {
        navigateWithLimit('MovieDetails', {movie: item as unknown as Movie});
      } else {
        navigateWithLimit('TVShowDetails', {show: item as unknown as TVShow});
      }
    },
    [navigateWithLimit],
  );

  const getMoviesFromData = (data: any) =>
    data?.pages.flatMap((page: any) =>
      page.results.map((movie: any) => ({...movie, type: 'movie' as const})),
    ) || [];

  const getTVShowsFromData = (data: any) =>
    data?.pages?.flatMap((page: any) =>
      page.results?.map((show: any) => ({...show, type: 'tv' as const})),
    ) || [];

  const handleSeeAllPress = useCallback(
    (
      title: string,
      categoryType: MovieCategoryType | TVShowCategoryType,
      contentType: ContentType,
    ) => {
      navigateWithLimit('Category', {
        title,
        categoryType,
        contentType,
      });
    },
    [navigateWithLimit],
  );

  const WIDTH = useWindowDimensions().width;
  const {isTablet} = useResponsive();

  // Load mood answers on component mount and when screen comes into focus
  const loadMoodAnswers = useCallback(async () => {
    try {
      const preferences = await AsyncStorage.getItem(
        '@theater_user_preferences',
      );
      if (preferences) {
        const parsed = JSON.parse(preferences);
        if (parsed.moodAnswers) {
          setMoodAnswers(parsed.moodAnswers);
        } else {
          setMoodAnswers(null);
        }
      } else {
        setMoodAnswers(null);
      }
    } catch (error) {
      console.error('Error loading mood answers:', error);
    } finally {
      setMoodLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadMoodAnswers();
  }, [loadMoodAnswers]);

  // Add focus listener to refresh mood data when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadMoodAnswers();
      // No forced remount of MyNextWatch here; it manages its own refresh
    });

    return unsubscribe;
  }, [navigation, loadMoodAnswers]);

  const handleMoodComplete = async (answers: {[key: string]: string}) => {
    try {
      // Clear old data first
      await AsyncStorage.multiRemove([
        '@theater_user_preferences',
        '@theater_user_feedback',
        '@theater_next_watch_onboarding',
      ]);

      // Save fresh mood data
      const preferences = {
        moodAnswers: answers,
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem(
        '@theater_user_preferences',
        JSON.stringify(preferences),
      );
      await AsyncStorage.setItem('@theater_next_watch_onboarding', 'true');

      // Update local state
      setMoodAnswers(answers);

      // Clear AI recommendation cache so next fetch uses new mood
      await cache.clear(CACHE_KEYS.AI_RECOMMENDATION);

      // Reload mood answers from storage to ensure consistency
      await loadMoodAnswers();

      // Invalidate all mood-related queries to force fresh data
      queryClient.invalidateQueries({queryKey: ['mood']});
      queryClient.invalidateQueries({queryKey: ['recommendations']});
      queryClient.invalidateQueries({queryKey: ['userPreferences']});

      // Signal MyNextWatch to refresh due to mood change without remounting
      setMoodVersion(v => v + 1);

      setShowMoodModal(false);
    } catch (error) {
      console.error('Error updating mood preferences:', error);
    }
  };

  const handleMoodCancel = () => {
    setShowMoodModal(false);
  };

  const sections = useMemo(() => {
    const sectionsList = [];

    // Featured banner section
    if (featuredItems.length > 0) {
      sectionsList.push({
        id: 'featured',
        type: 'featured',
        data: featuredItems,
      });
    } else if (
      isFetchingRecentMovies ||
      isFetchingRecentTV ||
      isFetchingPopularMovies ||
      isFetchingTopRatedMovies ||
      isFetchingTopRatedTV
    ) {
      sectionsList.push({
        id: 'featuredSkeleton',
        type: 'featuredSkeleton',
        data: [],
      });
    }

    // Mood setup or My Next Watch section - only if AI is enabled
    if (moodLoaded && isAIEnabled) {
      if (!moodAnswers) {
        // Show mood setup prompt
        sectionsList.push({
          id: 'moodSetup',
          type: 'moodSetup',
        });
      } else {
        // Show My Next Watch with a stable id so it does not remount on every visit
        sectionsList.push({
          id: 'myNextWatch',
          type: 'myNextWatch',
          refreshSignal: moodVersion,
        });
      }
    }

    // Because You Watched section
    sectionsList.push({
      id: 'becauseYouWatched',
      type: 'becauseYouWatched',
      data: [],
    });

    // Recent Movies section
    if (recentMovies?.pages?.[0]?.results?.length) {
      sectionsList.push({
        id: 'recentMovies',
        type: 'horizontalList',
        title: 'Recent Movies',
        data: getMoviesFromData(recentMovies),
        isLoading: isFetchingRecentMovies,
        onEndReached: hasNextRecentMovies ? fetchNextRecentMovies : undefined,
        onSeeAllPress: () =>
          handleSeeAllPress('Recent Movies', 'latest', 'movie'),
      });
    } else if (isFetchingRecentMovies) {
      sectionsList.push({
        id: 'recentMoviesSkeleton',
        type: 'horizontalListSkeleton',
      });
    }

    if (latestMoviesByRegion?.pages?.[0]?.results?.length) {
      sectionsList.push({
        id: 'latestMoviesByRegion',
        type: 'horizontalList',
        title: 'Latest Movies in ' + region?.english_name,
        data: getMoviesFromData(latestMoviesByRegion),
        isLoading: isFetchingLatestMoviesByRegion,
        onEndReached: hasNextLatestMoviesByRegion
          ? fetchNextLatestMoviesByRegion
          : undefined,
        isSeeAll: false,
      });
    } else if (isFetchingLatestMoviesByRegion) {
      sectionsList.push({
        id: 'latestMoviesByRegionSkeleton',
        type: 'horizontalListSkeleton',
      });
    }

    // Latest Shows section
    if (recentTVShows?.pages?.[0]?.results?.length) {
      sectionsList.push({
        id: 'latestShows',
        type: 'horizontalList',
        title: 'Latest Shows',
        data: getTVShowsFromData(recentTVShows),
        isLoading: isFetchingRecentTV,
        onEndReached: hasNextRecentTV ? fetchNextRecentTV : undefined,
        onSeeAllPress: () => handleSeeAllPress('Latest Shows', 'latest', 'tv'),
      });
    } else if (isFetchingRecentTV) {
      sectionsList.push({
        id: 'latestShowsSkeleton',
        type: 'horizontalListSkeleton',
      });
    }

    // Top 10 section
    if (
      isFetchingTop10MoviesTodayByRegion ||
      isFetchingTop10ShowsTodayByRegion
    ) {
      sectionsList.push({
        id: 'top10Skeleton',
        type: 'horizontalListSkeleton',
      });
    } else if (top10ContentByRegion?.length) {
      sectionsList.push({
        id: 'top10',
        type: 'horizontalList',
        title: `Top 10 in ${region ? region?.english_name : 'your region'}`,
        data: top10ContentByRegion,
        isLoading: false,
        isSeeAll: false,
        isTop10: true,
      });
    }

    if (popularMovies?.pages?.[0]?.results?.length) {
      sectionsList.push({
        id: 'popularMovies',
        type: 'horizontalList',
        title: 'Popular Movies',
        data: getMoviesFromData(popularMovies),
        isLoading: isFetchingPopularMovies,
        onEndReached: hasNextPopularMovies ? fetchNextPopularMovies : undefined,
        isSeeAll: true,
      });
    } else if (isFetchingPopularMovies) {
      sectionsList.push({
        id: 'popularMoviesSkeleton',
        type: 'horizontalListSkeleton',
      });
    }

    // Popular Shows section
    if (popularTVShows?.pages?.[0]?.results?.length) {
      sectionsList.push({
        id: 'popularShows',
        type: 'horizontalList',
        title: 'Popular Shows',
        data: getTVShowsFromData(popularTVShows),
        isLoading: isFetchingPopularTV,
        onEndReached: hasNextPopularTV ? fetchNextPopularTV : undefined,
        onSeeAllPress: () =>
          handleSeeAllPress('Popular Shows', 'popular', 'tv'),
      });
    } else if (isFetchingPopularTV) {
      sectionsList.push({
        id: 'popularShowsSkeleton',
        type: 'horizontalListSkeleton',
      });
    }

    // Top Rated Movies section
    if (topRatedMovies?.pages?.[0]?.results?.length) {
      sectionsList.push({
        id: 'topRatedMovies',
        type: 'horizontalList',
        title: 'Top Rated Movies',
        data: getMoviesFromData(topRatedMovies),
        isLoading: isFetchingTopRatedMovies,
        onEndReached: hasNextTopRatedMovies
          ? fetchNextTopRatedMovies
          : undefined,
        onSeeAllPress: () =>
          handleSeeAllPress('Top Rated Movies', 'top_rated', 'movie'),
      });
    } else if (isFetchingTopRatedMovies) {
      sectionsList.push({
        id: 'topRatedMoviesSkeleton',
        type: 'horizontalListSkeleton',
      });
    }

    // Top Rated TV Shows section
    if (topRatedTVShows?.pages?.[0]?.results?.length) {
      sectionsList.push({
        id: 'topRatedTVShows',
        type: 'horizontalList',
        title: 'Top Rated TV Shows',
        data: getTVShowsFromData(topRatedTVShows),
        isLoading: isFetchingTopRatedTV,
        onEndReached: hasNextTopRatedTV ? fetchNextTopRatedTV : undefined,
        onSeeAllPress: () =>
          handleSeeAllPress('Top Rated TV Shows', 'top_rated', 'tv'),
      });
    } else if (isFetchingTopRatedTV) {
      sectionsList.push({
        id: 'topRatedTVShowsSkeleton',
        type: 'horizontalListSkeleton',
      });
    }

    // Upcoming Movies section
    if (upcomingMovies?.pages?.[0]?.results?.length) {
      sectionsList.push({
        id: 'upcomingMovies',
        type: 'horizontalList',
        title: 'Upcoming Movies',
        data: getMoviesFromData(upcomingMovies),
        isLoading: isFetchingUpcomingMovies,
        onEndReached: hasNextUpcomingMovies
          ? fetchNextUpcomingMovies
          : undefined,
        onSeeAllPress: () =>
          handleSeeAllPress('Upcoming Movies', 'upcoming', 'movie'),
      });
    } else if (isFetchingUpcomingMovies) {
      sectionsList.push({
        id: 'upcomingMoviesSkeleton',
        type: 'horizontalListSkeleton',
      });
    }

    if (upcomingMoviesByRegion?.pages?.[0]?.results?.length) {
      sectionsList.push({
        id: 'upcomingMoviesByRegion',
        type: 'horizontalList',
        title: 'Upcoming Movies in ' + region?.english_name,
        data: getMoviesFromData(upcomingMoviesByRegion),
        isLoading: isFetchingUpcomingMoviesByRegion,
        onEndReached: hasNextUpcomingMoviesByRegion
          ? fetchNextUpcomingMoviesByRegion
          : undefined,
        isSeeAll: true,
      });
    } else if (isFetchingUpcomingMoviesByRegion) {
      sectionsList.push({
        id: 'upcomingMoviesByRegionSkeleton',
        type: 'horizontalListSkeleton',
      });
    }

    // Saved Filters section
    if (!isLoadingSavedFilters && savedFilters && savedFilters.length > 0) {
      sectionsList.push({
        id: 'savedFilters',
        type: 'savedFilters',
        data: savedFilters,
      });
    }

    return sectionsList;
  }, [
    featuredItems,
    renderPhase,
    recentMovies,
    latestMoviesByRegion,
    recentTVShows,
    showMoreContent,
    top10ContentByRegion,
    popularTVShows,
    topRatedMovies,
    topRatedTVShows,
    upcomingMovies,
    savedFilters,
    isLoadingSavedFilters,
    isFetchingRecentMovies,
    isFetchingRecentTV,
    isFetchingPopularTV,
    isFetchingTopRatedMovies,
    isFetchingTopRatedTV,
    isFetchingUpcomingMovies,
    hasNextRecentMovies,
    hasNextRecentTV,
    hasNextPopularTV,
    hasNextTopRatedMovies,
    hasNextTopRatedTV,
    hasNextUpcomingMovies,
    fetchNextRecentMovies,
    fetchNextRecentTV,
    fetchNextPopularTV,
    fetchNextTopRatedMovies,
    fetchNextTopRatedTV,
    fetchNextUpcomingMovies,
    handleSeeAllPress,
    moodLoaded,
    moodAnswers,
    isAIEnabled,
    moodVersion,
  ]);

  // Render all sections without batching

  const onUpdateMoodCb = useCallback(() => setShowMoodModal(true), []);

  const renderSection = useCallback(
    ({item}: {item: any}) => {
      switch (item.type) {
        case 'featured':
          return <FeaturedBannerHome items={item.data} />;

        case 'featuredSkeleton':
          return <BannerHomeSkeleton />;

        case 'myNextWatch':
          return (
            <MyNextWatch
              onUpdateMood={onUpdateMoodCb}
              refreshSignal={item.refreshSignal}
            />
          );

        case 'moodSetup':
          return (
            <View
              style={{
                padding: spacing.md,
                borderRadius: borderRadius.lg,
                maxWidth: 600,
                alignSelf: 'center',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 20,
                width: '100%',
                marginHorizontal: spacing.lg,
                marginTop: spacing.xl,
                marginBottom: spacing.lg,
                flex: isTablet ? 1 : 0,
              }}>
              <View
                style={{
                  padding: spacing.md,
                  borderWidth: 1,
                  borderBottomWidth: 0,
                  borderColor: colors.modal.border,
                  borderRadius: borderRadius.lg,
                  maxWidth: 600,
                  alignSelf: 'center',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 20,
                  flex: 1,
                  width: '100%',
                }}>
                <LinearGradient
                  colors={[
                    'transparent',
                    colors.background.primary,
                    colors.background.primary,
                  ]}
                  pointerEvents="none"
                  style={{
                    width: '250%',
                    height: '170%',
                    position: 'absolute',
                    bottom: isTablet ? -5 : -30,
                    left: -250,
                    zIndex: 0,
                    transform: [{rotate: '-5deg'}],
                  }}
                  start={{x: 0, y: 0}}
                  end={{x: 0, y: 1}}
                />
                <View
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}>
                  <FastImage
                    source={require('../assets/theater.webp')}
                    style={{width: 60, height: 60}}
                  />
                  <View>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: 400,
                        color: 'rgb(255, 240, 253)',
                      }}>
                      My Next Watch
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: 400,
                        color: 'rgba(198, 150, 215, 0.87)',
                      }}>
                      How are you feeling today?
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setShowMoodModal(true)}>
                  <LinearGradient
                    colors={[colors.primary, colors.secondary]}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 0}}
                    style={{
                      padding: 10,
                      paddingHorizontal: 25,
                      borderRadius: 50,
                      marginTop: 15,
                      alignItems: 'center',
                    }}>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: colors.text.primary,
                      }}>
                      Get Started
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          );

        case 'becauseYouWatched':
          return <BecauseYouWatched />;

        case 'horizontalList':
          return (
            <HorizontalList
              key={item.id}
              title={item.title}
              data={item.data}
              onItemPress={handleItemPress}
              isLoading={item.isLoading}
              onEndReached={item.onEndReached}
              onSeeAllPress={item.onSeeAllPress}
              isSeeAll={item.isSeeAll}
              isTop10={item.isTop10}
            />
          );

        case 'horizontalListSkeleton':
          return (
            <View style={{marginBottom: 32}}>
              <View style={{alignItems: 'center', marginBottom: 12}}>
                <HeadingSkeleton />
              </View>
              <HorizontalListSkeleton />
            </View>
          );

        case 'savedFilters':
          return (
            <View style={{marginTop: spacing.xxl}}>
              <View style={styles.heading}>
                <LinearGradient
                  colors={['transparent', colors.background.primary]}
                  start={{x: 0.5, y: 0}}
                  end={{x: 0.5, y: 1}}
                  style={[styles.gradient, {height: isTablet ? 200 : 100}]}
                />
                <Text style={styles.headingText}>My Filters</Text>
              </View>
              {item.data?.map((filter: SavedFilter) => (
                <HomeFilterRow key={filter.id} savedFilter={filter} />
              ))}
            </View>
          );

        default:
          return null;
      }
    },
    [handleItemPress, onUpdateMoodCb],
  );

  const keyExtractor = useCallback((item: any) => item.id, []);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.primary,
    },
    skeletonContainer: {
      width: WIDTH - 64,
      height: 520,
      alignSelf: 'center',
      borderRadius: 50,
      // marginBottom: spacing.xl,
      marginTop: spacing.xxl,
    },
    heading: {
      position: 'relative',
      // marginBottom: -50,
    },
    gradient: {
      position: 'absolute',
      left: 0,
      bottom: 0,
      height: 80,
      width: '100%',
      zIndex: 0,
    },
    headingText: {
      fontSize: WIDTH / 6,
      fontWeight: '900',
      color: colors.text.tertiary,
      marginVertical: spacing.md,
      textAlign: 'center',
      opacity: 0.3,
      zIndex: -1,
      fontFamily: 'Inter 28pt Black',
    },
  });

  const moodSetupStyles = StyleSheet.create({
    container: {
      marginHorizontal: spacing.lg,
      marginTop: spacing.xl,
      marginBottom: spacing.lg,
    },
    content: {
      backgroundColor: colors.background.secondary,
      borderRadius: 20,
      padding: spacing.lg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    icon: {
      width: 60,
      height: 60,
      marginRight: spacing.md,
    },
    title: {
      fontSize: 14,
      fontWeight: '400',
      color: 'rgb(255, 240, 253)',
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 12,
      fontWeight: '400',
      color: 'rgba(198, 150, 215, 0.87)',
      flexShrink: 1,
    },
    buttonContainer: {
      alignSelf: 'flex-end',
    },
    button: {
      padding: 10,
      paddingHorizontal: 25,
      borderRadius: 50,
      alignItems: 'center',
    },
    buttonText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text.primary,
    },
  });

  const modalStyles = StyleSheet.create({
    container: {
      flex: 1,
    },
  });

  useEffect(() => {
    const handleSettingsChange = () => {
      queryClient.invalidateQueries({queryKey: ['movies']});
      queryClient.invalidateQueries({queryKey: ['tvshows']});
      queryClient.invalidateQueries({queryKey: ['discover_movies']});
      queryClient.invalidateQueries({queryKey: ['discover_tv']});
      queryClient.invalidateQueries({
        queryKey: ['top_10_movies_today_by_region'],
      });
      queryClient.invalidateQueries({
        queryKey: ['top_10_shows_today_by_region'],
      });
    };
    SettingsManager.addChangeListener(handleSettingsChange);
    return () => {
      SettingsManager.removeChangeListener(handleSettingsChange);
    };
  }, [queryClient]);

  const isFullScreenLoading =
    !featuredItems.length ||
    !recentMovies?.pages?.[0]?.results?.length ||
    !recentTVShows?.pages?.[0]?.results?.length;

  if (isFullScreenLoading) {
    return (
      <View style={styles.container}>
        <View style={{marginTop: 24, marginBottom: 5}}>
          <BannerHomeSkeleton />
        </View>
        {[...Array(3)].map((_, i) => (
          <View key={i} style={{marginBottom: spacing.md}}>
            <HeadingSkeleton />
            <HorizontalListSkeleton />
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* <PerformanceMonitor screenName="Home" /> */}
      <FlatList
        data={sections}
        renderItem={renderSection}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingBottom: 100}}
        removeClippedSubviews={true}
        windowSize={7}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
      />

      {/* Mood Questionnaire Modal */}
      <Modal
        visible={showMoodModal}
        animationType="slide"
        presentationStyle="pageSheet"
        navigationBarTranslucent={true}
        statusBarTranslucent={true}
        transparent={true}
        onRequestClose={() => setShowMoodModal(false)}>
        <BlurView
          style={{
            flex: 1,
            marginTop: 80,
          }}
          blurType="dark"
          blurAmount={10}>
          <View
            style={[
              modalStyles.container,
              {
                backgroundColor: colors.modal.blurDark,
                borderTopStartRadius: borderRadius.xl,
                borderTopEndRadius: borderRadius.xl,
              },
            ]}>
            <MoodQuestionnaire
              onComplete={answers => {
                // Use the centralized handler that persists, invalidates queries,
                // refreshes MyNextWatch and closes the modal.
                handleMoodComplete(answers);
              }}
              onCancel={() => setShowMoodModal(false)}
            />
          </View>
        </BlurView>
      </Modal>
    </View>
  );
});
