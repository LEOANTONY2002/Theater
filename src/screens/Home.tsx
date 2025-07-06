import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {View, FlatList, StyleSheet, Dimensions, Text} from 'react-native';
import {
  useMoviesList,
  useTop10MoviesTodayByRegion,
  useTrendingMovies,
} from '../hooks/useMovies';
import {
  useTop10ShowsTodayByRegion,
  useTrendingTVShows,
  useTVShowsList,
} from '../hooks/useTVShows';
import {ContentItem} from '../components/MovieList';
import {HorizontalList} from '../components/HorizontalList';
import {useNavigation} from '@react-navigation/native';
import {Movie} from '../types/movie';
import {TVShow} from '../types/tvshow';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {
  HomeStackParamList,
  MovieCategoryType,
  TVShowCategoryType,
  ContentType,
} from '../types/navigation';
import {colors, spacing, typography} from '../styles/theme';
import {
  BannerHomeSkeleton,
  HeadingSkeleton,
  HorizontalListSkeleton,
  HomeScreenSkeleton,
} from '../components/LoadingSkeleton';
import {FeaturedBannerHome} from '../components/FeaturedBannerHome';
import {useRegion, useSavedFilterContent} from '../hooks/useApp';
import {HomeFilterCard} from '../components/HomeFilterCard';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {FiltersManager} from '../store/filters';
import {SavedFilter} from '../types/filters';
import {searchFilterContent} from '../services/tmdb';
import {HomeFilterRow} from '../components/HomeFilterRow';
import {useNavigationState} from '../hooks/useNavigationState';
import {PerformanceMonitor} from '../components/PerformanceMonitor';
import {useScrollOptimization} from '../hooks/useScrollOptimization';
import LinearGradient from 'react-native-linear-gradient';
import {SettingsManager} from '../store/settings';

type HomeScreenNavigationProp = NativeStackNavigationProp<HomeStackParamList>;

export const HomeScreen = () => {
  const {data: region} = useRegion();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const {navigateWithLimit} = useNavigationState();
  const {
    handleScroll,
    handleScrollBeginDrag,
    handleScrollEndDrag,
    handleMomentumScrollEnd,
  } = useScrollOptimization();
  const [top10ContentByRegion, setTop10ContentByRegion] = useState<
    ContentItem[]
  >([]);
  const [renderPhase, setRenderPhase] = useState(0);
  const [showMoreContent, setShowMoreContent] = useState(false);
  const queryClient = useQueryClient();

  // Ultra-aggressive staggered loading to prevent FPS drops
  useEffect(() => {
    const timer1 = setTimeout(() => setRenderPhase(1), 500);
    const timer2 = setTimeout(() => setRenderPhase(2), 1000);
    const timer3 = setTimeout(() => setShowMoreContent(true), 2000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

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
    const randomIndex = Math.floor(Math.random() * Math.min(items.length, 5));

    if (recentMovies?.pages?.[0]?.results) {
      items.push({
        item: recentMovies.pages[0].results[randomIndex],
        type: 'movie' as const,
        title: 'Latest',
      });
    }
    // if (recentTVShows?.pages?.[0]?.results) {
    //   items.push({
    //     item: recentTVShows.pages[0].results[randomIndex],
    //     type: 'tv' as const,
    //     title: 'Recent Shows',
    //   });
    // }
    if (popularMovies?.pages?.[0]?.results) {
      items.push({
        item: popularMovies.pages[0].results[randomIndex],
        type: 'movie' as const,
        title: 'Popular',
      });
    }
    if (topRatedMovies?.pages?.[0]?.results) {
      items.push({
        item: topRatedMovies.pages[0].results[randomIndex],
        type: 'movie' as const,
        title: 'Top',
      });
    }
    // if (topRatedTVShows?.pages?.[0]?.results) {
    //   items.push({
    //     item: topRatedTVShows.pages[0].results[randomIndex],
    //     type: 'tv' as const,
    //     title: 'Top Rated TV Shows',
    //   });
    // }
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

  const WIDTH = Dimensions.get('window').width;

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

    // Recent Movies section
    if (renderPhase >= 1 && recentMovies?.pages?.[0]?.results?.length) {
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

    // Latest Shows section
    if (renderPhase >= 2 && recentTVShows?.pages?.[0]?.results?.length) {
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

    // Additional content sections
    if (showMoreContent) {
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

      // Popular Shows section
      if (isFetchingPopularTV) {
        sectionsList.push({
          id: 'popularShowsSkeleton',
          type: 'horizontalListSkeleton',
        });
      } else if (popularTVShows?.pages?.[0]?.results?.length) {
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
  ]);

  const renderSection = useCallback(
    ({item}: {item: any}) => {
      switch (item.type) {
        case 'featured':
          return <FeaturedBannerHome items={item.data} />;

        case 'featuredSkeleton':
          return (
            <View style={styles.skeletonContainer}>
              <BannerHomeSkeleton />
            </View>
          );

        case 'horizontalList':
          return (
            <HorizontalList
              title={item.title}
              data={item.data}
              isLoading={item.isLoading}
              onItemPress={handleItemPress}
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
                  style={styles.gradient}
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
    [handleItemPress],
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
        <View style={{marginTop: 24, marginBottom: 24}}>
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
      <PerformanceMonitor screenName="Home" />
      <FlatList
        data={sections}
        renderItem={renderSection}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingBottom: 100}}
        // Optimized settings to prevent jumping
        removeClippedSubviews={false}
        maxToRenderPerBatch={3}
        windowSize={5}
        initialNumToRender={3}
        updateCellsBatchingPeriod={100}
        disableVirtualization={false}
        // Scroll optimizations
        scrollEventThrottle={0}
        decelerationRate="normal"
        // Performance optimizations
        extraData={null}
        // Memory management
        legacyImplementation={false}
        disableIntervalMomentum={false}
      />
    </View>
  );
};
