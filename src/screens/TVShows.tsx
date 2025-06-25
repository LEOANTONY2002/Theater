import React, {useCallback, useMemo, useEffect, useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {FlashList} from '@shopify/flash-list';
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
  GenreListSkeleton,
  HeadingSkeleton,
  HorizontalListSkeleton,
} from '../components/LoadingSkeleton';
import {getGenres} from '../services/tmdb';
import {Genre} from '../types/movie';
import {useRegion} from '../hooks/useApp';
import {HorizontalGenreList} from '../components/HorizontalGenreList';
import {useNavigationState} from '../hooks/useNavigationState';
import {Movie} from '../types/movie';

type TVShowsScreenNavigationProp =
  NativeStackNavigationProp<TVShowsStackParamList>;

export const TVShowsScreen = () => {
  const {data: region} = useRegion();
  const navigation = useNavigation<TVShowsScreenNavigationProp>();
  const {navigateWithLimit} = useNavigationState();
  const [genres, setGenres] = useState<Genre[]>([]);
  const [isLoadingGenres, setIsLoadingGenres] = useState(true);

  useEffect(() => {
    const loadGenres = async () => {
      try {
        const tvGenres = await getGenres('tv');
        setGenres(tvGenres);
        setIsLoadingGenres(false);
      } catch (error) {
        console.error('Error loading genres:', error);
        setIsLoadingGenres(false);
      }
    };
    loadGenres();
  }, []);

  const handleGenrePress = (genre: Genre) => {
    navigateWithLimit('Genre', {
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
      navigateWithLimit('TVShowDetails', {show: featuredShow});
    }
  }, [navigateWithLimit, featuredShow]);

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
      if (item.type === 'tv') {
        navigateWithLimit('TVShowDetails', {show: item as TVShow});
      } else {
        navigateWithLimit('MovieDetails', {movie: item as Movie});
      }
    },
    [navigateWithLimit],
  );

  const getShowsFromData = (data: any) =>
    data?.pages.flatMap((page: any) =>
      page.results.map((show: any) => ({...show, type: 'tv' as const})),
    ) || [];

  const handleSeeAllPress = useCallback(
    (title: string, categoryType: TVShowCategoryType) => {
      navigateWithLimit('Category', {
        title,
        categoryType,
        contentType: 'tv',
      });
    },
    [navigateWithLimit],
  );

  // Create sections for FlashList
  const sections = useMemo(() => {
    const sectionsList = [];

    // Featured banner section
    if (featuredShow) {
      sectionsList.push({
        id: 'featured',
        type: 'featured',
        data: featuredShow,
      });
    } else if (isFetchingLatest) {
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

    // Latest Shows section
    if (latestShows?.pages?.[0]?.results?.length) {
      sectionsList.push({
        id: 'latestShows',
        type: 'horizontalList',
        title: 'Latest Shows',
        data: getShowsFromData(latestShows),
        onItemPress: handleShowPress,
        onEndReached: hasNextLatest ? fetchNextLatest : undefined,
        isLoading: isFetchingLatest,
        onSeeAllPress: () => handleSeeAllPress('Latest Shows', 'latest'),
      });
    } else if (isFetchingLatest) {
      sectionsList.push({
        id: 'latestShowsSkeleton',
        type: 'horizontalListSkeleton',
      });
    }

    // Popular Shows section
    if (popularShows?.pages?.[0]?.results?.length) {
      sectionsList.push({
        id: 'popularShows',
        type: 'horizontalList',
        title: 'Popular Shows',
        data: getShowsFromData(popularShows),
        onItemPress: handleShowPress,
        onEndReached: hasNextPopular ? fetchNextPopular : undefined,
        isLoading: isFetchingPopular,
        onSeeAllPress: () => handleSeeAllPress('Popular Shows', 'popular'),
      });
    } else if (isFetchingPopular) {
      sectionsList.push({
        id: 'popularShowsSkeleton',
        type: 'horizontalListSkeleton',
      });
    }

    // Top Rated Shows section
    if (topRatedShows?.pages?.[0]?.results?.length) {
      sectionsList.push({
        id: 'topRatedShows',
        type: 'horizontalList',
        title: 'Top Rated Shows',
        data: getShowsFromData(topRatedShows),
        onItemPress: handleShowPress,
        onEndReached: hasNextTopRated ? fetchNextTopRated : undefined,
        isLoading: isFetchingTopRated,
        onSeeAllPress: () => handleSeeAllPress('Top Rated Shows', 'top_rated'),
      });
    } else if (isFetchingTopRated) {
      sectionsList.push({
        id: 'topRatedShowsSkeleton',
        type: 'horizontalListSkeleton',
      });
    }

    // Top 10 section
    if (isFetchingTop10ShowsTodayByRegion) {
      sectionsList.push({
        id: 'top10Skeleton',
        type: 'horizontalListSkeleton',
      });
    } else if (top10ShowsTodayByRegion?.length) {
      sectionsList.push({
        id: 'top10',
        type: 'horizontalList',
        title: `Top 10 in ${region?.english_name}`,
        data: top10ShowsTodayByRegion,
        isLoading: false,
        onItemPress: handleShowPress,
        isSeeAll: false,
        isTop10: true,
      });
    }

    return sectionsList;
  }, [
    featuredShow,
    genres,
    isLoadingGenres,
    latestShows,
    popularShows,
    topRatedShows,
    top10ShowsTodayByRegion,
    region,
    handleGenrePress,
    handleShowPress,
    handleSeeAllPress,
    isFetchingLatest,
    isFetchingPopular,
    isFetchingTopRated,
    isFetchingTop10ShowsTodayByRegion,
    hasNextLatest,
    hasNextPopular,
    hasNextTopRated,
    fetchNextLatest,
    fetchNextPopular,
    fetchNextTopRated,
  ]);

  const renderSection = useCallback(({item}: {item: any}) => {
    switch (item.type) {
      case 'featured':
        return <FeaturedBanner item={item.data} type="tv" />;

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
    (!trendingShows?.pages?.length && isFetchingTrending) ||
    (!popularShows?.pages?.length && isFetchingPopular) ||
    (!topRatedShows?.pages?.length && isFetchingTopRated);

  if (isInitialLoading) {
    return (
      <View style={styles.container}>
        <BannerSkeleton />
        <HeadingSkeleton />
        <GenreListSkeleton />
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
        maxToRenderPerBatch={2}
        windowSize={3}
        initialNumToRender={2}
        updateCellsBatchingPeriod={50}
        // Scroll optimizations
        scrollEventThrottle={16}
        decelerationRate="normal"
        // Performance optimizations
        extraData={null}
        onScrollBeginDrag={() => {}}
        onScrollEndDrag={() => {}}
        onMomentumScrollEnd={() => {}}
        // Memory management
        legacyImplementation={false}
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
