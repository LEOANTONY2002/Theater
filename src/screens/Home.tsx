import React, {useCallback, useMemo} from 'react';
import {View, ScrollView, StyleSheet} from 'react-native';
import {useMoviesList} from '../hooks/useMovies';
import {useTVShowsList} from '../hooks/useTVShows';
import {ContentItem} from '../components/MovieList';
import {HorizontalList} from '../components/HorizontalList';
import {FeaturedBanner} from '../components/FeaturedBanner';
import {useNavigation} from '@react-navigation/native';
import {Movie} from '../types/movie';
import {TVShow} from '../types/tvshow';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {
  RootStackParamList,
  MovieCategoryType,
  TVShowCategoryType,
  ContentType,
} from '../types/navigation';
import {colors} from '../styles/theme';
type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();

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
  } = useMoviesList('now_playing');

  // Recent TV Shows (On Air)
  const {
    data: recentTVShows,
    fetchNextPage: fetchNextRecentTV,
    hasNextPage: hasNextRecentTV,
    isFetchingNextPage: isFetchingRecentTV,
    refetch: refetchRecentTV,
  } = useTVShowsList('on_the_air');

  // Get a random popular item for the banner
  const featuredItem = useMemo(() => {
    if (!popularMovies?.pages?.[0]?.results) return null;
    const items = popularMovies.pages[0].results;
    const randomIndex = Math.floor(Math.random() * Math.min(items.length, 5));
    return {
      item: items[randomIndex],
      type: 'movie' as const,
    };
  }, [popularMovies]);

  const handleFeaturedPress = useCallback(() => {
    if (featuredItem?.type === 'movie') {
      navigation.navigate('MovieDetails', {
        movie: featuredItem.item as Movie,
      });
    } else if (featuredItem?.type === 'tv') {
      navigation.navigate('TVShowDetails', {
        show: featuredItem.item as TVShow,
      });
    }
  }, [navigation, featuredItem]);

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
    data?.pages.flatMap((page: any) =>
      page.results.map((show: any) => ({...show, type: 'tv' as const})),
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

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {featuredItem && (
          <FeaturedBanner
            item={featuredItem.item}
            type={featuredItem.type}
            onPress={handleFeaturedPress}
          />
        )}

        <HorizontalList
          title="Recent Movies"
          data={getMoviesFromData(recentMovies)}
          isLoading={isFetchingRecent}
          onItemPress={handleItemPress}
          onEndReached={hasNextRecent ? fetchNextRecent : undefined}
          onRefresh={refetchRecent}
          onSeeAllPress={() =>
            handleSeeAllPress('Recent Movies', 'now_playing', 'movie')
          }
        />

        <HorizontalList
          title="Recent TV Shows"
          data={getTVShowsFromData(recentTVShows)}
          isLoading={isFetchingRecentTV}
          onItemPress={handleItemPress}
          onEndReached={hasNextRecentTV ? fetchNextRecentTV : undefined}
          onRefresh={refetchRecentTV}
          onSeeAllPress={() =>
            handleSeeAllPress('Recent TV Shows', 'on_the_air', 'tv')
          }
        />

        <HorizontalList
          title="Popular Movies"
          data={getMoviesFromData(popularMovies)}
          isLoading={isFetchingPopular}
          onItemPress={handleItemPress}
          onEndReached={hasNextPopular ? fetchNextPopular : undefined}
          onRefresh={refetchPopular}
          onSeeAllPress={() =>
            handleSeeAllPress('Popular Movies', 'popular', 'movie')
          }
        />

        <HorizontalList
          title="Popular TV Shows"
          data={getTVShowsFromData(popularTVShows)}
          isLoading={isFetchingPopularTV}
          onItemPress={handleItemPress}
          onEndReached={hasNextPopularTV ? fetchNextPopularTV : undefined}
          onRefresh={refetchPopularTV}
          onSeeAllPress={() =>
            handleSeeAllPress('Popular TV Shows', 'popular', 'tv')
          }
        />

        <HorizontalList
          title="Top Rated Movies"
          data={getMoviesFromData(topRatedMovies)}
          isLoading={isFetchingTopRated}
          onItemPress={handleItemPress}
          onEndReached={hasNextTopRated ? fetchNextTopRated : undefined}
          onRefresh={refetchTopRated}
          onSeeAllPress={() =>
            handleSeeAllPress('Top Rated Movies', 'top_rated', 'movie')
          }
        />

        <HorizontalList
          title="Top Rated TV Shows"
          data={getTVShowsFromData(topRatedTVShows)}
          isLoading={isFetchingTopRatedTV}
          onItemPress={handleItemPress}
          onEndReached={hasNextTopRatedTV ? fetchNextTopRatedTV : undefined}
          onRefresh={refetchTopRatedTV}
          onSeeAllPress={() =>
            handleSeeAllPress('Top Rated TV Shows', 'top_rated', 'tv')
          }
        />

        <HorizontalList
          title="Upcoming Movies"
          data={getMoviesFromData(upcomingMovies)}
          isLoading={isFetchingUpcoming}
          onItemPress={handleItemPress}
          onEndReached={hasNextUpcoming ? fetchNextUpcoming : undefined}
          onRefresh={refetchUpcoming}
          onSeeAllPress={() =>
            handleSeeAllPress('Upcoming Movies', 'upcoming', 'movie')
          }
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
});
