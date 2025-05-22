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

type MoviesScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const MoviesScreen = () => {
  const navigation = useNavigation<MoviesScreenNavigationProp>();

  // Recent Movies (Now Playing)
  const {
    data: recentMovies,
    fetchNextPage: fetchNextRecent,
    hasNextPage: hasNextRecent,
    isFetchingNextPage: isFetchingRecent,
    refetch: refetchRecent,
  } = useMoviesList('now_playing');

  // Popular Movies
  const {
    data: popularMovies,
    fetchNextPage: fetchNextPopular,
    hasNextPage: hasNextPopular,
    isFetchingNextPage: isFetchingPopular,
    refetch: refetchPopular,
  } = useMoviesList('popular');

  // Top Rated Movies
  const {
    data: topRatedMovies,
    fetchNextPage: fetchNextTopRated,
    hasNextPage: hasNextTopRated,
    isFetchingNextPage: isFetchingTopRated,
    refetch: refetchTopRated,
  } = useMoviesList('top_rated');

  // Now Playing Movies
  const {
    data: nowPlayingMovies,
    fetchNextPage: fetchNextNowPlaying,
    hasNextPage: hasNextNowPlaying,
    isFetchingNextPage: isFetchingNowPlaying,
    refetch: refetchNowPlaying,
  } = useMoviesList('now_playing');

  // Upcoming Movies
  const {
    data: upcomingMovies,
    fetchNextPage: fetchNextUpcoming,
    hasNextPage: hasNextUpcoming,
    isFetchingNextPage: isFetchingUpcoming,
    refetch: refetchUpcoming,
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

  return (
    <View style={styles.container}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {featuredMovie && (
          <FeaturedBanner
            item={featuredMovie}
            type="movie"
            onPress={handleFeaturedPress}
          />
        )}

        <HorizontalList
          title="Recent Movies"
          data={getMoviesFromData(recentMovies)}
          onItemPress={handleMoviePress}
          onEndReached={hasNextRecent ? fetchNextRecent : undefined}
          isLoading={isFetchingRecent}
          onRefresh={refetchRecent}
          onSeeAllPress={() =>
            handleSeeAllPress('Recent Movies', 'now_playing')
          }
        />

        <HorizontalList
          title="Popular Movies"
          data={getMoviesFromData(popularMovies)}
          onItemPress={handleMoviePress}
          onEndReached={hasNextPopular ? fetchNextPopular : undefined}
          isLoading={isFetchingPopular}
          onRefresh={refetchPopular}
          onSeeAllPress={() => handleSeeAllPress('Popular Movies', 'popular')}
        />

        <HorizontalList
          title="Top Rated Movies"
          data={getMoviesFromData(topRatedMovies)}
          onItemPress={handleMoviePress}
          onEndReached={hasNextTopRated ? fetchNextTopRated : undefined}
          isLoading={isFetchingTopRated}
          onRefresh={refetchTopRated}
          onSeeAllPress={() =>
            handleSeeAllPress('Top Rated Movies', 'top_rated')
          }
        />

        <HorizontalList
          title="Now Playing"
          data={getMoviesFromData(nowPlayingMovies)}
          onItemPress={handleMoviePress}
          onEndReached={hasNextNowPlaying ? fetchNextNowPlaying : undefined}
          isLoading={isFetchingNowPlaying}
          onRefresh={refetchNowPlaying}
          onSeeAllPress={() => handleSeeAllPress('Now Playing', 'now_playing')}
        />

        <HorizontalList
          title="Upcoming Movies"
          data={getMoviesFromData(upcomingMovies)}
          onItemPress={handleMoviePress}
          onEndReached={hasNextUpcoming ? fetchNextUpcoming : undefined}
          isLoading={isFetchingUpcoming}
          onRefresh={refetchUpcoming}
          onSeeAllPress={() => handleSeeAllPress('Upcoming Movies', 'upcoming')}
        />
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
