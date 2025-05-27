import React, {useCallback, useMemo} from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {useTrendingTVShows, useTVShowsList} from '../hooks/useTVShows';
import {TVShow} from '../types/tvshow';
import {useNavigation} from '@react-navigation/native';
import {HorizontalList} from '../components/HorizontalList';
import {FeaturedBanner} from '../components/FeaturedBanner';
import {ContentItem} from '../components/MovieList';
import {RootStackParamList, TVShowCategoryType} from '../types/navigation';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {colors, spacing, typography} from '../styles/theme';
import {
  BannerSkeleton,
  HeadingSkeleton,
  HorizontalListSkeleton,
} from '../components/LoadingSkeleton';

type TVShowsScreenNavigationProp =
  NativeStackNavigationProp<RootStackParamList>;

export const TVShowsScreen = () => {
  const navigation = useNavigation<TVShowsScreenNavigationProp>();

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

  // Get a random popular show for the banner
  const featuredShow = useMemo(() => {
    if (!trendingShows?.pages?.[0]?.results) return null;
    const shows = trendingShows.pages[0].results;
    const randomIndex = Math.floor(Math.random() * Math.min(shows.length, 5));
    return shows[randomIndex];
  }, [trendingShows]);

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

  // Latest Shows
  const {
    data: onAirShows,
    fetchNextPage: fetchNextOnAir,
    hasNextPage: hasNextOnAir,
    isFetchingNextPage: isFetchingOnAir,
    refetch: refetchOnAir,
  } = useTVShowsList('latest');

  const handleShowPress = useCallback(
    (item: ContentItem) => {
      if (item.type === 'tv') {
        navigation.navigate('TVShowDetails', {show: item as TVShow});
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
        <HeadingSkeleton />
        <HorizontalListSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {featuredShow && (
          <FeaturedBanner
            item={featuredShow}
            type="tv"
            onPress={handleFeaturedPress}
          />
        )}

        <HorizontalList
          title="Trending Today"
          data={getShowsFromData(trendingShows)}
          onItemPress={handleShowPress}
          onEndReached={hasNextTrending ? fetchNextTrending : undefined}
          isLoading={isFetchingTrending}
          onRefresh={refetchTrending}
          isSeeAll={false}
        />

        <HorizontalList
          title="Top Rated Shows"
          data={getShowsFromData(topRatedShows)}
          onItemPress={handleShowPress}
          onEndReached={hasNextTopRated ? fetchNextTopRated : undefined}
          isLoading={isFetchingTopRated}
          onRefresh={refetchTopRated}
          onSeeAllPress={() =>
            handleSeeAllPress('Top Rated Shows', 'top_rated')
          }
        />

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
