import React, {useCallback, useMemo, useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {useMoviesList, useTop10MoviesTodayByRegion} from '../hooks/useMovies';
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
import {getGenres} from '../services/tmdb';
import {Genre} from '../types/movie';
import {useRegion} from '../hooks/useApp';

type MoviesScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const MoviesScreen = () => {
  const {data: region} = useRegion();
  const navigation = useNavigation<MoviesScreenNavigationProp>();
  const [genres, setGenres] = useState<Genre[]>([]);

  useEffect(() => {
    const loadGenres = async () => {
      try {
        const movieGenres = await getGenres('movie');
        setGenres(movieGenres);
      } catch (error) {
        console.error('Error loading genres:', error);
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
      navigation.navigate('MovieDetails', {movie: featuredMovie});
    }
  }, [navigation, featuredMovie]);

  const handleMoviePress = useCallback(
    (item: ContentItem) => {
      console.log('item', item);
      if (item.type !== 'tv') {
        navigation.navigate('MovieDetails', {movie: item as Movie});
      } else {
        navigation.navigate('TVShowDetails', {tv: item as TVShow});
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

  const handleGenrePress = (genre: Genre) => {
    navigation.navigate('Genre', {
      genreId: genre.id,
      genreName: genre.name,
      contentType: 'movie',
    });
  };

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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.genreList}>
          {genres.map(genre => (
            <TouchableOpacity
              key={genre.id}
              style={styles.genreItem}
              onPress={() => handleGenrePress(genre)}>
              <Text style={styles.genreText}>{genre.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

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

        {top10MoviesTodayByRegionData?.length && (
          <HorizontalList
            title={`Top 10 Movies in ${region?.english_name}`}
            data={top10MoviesTodayByRegionData}
            onItemPress={handleMoviePress}
            isLoading={isFetchingTop10MoviesTodayByRegion}
            isSeeAll={false}
            isTop10={true}
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
