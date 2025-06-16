import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {View, ScrollView, StyleSheet, Dimensions} from 'react-native';
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
import {colors, spacing} from '../styles/theme';
import {
  BannerHomeSkeleton,
  HeadingSkeleton,
  HorizontalListSkeleton,
} from '../components/LoadingSkeleton';
import {FeaturedBannerHome} from '../components/FeaturedBannerHome';
import {useRegion} from '../hooks/useApp';
import {HomeFilterCard} from '../components/HomeFilterCard';
import {useQuery} from '@tanstack/react-query';
import {FiltersManager} from '../store/filters';

type HomeScreenNavigationProp = NativeStackNavigationProp<HomeStackParamList>;

export const HomeScreen = () => {
  const {data: region} = useRegion();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [top10ContentByRegion, setTop10ContentByRegion] = useState<
    ContentItem[]
  >([]);

  const {data: savedFilters} = useQuery({
    queryKey: ['savedFilters'],
    queryFn: () => FiltersManager.getSavedFilters(),
  });

  const {
    data: popularMovies,
    fetchNextPage: fetchNextPopular,
    hasNextPage: hasNextPopular,
    isFetchingNextPage: isFetchingPopular,
    refetch: refetchPopular,
  } = useMoviesList('popular');

  const {
    data: topRatedMovies,
    fetchNextPage: fetchNextTopRated,
    hasNextPage: hasNextTopRated,
    isFetchingNextPage: isFetchingTopRated,
    refetch: refetchTopRated,
  } = useMoviesList('top_rated');

  const {
    data: upcomingMovies,
    fetchNextPage: fetchNextUpcoming,
    hasNextPage: hasNextUpcoming,
    isFetchingNextPage: isFetchingUpcoming,
    refetch: refetchUpcoming,
  } = useMoviesList('upcoming');

  const {
    data: popularTVShows,
    fetchNextPage: fetchNextPopularTV,
    hasNextPage: hasNextPopularTV,
    isFetchingNextPage: isFetchingPopularTV,
    refetch: refetchPopularTV,
  } = useTVShowsList('popular');

  const {
    data: topRatedTVShows,
    fetchNextPage: fetchNextTopRatedTV,
    hasNextPage: hasNextTopRatedTV,
    isFetchingNextPage: isFetchingTopRatedTV,
    refetch: refetchTopRatedTV,
  } = useTVShowsList('top_rated');

  // Recent Movies (Now Playing)
  const {
    data: recentMovies,
    fetchNextPage: fetchNextRecent,
    hasNextPage: hasNextRecent,
    isFetchingNextPage: isFetchingRecent,
    refetch: refetchRecent,
  } = useMoviesList('latest');

  // Recent TV Shows (On Air)
  const {
    data: recentTVShows,
    fetchNextPage: fetchNextRecentTV,
    hasNextPage: hasNextRecentTV,
    isFetchingNextPage: isFetchingRecentTV,
    refetch: refetchRecentTV,
  } = useTVShowsList('latest');

  // Trending Movies
  const {
    data: trendingMovies,
    fetchNextPage: fetchNextTrendingMovies,
    hasNextPage: hasNextTrendingMovies,
    isFetchingNextPage: isFetchingTrendingMovies,
    refetch: refetchTrendingMovies,
  } = useTrendingMovies('day');

  // Trending TV Shows
  const {
    data: trendingTVShows,
    fetchNextPage: fetchNextTrendingTVShows,
    hasNextPage: hasNextTrendingTVShows,
    isFetchingNextPage: isFetchingTrendingTVShows,
    refetch: refetchTrendingTVShows,
  } = useTrendingTVShows('day');

  // Get a random popular item for the banner
  const featuredItem = useMemo(() => {
    if (!recentMovies?.pages?.[0]?.results) return null;
    const items = recentMovies.pages[0].results;
    const randomIndex = Math.floor(Math.random() * Math.min(items.length, 5));
    return {
      item: items[randomIndex],
      type: 'movie' as const,
    };
  }, [recentMovies]);

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

  const handleItemPress = useCallback(
    (item: ContentItem) => {
      if (item.type === 'movie') {
        navigation.navigate('MovieDetails', {movie: item as unknown as Movie});
      } else {
        navigation.navigate('TVShowDetails', {show: item as unknown as TVShow});
      }
    },
    [navigation],
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
      navigation.navigate('Category', {
        title,
        categoryType,
        contentType,
      });
    },
    [navigation],
  );

  const WIDTH = Dimensions.get('window').width;

  const isInitialLoading =
    (!popularMovies?.pages?.length && isFetchingPopular) ||
    (!popularTVShows?.pages?.length && isFetchingPopularTV) ||
    (!topRatedMovies?.pages?.length && isFetchingTopRated) ||
    (!topRatedTVShows?.pages?.length && isFetchingTopRatedTV) ||
    (!recentMovies?.pages?.length && isFetchingRecent) ||
    (!recentTVShows?.pages?.length && isFetchingRecentTV) ||
    (!upcomingMovies?.pages?.length && isFetchingUpcoming) ||
    (!trendingMovies?.pages?.length && isFetchingTrendingMovies) ||
    (!trendingTVShows?.pages?.length && isFetchingTrendingTVShows) ||
    (!top10MoviesTodayByRegion?.length && isFetchingTop10MoviesTodayByRegion) ||
    (!top10ShowsTodayByRegion?.length && isFetchingTop10ShowsTodayByRegion);

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
  });

  if (isInitialLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.skeletonContainer}>
          <BannerHomeSkeleton />
        </View>
        <HeadingSkeleton />
        <HorizontalListSkeleton />
        <HeadingSkeleton />
        <HorizontalListSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {featuredItem ? (
          <FeaturedBannerHome
            item={featuredItem.item}
            type={featuredItem.type}
          />
        ) : (
          <View style={styles.skeletonContainer}>
            <BannerHomeSkeleton />
          </View>
        )}

        {recentMovies?.pages?.[0]?.results?.length && (
          <HorizontalList
            title="Recent Movies"
            data={getMoviesFromData(recentMovies)}
            isLoading={isFetchingRecent}
            onItemPress={handleItemPress}
            onEndReached={hasNextRecent ? fetchNextRecent : undefined}
            onSeeAllPress={() =>
              handleSeeAllPress('Recent Movies', 'latest', 'movie')
            }
          />
        )}

        {recentTVShows?.pages?.[0]?.results?.length && (
          <HorizontalList
            title="Latest Shows"
            data={getTVShowsFromData(recentTVShows)}
            isLoading={isFetchingRecentTV}
            onItemPress={handleItemPress}
            onEndReached={hasNextRecentTV ? fetchNextRecentTV : undefined}
            onSeeAllPress={() =>
              handleSeeAllPress('Latest Shows', 'latest', 'tv')
            }
          />
        )}

        {top10ContentByRegion?.length && (
          <HorizontalList
            title={`Top 10 in ${region?.english_name}`}
            data={top10ContentByRegion}
            isLoading={top10ContentByRegion.length === 0}
            onItemPress={handleItemPress}
            isSeeAll={false}
            isTop10={true}
          />
        )}

        {savedFilters && savedFilters.length > 0 && (
          <HomeFilterCard savedFilters={savedFilters} />
        )}

        {popularTVShows?.pages?.[0]?.results?.length && (
          <HorizontalList
            title="Popular Shows"
            data={getTVShowsFromData(popularTVShows)}
            isLoading={isFetchingPopularTV}
            onItemPress={handleItemPress}
            onEndReached={hasNextPopularTV ? fetchNextPopularTV : undefined}
            onSeeAllPress={() =>
              handleSeeAllPress('Popular Shows', 'popular', 'tv')
            }
          />
        )}

        {topRatedMovies?.pages?.[0]?.results?.length && (
          <HorizontalList
            title="Top Rated Movies"
            data={getMoviesFromData(topRatedMovies)}
            isLoading={isFetchingTopRated}
            onItemPress={handleItemPress}
            onEndReached={hasNextTopRated ? fetchNextTopRated : undefined}
            onSeeAllPress={() =>
              handleSeeAllPress('Top Rated Movies', 'top_rated', 'movie')
            }
          />
        )}

        {topRatedTVShows?.pages?.[0]?.results?.length && (
          <HorizontalList
            title="Top Rated TV Shows"
            data={getTVShowsFromData(topRatedTVShows)}
            isLoading={isFetchingTopRatedTV}
            onItemPress={handleItemPress}
            onEndReached={hasNextTopRatedTV ? fetchNextTopRatedTV : undefined}
            onSeeAllPress={() =>
              handleSeeAllPress('Top Rated TV Shows', 'top_rated', 'tv')
            }
          />
        )}

        {upcomingMovies?.pages?.[0]?.results?.length && (
          <HorizontalList
            title="Upcoming Movies"
            data={getMoviesFromData(upcomingMovies)}
            isLoading={isFetchingUpcoming}
            onItemPress={handleItemPress}
            onEndReached={hasNextUpcoming ? fetchNextUpcoming : undefined}
            onSeeAllPress={() =>
              handleSeeAllPress('Upcoming Movies', 'upcoming', 'movie')
            }
          />
        )}
        <View style={{height: 100}} />
      </ScrollView>
    </View>
  );
};
