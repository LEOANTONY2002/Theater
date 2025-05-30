import React, {useCallback, useMemo} from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {useMoviesList} from '../hooks/useMovies';
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
  HeadingSkeleton,
  HorizontalListSkeleton,
} from '../components/LoadingSkeleton';

type MoviesScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const MoviesScreen = () => {
  const navigation = useNavigation<MoviesScreenNavigationProp>();

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

  // Get a random popular movie for the banner
  const featuredMovie = useMemo(() => {
    if (!popularMovies?.pages?.[0]?.results) return null;
    const movies = popularMovies.pages[0].results;
    const randomIndex = Math.floor(Math.random() * Math.min(movies.length, 5));
    return movies[randomIndex];
  }, [popularMovies]);

  const handleFeaturedPress = useCallback(() => {
    if (featuredMovie) {
      navigation.navigate('MovieDetails', {movie: featuredMovie});
    }
  }, [navigation, featuredMovie]);

  const handleMoviePress = useCallback(
    (item: ContentItem) => {
      if (item.type === 'movie') {
        navigation.navigate('MovieDetails', {movie: item as Movie});
      }
    },
    [navigation],
  );

  const getMoviesFromData = (data: any) =>
    data?.pages.flatMap((page: any) =>
      page.results.map((movie: any) => ({...movie, type: 'movie' as const})),
    ) || [];

  const handleSeeAllPress = useCallback(
    (title: string, categoryType: MovieCategoryType) => {
      navigation.navigate('Category', {
        title,
        categoryType,
        contentType: 'movie',
      });
    },
    [navigation],
  );

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
        <HorizontalListSkeleton />
        <HeadingSkeleton />
        <HorizontalListSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {featuredMovie ? (
          <FeaturedBanner item={featuredMovie} type="movie" />
        ) : (
          <View
            style={{
              width: '100%',
              height: 580,
              alignSelf: 'center',
            }}>
            <BannerSkeleton />
          </View>
        )}

        {recentMovies?.pages?.[0]?.results?.length && (
          <HorizontalList
            title="Recent Movies"
            data={getMoviesFromData(recentMovies)}
            onItemPress={handleMoviePress}
            onEndReached={hasNextRecent ? fetchNextRecent : undefined}
            isLoading={isFetchingRecent}
            onSeeAllPress={() => handleSeeAllPress('Recent Movies', 'latest')}
          />
        )}

        {popularMovies?.pages?.[0]?.results?.length && (
          <HorizontalList
            title="Popular Movies"
            data={getMoviesFromData(popularMovies)}
            onItemPress={handleMoviePress}
            onEndReached={hasNextPopular ? fetchNextPopular : undefined}
            isLoading={isFetchingPopular}
            onSeeAllPress={() => handleSeeAllPress('Popular Movies', 'popular')}
          />
        )}

        {topRatedMovies?.pages?.[0]?.results?.length && (
          <HorizontalList
            title="Top Rated Movies"
            data={getMoviesFromData(topRatedMovies)}
            onItemPress={handleMoviePress}
            onEndReached={hasNextTopRated ? fetchNextTopRated : undefined}
            isLoading={isFetchingTopRated}
            onSeeAllPress={() =>
              handleSeeAllPress('Top Rated Movies', 'top_rated')
            }
          />
        )}

        {nowPlayingMovies?.pages?.[0]?.results?.length && (
          <HorizontalList
            title="Now Playing"
            data={getMoviesFromData(nowPlayingMovies)}
            onItemPress={handleMoviePress}
            onEndReached={hasNextNowPlaying ? fetchNextNowPlaying : undefined}
            isLoading={isFetchingNowPlaying}
            onSeeAllPress={() =>
              handleSeeAllPress('Now Playing', 'now_playing')
            }
          />
        )}

        {upcomingMovies?.pages?.[0]?.results?.length && (
          <HorizontalList
            title="Upcoming Movies"
            data={getMoviesFromData(upcomingMovies)}
            onItemPress={handleMoviePress}
            onEndReached={hasNextUpcoming ? fetchNextUpcoming : undefined}
            isLoading={isFetchingUpcoming}
            onSeeAllPress={() =>
              handleSeeAllPress('Upcoming Movies', 'upcoming')
            }
          />
        )}

        <View style={{height: 100}} />
      </ScrollView>
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
});
