import React, {useState, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import {useNavigationState} from '../hooks/useNavigationState';
import {useMoviesByLanguage} from '../hooks/usePersonalization';
import {HorizontalList} from './HorizontalList';
import {Movie} from '../types/movie';
import {ContentItem} from './MovieList';
import {colors, spacing, borderRadius, typography} from '../styles/theme';

type LanguageMovieCategory = 'latest' | 'popular' | 'top_rated';

interface CategoryTab {
  key: LanguageMovieCategory;
  label: string;
}

const CATEGORIES: CategoryTab[] = [
  {key: 'latest', label: 'Latest'},
  {key: 'popular', label: 'Popular'},
  {key: 'top_rated', label: 'Top Rated'},
];

interface Props {
  languageIso: string;
  languageName: string;
}

export const LanguageMoviesTabbedSection: React.FC<Props> = ({
  languageIso,
  languageName,
}) => {
  const [activeCategory, setActiveCategory] = useState<LanguageMovieCategory>('latest');
  const {navigateWithLimit} = useNavigationState();

  // Get data for the active category
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useMoviesByLanguage(activeCategory, languageIso);

  const movies = useMemo(() => {
    const pages = data?.pages || [];
    return pages.flatMap((page: any) =>
      (page?.results || []).map((m: any) => ({...m, type: 'movie' as const})),
    );
  }, [data]);

  const onSeeAllPress = useCallback(() => {
    const categoryLabel = CATEGORIES.find(c => c.key === activeCategory)?.label;
    const sortBy =
      activeCategory === 'latest'
        ? 'release_date.desc'
        : activeCategory === 'top_rated'
        ? 'vote_average.desc'
        : 'popularity.desc';

    navigateWithLimit('Category', {
      title: `${categoryLabel} Movies in ${languageName}`,
      contentType: 'movie',
      filter: {
        with_original_language: languageIso,
        sort_by: sortBy,
        ...(activeCategory === 'top_rated' && {'vote_count.gte': 100}),
      },
    });
  }, [navigateWithLimit, activeCategory, languageName, languageIso]);

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
      <Text style={styles.sectionTitle}>{languageName} Movies in</Text>

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
            No {CATEGORIES.find(c => c.key === activeCategory)?.label.toLowerCase()} movies available in {languageName}
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
    minHeight: 200,
  },
  emptyText: {
    color: colors.text.secondary,
    ...typography.body2,
    textAlign: 'center',
  },
});
