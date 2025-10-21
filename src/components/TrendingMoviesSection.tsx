import React, {useState, useCallback, useMemo, memo} from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {useNavigationState} from '../hooks/useNavigationState';
import {useTrendingMovies} from '../hooks/useMovies';
import {HorizontalList} from './HorizontalList';
import {Movie} from '../types/movie';
import {TVShow} from '../types/tvshow';
import {ContentItem} from './MovieList';
import {colors, spacing, borderRadius, typography} from '../styles/theme';

export const TrendingMoviesSection: React.FC = memo(() => {
  const [timeWindow, setTimeWindow] = useState<'day' | 'week'>('day');
  const {navigateWithLimit} = useNavigationState();

  // Get trending data based on active time window
  const {
    data: trendingData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useTrendingMovies(timeWindow);

  const data = useMemo(() => {
    const pages = trendingData?.pages || [];
    return (
      pages.flatMap((page: any) =>
        (page?.results || []).map((m: any) => ({...m, type: 'movie' as const})),
      ) || []
    );
  }, [trendingData]);

  const onSeeAllPress = useCallback(() => {
    const title = `Trending Movies - ${timeWindow === 'day' ? 'Today' : 'This Week'}`;
    navigateWithLimit('Category', {
      title,
      contentType: 'movie',
      categoryType: timeWindow === 'day' ? 'trending_day' : 'trending_week',
    });
  }, [navigateWithLimit, timeWindow]);

  const onItemPress = useCallback(
    (item: ContentItem) => {
      if (item.type !== 'tv') {
        navigateWithLimit('MovieDetails', {movie: item as Movie});
      } else {
        navigateWithLimit('TVShowDetails', {tv: item as TVShow});
      }
    },
    [navigateWithLimit],
  );

  const renderTabButton = (tab: 'day' | 'week', label: string) => (
    <TouchableOpacity
      key={tab}
      style={[
        styles.tabButton,
        timeWindow === tab && styles.activeTabButton,
      ]}
      onPress={() => setTimeWindow(tab)}>
      <Text
        style={[
          styles.tabText,
          timeWindow === tab && styles.activeTabText,
        ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Title */}
      <Text style={styles.sectionTitle}>Trending in</Text>

      {/* Day/Week Tabs */}
      <View style={styles.tabContainer}>
        {renderTabButton('day', 'Today')}
        {renderTabButton('week', 'This Week')}
      </View>

      {/* Content List */}
      {data.length > 0 || isLoading ? (
        <HorizontalList
          key={`trending-movies-${timeWindow}`}
          title=""
          data={data}
          onItemPress={onItemPress}
          isLoading={isLoading}
          onEndReached={hasNextPage ? fetchNextPage : undefined}
          onSeeAllPress={onSeeAllPress}
          isSeeAll
          hideTitle
          showSeeAllText
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No trending movies available
          </Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.text.primary,
    ...typography.h3,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  tabContainer: {
    flexDirection: 'row',
    padding: spacing.xs,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  tabButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    backgroundColor: colors.modal.blur,
    borderWidth: 1,
    borderColor: colors.modal.content,
  },
  activeTabButton: {
    backgroundColor: colors.modal.border,
    borderWidth: 1,
    borderColor: colors.modal.active,
  },
  tabText: {
    color: colors.text.secondary,
    ...typography.body2,
    fontWeight: '500',
  },
  activeTabText: {
    color: colors.text.primary,
  },
  emptyContainer: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    height: 250,
  },
  emptyText: {
    color: colors.text.secondary,
    ...typography.body2,
    textAlign: 'center',
  },
});
