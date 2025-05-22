import React, {useCallback, useMemo} from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {useTVShowsList} from '../hooks/useTVShows';
import {TVShow} from '../types/tvshow';
import {useNavigation} from '@react-navigation/native';
import {HorizontalList} from '../components/HorizontalList';
import {FeaturedBanner} from '../components/FeaturedBanner';
import {ContentItem} from '../components/MovieList';
import {RootStackParamList, TVShowCategoryType} from '../types/navigation';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {colors, spacing, typography} from '../styles/theme';

type TVShowsScreenNavigationProp =
  NativeStackNavigationProp<RootStackParamList>;

export const TVShowsScreen = () => {
  const navigation = useNavigation<TVShowsScreenNavigationProp>();

  // Recent TV Shows (On Air)
  const {
    data: recentShows,
    fetchNextPage: fetchNextRecent,
    hasNextPage: hasNextRecent,
    isFetchingNextPage: isFetchingRecent,
    refetch: refetchRecent,
  } = useTVShowsList('on_the_air');

  // Popular TV Shows
  const {
    data: popularShows,
    fetchNextPage: fetchNextPopular,
    hasNextPage: hasNextPopular,
    isFetchingNextPage: isFetchingPopular,
    refetch: refetchPopular,
  } = useTVShowsList('popular');

  // Get a random popular show for the banner
  const featuredShow = useMemo(() => {
    if (!popularShows?.pages?.[0]?.results) return null;
    const shows = popularShows.pages[0].results;
    const randomIndex = Math.floor(Math.random() * Math.min(shows.length, 5));
    return shows[randomIndex];
  }, [popularShows]);

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

  // Currently On Air Shows
  const {
    data: onAirShows,
    fetchNextPage: fetchNextOnAir,
    hasNextPage: hasNextOnAir,
    isFetchingNextPage: isFetchingOnAir,
    refetch: refetchOnAir,
  } = useTVShowsList('on_the_air');

  // Airing Today Shows
  const {
    data: airingTodayShows,
    fetchNextPage: fetchNextAiringToday,
    hasNextPage: hasNextAiringToday,
    isFetchingNextPage: isFetchingAiringToday,
    refetch: refetchAiringToday,
  } = useTVShowsList('airing_today');

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
          title="Recent Shows"
          data={getShowsFromData(recentShows)}
          onItemPress={handleShowPress}
          onEndReached={hasNextRecent ? fetchNextRecent : undefined}
          isLoading={isFetchingRecent}
          onRefresh={refetchRecent}
          onSeeAllPress={() => handleSeeAllPress('Recent Shows', 'on_the_air')}
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

        <HorizontalList
          title="Currently On Air"
          data={getShowsFromData(onAirShows)}
          onItemPress={handleShowPress}
          onEndReached={hasNextOnAir ? fetchNextOnAir : undefined}
          isLoading={isFetchingOnAir}
          onRefresh={refetchOnAir}
          onSeeAllPress={() =>
            handleSeeAllPress('Currently On Air', 'on_the_air')
          }
        />

        <HorizontalList
          title="Airing Today"
          data={getShowsFromData(airingTodayShows)}
          onItemPress={handleShowPress}
          onEndReached={hasNextAiringToday ? fetchNextAiringToday : undefined}
          isLoading={isFetchingAiringToday}
          onRefresh={refetchAiringToday}
          onSeeAllPress={() =>
            handleSeeAllPress('Airing Today', 'airing_today')
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
