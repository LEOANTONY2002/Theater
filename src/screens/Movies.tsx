import React, {useCallback, useMemo, useEffect, useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {FlashList} from '@shopify/flash-list';
import {
  useMoviesList,
  useTop10MoviesTodayByRegion,
  useDiscoverMovies,
} from '../hooks/useMovies';
import {Movie} from '../types/movie';
import {useNavigation} from '@react-navigation/native';
import {HorizontalList} from '../components/HorizontalList';
import {FeaturedBanner} from '../components/FeaturedBanner';
import {ContentItem} from '../components/MovieList';
import {RootStackParamList, MovieCategoryType} from '../types/navigation';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {colors, spacing, typography} from '../styles/theme';
import {
  BannerSkeleton,
  GenreListSkeleton,
  HeadingSkeleton,
  HorizontalListSkeleton,
} from '../components/LoadingSkeleton';
import {getGenres} from '../services/tmdb';
import {Genre} from '../types/movie';
import {useRegion} from '../hooks/useApp';
import {TVShow} from '../types/tvshow';
import {HorizontalGenreList} from '../components/HorizontalGenreList';
import {useNavigationState} from '../hooks/useNavigationState';

type MoviesScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const MoviesScreen = () => {
  const {data: region} = useRegion();
  const navigation = useNavigation<MoviesScreenNavigationProp>();
  const {navigateWithLimit} = useNavigationState();
  const [genres, setGenres] = useState<Genre[]>([]);
  const [isLoadingGenres, setIsLoadingGenres] = useState(true);
  const [renderPhase, setRenderPhase] = useState(0);

  // Staggered loading to reduce initial render load
  useEffect(() => {
    const timer1 = setTimeout(() => setRenderPhase(1), 100);
    const timer2 = setTimeout(() => setRenderPhase(2), 300);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  useEffect(() => {
    const loadGenres = async () => {
      try {
        const movieGenres = await getGenres('movie');
        setGenres(movieGenres);
        setIsLoadingGenres(false);
      } catch (error) {
        console.error('Error loading genres:', error);
        setIsLoadingGenres(false);
      }
    };
    loadGenres();
  }, []);

  // Recent Movies (Now Playing)
  const {
    data: recentMovies,
    fetchNextPage: fetchNextRecent,
    hasNextPage: hasNextRecent,
    isFetchingNextPage: isFetchingRecent,
  } = useMoviesList('latest');

  // Popular Movies
  const {
    data: popularMovies,
    fetchNextPage: fetchNextPopular,
    hasNextPage: hasNextPopular,
    isFetchingNextPage: isFetchingPopular,
  } = useMoviesList('popular');

  // Top Rated Movies
  const {
    data: topRatedMovies,
    fetchNextPage: fetchNextTopRated,
    hasNextPage: hasNextTopRated,
    isFetchingNextPage: isFetchingTopRated,
  } = useMoviesList('top_rated');

  // Now Playing Movies
  const {
    data: nowPlayingMovies,
    fetchNextPage: fetchNextNowPlaying,
    hasNextPage: hasNextNowPlaying,
    isFetchingNextPage: isFetchingNowPlaying,
  } = useMoviesList('now_playing');

  // Upcoming Movies
  const {
    data: upcomingMovies,
    fetchNextPage: fetchNextUpcoming,
    hasNextPage: hasNextUpcoming,
    isFetchingNextPage: isFetchingUpcoming,
  } = useMoviesList('upcoming');

  // Genre IDs
  const kidsGenreId = 16;
  const familyGenreId = 10751;
  const comedyGenreId = 35;
  const romanceGenreId = 10749;
  const actionGenreId = 28;

  const {
    data: kidsMovies,
    fetchNextPage: fetchNextKids,
    hasNextPage: hasNextKids,
    isFetchingNextPage: isFetchingKids,
  } = useDiscoverMovies({
    with_genres: kidsGenreId.toString(),
  });

  const {
    data: familyMovies,
    fetchNextPage: fetchNextFamily,
    hasNextPage: hasNextFamily,
    isFetchingNextPage: isFetchingFamily,
  } = useDiscoverMovies({
    with_genres: familyGenreId.toString(),
  });

  const {
    data: comedyMovies,
    fetchNextPage: fetchNextComedy,
    hasNextPage: hasNextComedy,
    isFetchingNextPage: isFetchingComedy,
  } = useDiscoverMovies({
    with_genres: comedyGenreId.toString(),
  });

  const {
    data: romanceMovies,
    fetchNextPage: fetchNextRomance,
    hasNextPage: hasNextRomance,
    isFetchingNextPage: isFetchingRomance,
  } = useDiscoverMovies({
    with_genres: romanceGenreId.toString(),
  });

  const {
    data: actionMovies,
    fetchNextPage: fetchNextAction,
    hasNextPage: hasNextAction,
    isFetchingNextPage: isFetchingAction,
  } = useDiscoverMovies({
    with_genres: actionGenreId.toString(),
  });

  const {
    data: top10MoviesTodayByRegion,
    isFetching: isFetchingTop10MoviesTodayByRegion,
  } = useTop10MoviesTodayByRegion();

  const top10MoviesTodayByRegionData = useMemo(() => {
    return top10MoviesTodayByRegion || [];
  }, [top10MoviesTodayByRegion]);

  // Get a random popular movie for the banner
  const featuredMovie = useMemo(() => {
    if (!recentMovies?.pages?.[0]?.results) return null;
    const movies = recentMovies.pages[0].results;
    const randomIndex = Math.floor(Math.random() * Math.min(movies.length, 5));
    return movies[randomIndex];
  }, [recentMovies]);

  const handleFeaturedPress = useCallback(() => {
    if (featuredMovie) {
      navigateWithLimit('MovieDetails', {movie: featuredMovie});
    }
  }, [navigateWithLimit, featuredMovie]);

  const handleMoviePress = useCallback(
    (item: ContentItem) => {
      if (item.type !== 'tv') {
        navigateWithLimit('MovieDetails', {movie: item as Movie});
      } else {
        navigateWithLimit('TVShowDetails', {tv: item as TVShow});
      }
    },
    [navigateWithLimit],
  );

  const getMoviesFromData = (data: any) =>
    data?.pages.flatMap((page: any) =>
      page.results.map((movie: any) => ({...movie, type: 'movie' as const})),
    ) || [];

  const handleSeeAllPress = useCallback(
    (title: string, categoryType: MovieCategoryType) => {
      navigateWithLimit('Category', {
        title,
        categoryType,
        contentType: 'movie',
      });
    },
    [navigateWithLimit],
  );

  const handleGenrePress = (genre: Genre) => {
    navigateWithLimit('Genre', {
      genreId: genre.id,
      genreName: genre.name,
      contentType: 'movie',
    });
  };

  // Create sections for FlashList
  const sections = useMemo(() => {
    const sectionsList = [];

    // Featured banner section
    if (featuredMovie) {
      sectionsList.push({
        id: 'featured',
        type: 'featured',
        data: featuredMovie,
      });
    } else if (isFetchingRecent) {
      sectionsList.push({
        id: 'featuredSkeleton',
        type: 'featuredSkeleton',
        data: null,
      });
    }

    // Genres section
    sectionsList.push({
      id: 'genres',
      type: 'genres',
      data: genres,
      isLoading: isLoadingGenres,
      onItemPress: handleGenrePress,
    });

    // Recent Movies section
    if (renderPhase >= 1 && recentMovies?.pages?.[0]?.results?.length) {
      sectionsList.push({
        id: 'recentMovies',
        type: 'horizontalList',
        title: 'Recent Movies',
        data: getMoviesFromData(recentMovies),
        onItemPress: handleMoviePress,
        onEndReached: hasNextRecent ? fetchNextRecent : undefined,
        isLoading: isFetchingRecent,
        onSeeAllPress: () => handleSeeAllPress('Recent Movies', 'latest'),
      });
    } else if (isFetchingRecent) {
      sectionsList.push({
        id: 'recentMoviesSkeleton',
        type: 'horizontalListSkeleton',
      });
    }

    // Popular Movies section
    if (renderPhase >= 2 && popularMovies?.pages?.[0]?.results?.length) {
      sectionsList.push({
        id: 'popularMovies',
        type: 'horizontalList',
        title: 'Popular Movies',
        data: getMoviesFromData(popularMovies),
        onItemPress: handleMoviePress,
        onEndReached: hasNextPopular ? fetchNextPopular : undefined,
        isLoading: isFetchingPopular,
        onSeeAllPress: () => handleSeeAllPress('Popular Movies', 'popular'),
      });
    } else if (isFetchingPopular) {
      sectionsList.push({
        id: 'popularMoviesSkeleton',
        type: 'horizontalListSkeleton',
      });
    }

    // Top Rated Movies section
    if (renderPhase >= 1 && topRatedMovies?.pages?.[0]?.results?.length) {
      sectionsList.push({
        id: 'topRatedMovies',
        type: 'horizontalList',
        title: 'Top Rated Movies',
        data: getMoviesFromData(topRatedMovies),
        onItemPress: handleMoviePress,
        onEndReached: hasNextTopRated ? fetchNextTopRated : undefined,
        isLoading: isFetchingTopRated,
        onSeeAllPress: () => handleSeeAllPress('Top Rated Movies', 'top_rated'),
      });
    } else if (isFetchingTopRated) {
      sectionsList.push({
        id: 'topRatedMoviesSkeleton',
        type: 'horizontalListSkeleton',
      });
    }

    // Now Playing section
    if (renderPhase >= 2 && nowPlayingMovies?.pages?.[0]?.results?.length) {
      sectionsList.push({
        id: 'nowPlaying',
        type: 'horizontalList',
        title: 'Now Playing',
        data: getMoviesFromData(nowPlayingMovies),
        onItemPress: handleMoviePress,
        onEndReached: hasNextNowPlaying ? fetchNextNowPlaying : undefined,
        isLoading: isFetchingNowPlaying,
        onSeeAllPress: () => handleSeeAllPress('Now Playing', 'now_playing'),
      });
    } else if (isFetchingNowPlaying) {
      sectionsList.push({
        id: 'nowPlayingSkeleton',
        type: 'horizontalListSkeleton',
      });
    }

    // Upcoming Movies section
    if (renderPhase >= 2 && upcomingMovies?.pages?.[0]?.results?.length) {
      sectionsList.push({
        id: 'upcomingMovies',
        type: 'horizontalList',
        title: 'Upcoming Movies',
        data: getMoviesFromData(upcomingMovies),
        onItemPress: handleMoviePress,
        onEndReached: hasNextUpcoming ? fetchNextUpcoming : undefined,
        isLoading: isFetchingUpcoming,
        onSeeAllPress: () => handleSeeAllPress('Upcoming Movies', 'upcoming'),
      });
    } else if (isFetchingUpcoming) {
      sectionsList.push({
        id: 'upcomingMoviesSkeleton',
        type: 'horizontalListSkeleton',
      });
    }

    // Top 10 section
    if (isFetchingTop10MoviesTodayByRegion) {
      sectionsList.push({
        id: 'top10Skeleton',
        type: 'horizontalListSkeleton',
      });
    } else if (top10MoviesTodayByRegionData?.length) {
      sectionsList.push({
        id: 'top10',
        type: 'horizontalList',
        title: `Top 10 in ${region?.english_name}`,
        data: top10MoviesTodayByRegionData,
        isLoading: false,
        onItemPress: handleMoviePress,
        isSeeAll: false,
        isTop10: true,
      });
    }

    // Kids Movies
    if (kidsMovies?.pages?.[0]?.results?.length) {
      sectionsList.push({
        id: 'kidsMovies',
        type: 'horizontalList',
        title: 'Kids',
        data: getMoviesFromData(kidsMovies).filter(
          (movie: any) => !movie.adult,
        ),
        onItemPress: handleMoviePress,
        onEndReached: hasNextKids ? fetchNextKids : undefined,
        isLoading: isFetchingKids,
        onSeeAllPress: () =>
          navigateWithLimit('Category', {
            title: 'Kids',
            contentType: 'movie',
            filter: {with_genres: kidsGenreId.toString()},
          }),
      });
    }
    // Family Movies
    if (familyMovies?.pages?.[0]?.results?.length) {
      sectionsList.push({
        id: 'familyMovies',
        type: 'horizontalList',
        title: 'Family',
        data: getMoviesFromData(familyMovies).filter(
          (movie: any) => !movie.adult,
        ),
        onItemPress: handleMoviePress,
        onEndReached: hasNextFamily ? fetchNextFamily : undefined,
        isLoading: isFetchingFamily,
        onSeeAllPress: () =>
          navigateWithLimit('Category', {
            title: 'Family',
            contentType: 'movie',
            filter: {with_genres: familyGenreId.toString()},
          }),
      });
    }
    // Comedy Movies
    if (comedyMovies?.pages?.[0]?.results?.length) {
      sectionsList.push({
        id: 'comedyMovies',
        type: 'horizontalList',
        title: 'Comedy',
        data: getMoviesFromData(comedyMovies).filter(
          (movie: any) => !movie.adult,
        ),
        onItemPress: handleMoviePress,
        onEndReached: hasNextComedy ? fetchNextComedy : undefined,
        isLoading: isFetchingComedy,
        onSeeAllPress: () =>
          navigateWithLimit('Category', {
            title: 'Comedy',
            contentType: 'movie',
            filter: {with_genres: comedyGenreId.toString()},
          }),
      });
    }
    // Romance Movies
    // if (romanceMovies?.pages?.[0]?.results?.length) {
    //   sectionsList.push({
    //     id: 'romanceMovies',
    //     type: 'horizontalList',
    //     title: 'Romance',
    //     data: getMoviesFromData(romanceMovies).filter(
    //       (movie: any) => !movie.adult,
    //     ),
    //     onItemPress: handleMoviePress,
    //     onEndReached: hasNextRomance ? fetchNextRomance : undefined,
    //     isLoading: isFetchingRomance,
    //     onSeeAllPress: () =>
    //       navigateWithLimit('Category', {
    //         title: 'Romance',
    //         contentType: 'movie',
    //         filter: {with_genres: romanceGenreId.toString()},
    //       }),
    //   });
    // }
    // Action Movies
    if (actionMovies?.pages?.[0]?.results?.length) {
      sectionsList.push({
        id: 'actionMovies',
        type: 'horizontalList',
        title: 'Action',
        data: getMoviesFromData(actionMovies).filter(
          (movie: any) => !movie.adult,
        ),
        onItemPress: handleMoviePress,
        onEndReached: hasNextAction ? fetchNextAction : undefined,
        isLoading: isFetchingAction,
        onSeeAllPress: () =>
          navigateWithLimit('Category', {
            title: 'Action',
            contentType: 'movie',
            filter: {with_genres: actionGenreId.toString()},
          }),
      });
    }

    return sectionsList;
  }, [
    featuredMovie,
    genres,
    isLoadingGenres,
    renderPhase,
    recentMovies,
    popularMovies,
    topRatedMovies,
    nowPlayingMovies,
    upcomingMovies,
    top10MoviesTodayByRegionData,
    region,
    handleGenrePress,
    handleMoviePress,
    handleSeeAllPress,
    isFetchingRecent,
    isFetchingPopular,
    isFetchingTopRated,
    isFetchingNowPlaying,
    isFetchingUpcoming,
    isFetchingTop10MoviesTodayByRegion,
    hasNextRecent,
    hasNextPopular,
    hasNextTopRated,
    hasNextNowPlaying,
    hasNextUpcoming,
    fetchNextRecent,
    fetchNextPopular,
    fetchNextTopRated,
    fetchNextNowPlaying,
    fetchNextUpcoming,
    kidsMovies,
    isFetchingKids,
    hasNextKids,
    fetchNextKids,
    familyMovies,
    isFetchingFamily,
    hasNextFamily,
    fetchNextFamily,
    comedyMovies,
    isFetchingComedy,
    hasNextComedy,
    fetchNextComedy,
    romanceMovies,
    isFetchingRomance,
    hasNextRomance,
    fetchNextRomance,
    actionMovies,
    isFetchingAction,
    hasNextAction,
    fetchNextAction,
  ]);

  const renderSection = useCallback(({item}: {item: any}) => {
    switch (item.type) {
      case 'featured':
        return <FeaturedBanner item={item.data} type="movie" />;

      case 'featuredSkeleton':
        return (
          <View style={{width: '100%', height: 580, alignSelf: 'center'}}>
            <BannerSkeleton />
          </View>
        );

      case 'genres':
        return (
          <HorizontalGenreList
            title="Genres"
            data={item.data}
            onItemPress={item.onItemPress}
            isLoading={item.isLoading}
          />
        );

      case 'horizontalList':
        return (
          <HorizontalList
            title={item.title}
            data={item.data}
            onItemPress={item.onItemPress}
            onEndReached={item.onEndReached}
            isLoading={item.isLoading}
            onSeeAllPress={item.onSeeAllPress}
            isSeeAll={item.isSeeAll}
            isTop10={item.isTop10}
          />
        );

      default:
        return null;
    }
  }, []);

  const keyExtractor = useCallback((item: any) => item.id, []);

  const isInitialLoading =
    (!popularMovies?.pages?.length && isFetchingPopular) ||
    (!topRatedMovies?.pages?.length && isFetchingTopRated) ||
    (!recentMovies?.pages?.length && isFetchingRecent) ||
    (!upcomingMovies?.pages?.length && isFetchingUpcoming);

  if (isInitialLoading) {
    return (
      <View style={styles.container}>
        <BannerSkeleton />
        <HeadingSkeleton />
        <GenreListSkeleton />
        <HeadingSkeleton />
        <HorizontalListSkeleton />
        <HeadingSkeleton />
        <HorizontalListSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlashList
        data={sections}
        renderItem={renderSection}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingBottom: 100}}
        estimatedItemSize={300}
        // FlashList optimizations
        removeClippedSubviews={true}
        // Scroll optimizations
        scrollEventThrottle={16}
        decelerationRate="normal"
        // Performance optimizations
        extraData={null}
        onScrollBeginDrag={() => {}}
        onScrollEndDrag={() => {}}
        onMomentumScrollEnd={() => {}}
        // Memory management
        disableIntervalMomentum={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: colors.text.primary,
    ...typography.h2,
  },
  genreList: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  genreItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.secondary,
    borderRadius: 20,
    marginRight: spacing.sm,
  },
  genreText: {
    ...typography.body2,
    color: colors.text.primary,
  },
});
