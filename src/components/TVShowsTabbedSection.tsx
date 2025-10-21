import React, {useState, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import {useNavigationState} from '../hooks/useNavigationState';
import {useTVShowsList, useTrendingTVShows} from '../hooks/useTVShows';
import {HorizontalList} from './HorizontalList';
import {TVShow} from '../types/tvshow';
import {ContentItem} from './MovieList';
import {colors, spacing, borderRadius, typography} from '../styles/theme';

type TVShowCategory = 'popular' | 'top_rated' | 'trending';

interface CategoryTab {
  key: TVShowCategory;
  label: string;
}

const CATEGORIES: CategoryTab[] = [
  {key: 'popular', label: 'Popular'},
  {key: 'top_rated', label: 'Top Rated'},
  {key: 'trending', label: 'Trending'},
];

export const TVShowsTabbedSection: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<TVShowCategory>('popular');
  const {navigateWithLimit} = useNavigationState();

  // Get data for the active category
  const regularQuery = useTVShowsList(
    activeCategory === 'trending' ? 'popular' : activeCategory
  );
  const trendingQuery = useTrendingTVShows('week');

  // Use trending query if trending is selected, otherwise use regular
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = activeCategory === 'trending' ? trendingQuery : regularQuery;

  const shows = useMemo(() => {
    const pages = data?.pages || [];
    return pages.flatMap((page: any) =>
      (page?.results || []).map((s: any) => ({...s, type: 'tv' as const})),
    );
  }, [data]);

  const onSeeAllPress = useCallback(() => {
    const categoryLabel = CATEGORIES.find(c => c.key === activeCategory)?.label;
    if (activeCategory === 'trending') {
      navigateWithLimit('Explore', {initialTab: 'trending'});
    } else {
      navigateWithLimit('Category', {
        title: `${categoryLabel} Shows`,
        contentType: 'tv',
        categoryType: activeCategory,
      });
    }
  }, [navigateWithLimit, activeCategory]);

  const onItemPress = useCallback(
    (item: ContentItem) => {
      if (item.type === 'tv') {
        navigateWithLimit('TVShowDetails', {show: item as TVShow});
      }
    },
    [navigateWithLimit],
  );

  const renderTabButton = (category: CategoryTab) => (
    <TouchableOpacity
      key={category.key}
      style={[
        styles.tabButton,
        activeCategory === category.key && styles.activeTabButton,
      ]}
      onPress={() => setActiveCategory(category.key)}>
      <Text
        style={[
          styles.tabText,
          activeCategory === category.key && styles.activeTabText,
        ]}>
        {category.label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Title */}
      <Text style={styles.sectionTitle}>Shows in</Text>

      {/* Horizontal Tabs */}
      <ScrollView
        style={styles.tabContainer}
        horizontal={true}
        showsHorizontalScrollIndicator={false}>
        {CATEGORIES.map(renderTabButton)}
      </ScrollView>

      {/* Content List */}
      {shows.length > 0 || isLoading ? (
        <HorizontalList
          title=""
          data={shows}
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
            No shows available in this category
          </Text>
        </View>
      )}
    </View>
  );
};

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
    paddingHorizontal: spacing.sm,
  },
  tabButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginHorizontal: spacing.xs,
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
    marginBottom: spacing.md,
  },
});
