import React, {useState, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import {useNavigationState} from '../hooks/useNavigationState';
import {useMoviesList} from '../hooks/useMovies';
import {HorizontalList} from './HorizontalList';
import {Movie} from '../types/movie';
import {ContentItem} from './MovieList';
import {colors, spacing, borderRadius, typography} from '../styles/theme';

type MovieCategory = 'popular' | 'top_rated';

interface CategoryTab {
  key: MovieCategory;
  label: string;
}

const CATEGORIES: CategoryTab[] = [
  {key: 'popular', label: 'Popular'},
  {key: 'top_rated', label: 'Top Rated'},
];

export const MoviesTabbedSection: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<MovieCategory>('popular');
  const {navigateWithLimit} = useNavigationState();

  // Get data for the active category
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useMoviesList(activeCategory);

  const movies = useMemo(() => {
    const pages = data?.pages || [];
    return pages.flatMap((page: any) =>
      (page?.results || []).map((m: any) => ({...m, type: 'movie' as const})),
    );
  }, [data]);

  const onSeeAllPress = useCallback(() => {
    const categoryLabel = CATEGORIES.find(c => c.key === activeCategory)?.label;
    navigateWithLimit('Category', {
      title: `${categoryLabel} Movies`,
      contentType: 'movie',
      category: activeCategory,
    });
  }, [navigateWithLimit, activeCategory]);

  const onItemPress = useCallback(
    (item: ContentItem) => {
      if (item.type !== 'tv') {
        navigateWithLimit('MovieDetails', {movie: item as Movie});
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
      <Text style={styles.sectionTitle}>Movies in</Text>

      {/* Horizontal Tabs */}
      <ScrollView
        style={styles.tabContainer}
        horizontal={true}
        showsHorizontalScrollIndicator={false}>
        {CATEGORIES.map(renderTabButton)}
      </ScrollView>

      {/* Content List */}
      {movies.length > 0 || isLoading ? (
        <HorizontalList
          title=""
          data={movies}
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
            No movies available in this category
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
