import React, {useCallback, useMemo, useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  useTop10ShowsTodayByRegion,
  useTrendingTVShows,
  useTVShowsList,
} from '../hooks/useTVShows';
import {TVShow} from '../types/tvshow';
import {useNavigation} from '@react-navigation/native';
import {HorizontalList} from '../components/HorizontalList';
import {FeaturedBanner} from '../components/FeaturedBanner';
import {ContentItem} from '../components/MovieList';
import {
  RootStackParamList,
  TVShowsStackParamList,
  TVShowCategoryType,
} from '../types/navigation';
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

type TVShowsScreenNavigationProp =
  NativeStackNavigationProp<TVShowsStackParamList>;

export const TVShowsScreen = () => {
  const {data: region} = useRegion();
  const navigation = useNavigation<TVShowsScreenNavigationProp>();
  const [genres, setGenres] = useState<Genre[]>([]);

  useEffect(() => {
    const loadGenres = async () => {
      try {
        const tvGenres = await getGenres('tv');
        setGenres(tvGenres);
      } catch (error) {
        console.error('Error loading genres:', error);
      }
    };
    loadGenres();
  }, []);

  const handleGenrePress = (genre: Genre) => {
    navigation.navigate('Genre', {
      genreId: genre.id,
      genreName: genre.name,
      contentType: 'tv',
    });
  };

  // Popular TV Shows
  const {
    data: popularShows,
    fetchNextPage: fetchNextPopular,
    hasNextPage: hasNextPopular,
    isFetchingNextPage: isFetchingPopular,
    refetch: refetchPopular,
  } = useTVShowsList('popular');

  // Trending TV Shows
  const {
    data: trendingShows,
    fetchNextPage: fetchNextTrending,
    hasNextPage: hasNextTrending,
    isFetchingNextPage: isFetchingTrending,
    refetch: refetchTrending,
  } = useTrendingTVShows('day');

  // Latest Shows
  const {
    data: latestShows,
    fetchNextPage: fetchNextLatest,
    hasNextPage: hasNextLatest,
    isFetchingNextPage: isFetchingLatest,
    refetch: refetchLatest,
  } = useTVShowsList('latest');

  // Get a random popular show for the banner
  const featuredShow = useMemo(() => {
    if (!latestShows?.pages?.[0]?.results) return null;
    const shows = latestShows.pages[0].results;
    const randomIndex = Math.floor(Math.random() * Math.min(shows.length, 5));
    return shows[randomIndex];
  }, [latestShows]);

  const handleFeaturedPress = useCallback(() => {
    if (featuredShow) {
      navigation.navigate('TVShowDetails', {show: featuredShow});
    }
  }, [navigation, featuredShow]);

  // Top Rated TV Shows
  const {
    data: topRatedShows,
    fetchNextPage: fetchNextTopRated,
    hasNextPage: hasNextTopRated,
    isFetchingNextPage: isFetchingTopRated,
    refetch: refetchTopRated,
  } = useTVShowsList('top_rated');

  const {
    data: top10ShowsTodayByRegion,
    isFetching: isFetchingTop10ShowsTodayByRegion,
  } = useTop10ShowsTodayByRegion();

  const handleShowPress = useCallback(
    (item: ContentItem) => {
      if (item.type !== 'movie') {
        navigation.navigate('TVShowDetails', {show: item as TVShow});
      } else {
        navigation.navigate('MovieDetails', {movie: item as Movie});
      }
    },
    [navigation],
  );

  const getShowsFromData = (data: any) =>
    data?.pages.flatMap((page: any) =>
      page.results.map((show: any) => ({...show, type: 'tv' as const})),
    ) || [];

  const handleSeeAllPress = useCallback(
    (title: string, categoryType: TVShowCategoryType) => {
      navigation.navigate('Category', {
        title,
        categoryType,
        contentType: 'tv',
      });
    },
    [navigation],
  );

  const isInitialLoading =
    (!trendingShows?.pages?.length && isFetchingTrending) ||
    (!popularShows?.pages?.length && isFetchingPopular) ||
    (!topRatedShows?.pages?.length && isFetchingTopRated);

  if (isInitialLoading) {
    return (
      <View style={styles.container}>
        <BannerSkeleton />
        <HeadingSkeleton />
        <HorizontalListSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {featuredShow && <FeaturedBanner item={featuredShow} type="tv" />}

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

        {latestShows?.pages?.[0]?.results?.length && (
          <HorizontalList
            title="Latest Shows"
            data={getShowsFromData(latestShows)}
            onItemPress={handleShowPress}
            onEndReached={hasNextLatest ? fetchNextLatest : undefined}
            isLoading={isFetchingLatest}
            onSeeAllPress={() => handleSeeAllPress('Latest Shows', 'latest')}
          />
        )}

        {popularShows?.pages?.[0]?.results?.length && (
          <HorizontalList
            title="Popular Shows"
            data={getShowsFromData(popularShows)}
            onItemPress={handleShowPress}
            onEndReached={hasNextPopular ? fetchNextPopular : undefined}
            isLoading={isFetchingPopular}
            onSeeAllPress={() => handleSeeAllPress('Popular Shows', 'popular')}
          />
        )}

        {top10ShowsTodayByRegion?.length && (
          <HorizontalList
            title={`Top 10 Shows in ${region?.english_name}`}
            data={top10ShowsTodayByRegion}
            onItemPress={handleShowPress}
            isLoading={isFetchingTop10ShowsTodayByRegion}
            isSeeAll={false}
            isTop10={true}
          />
        )}

        {topRatedShows?.pages?.[0]?.results?.length && (
          <HorizontalList
            title="Top Rated Shows"
            data={getShowsFromData(topRatedShows)}
            onItemPress={handleShowPress}
            onEndReached={hasNextTopRated ? fetchNextTopRated : undefined}
            isLoading={isFetchingTopRated}
            onSeeAllPress={() =>
              handleSeeAllPress('Top Rated Shows', 'top_rated')
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
