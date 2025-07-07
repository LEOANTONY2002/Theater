import React, {useState, useCallback, useEffect, useMemo} from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Text,
  ScrollView,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import {
  useMovieSearch,
  useTrendingMovies,
  useDiscoverMovies,
} from '../hooks/useMovies';
import {
  useTVShowSearch,
  useTrendingTVShows,
  useDiscoverTVShows,
} from '../hooks/useTVShows';
import {MovieList, ContentItem} from '../components/MovieList';
import {Movie} from '../types/movie';
import {TVShow} from '../types/tvshow';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {HorizontalList} from '../components/HorizontalList';
import {TrendingGrid} from '../components/TrendingGrid';
import {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
} from '../styles/theme';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../types/navigation';
import {FilterModal} from '../components/FilterModal';
import {FilterParams} from '../types/filters';
import {useTrending} from '../hooks/useApp';
import {useNavigationState} from '../hooks/useNavigationState';
import {useQueryClient} from '@tanstack/react-query';
import {SettingsManager} from '../store/settings';
import {BlurView} from '@react-native-community/blur';

type SearchScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const RECENT_ITEMS_KEY = '@recent_search_items';
const MAX_RECENT_ITEMS = 10;

const getItemTitle = (item: ContentItem) => {
  if (item.type === 'movie') {
    return item.title;
  }
  return item.name;
};

const NoResults = () => (
  <View style={styles.noResultsContainer}>
    <Icon name="search-outline" size={64} color={colors.text.secondary} />
    <Text style={styles.noResultsTitle}>No Results Found</Text>
    <Text style={styles.noResultsSubtext}>
      Try checking your spelling or using different keywords
    </Text>
  </View>
);

export const SearchScreen = () => {
  const navigation = useNavigation<SearchScreenNavigationProp>();
  const {navigateWithLimit} = useNavigationState();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [recentItems, setRecentItems] = useState<ContentItem[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterParams>({});
  const [contentType, setContentType] = useState<'all' | 'movie' | 'tv'>('all');
  const queryClient = useQueryClient();

  // Get trending content
  const {data: trendingMovies, isLoading: isLoadingTrendingMovies} =
    useTrendingMovies('day');

  const {data: trendingTVShows, isLoading: isLoadingTrendingTV} =
    useTrendingTVShows('day');

  // Search or discover based on query
  const {
    data: movieData,
    fetchNextPage: fetchNextMoviePage,
    hasNextPage: hasNextMoviePage,
    isFetchingNextPage: isFetchingMoviePage,
    refetch: refetchMovies,
    isLoading: isLoadingMovies,
    isError: isMovieError,
  } = debouncedQuery
    ? useMovieSearch(debouncedQuery, activeFilters)
    : useDiscoverMovies(activeFilters);

  const {
    data: tvData,
    fetchNextPage: fetchNextTVPage,
    hasNextPage: hasNextTVPage,
    isFetchingNextPage: isFetchingTVPage,
    refetch: refetchTV,
    isLoading: isLoadingTV,
    isError: isTVError,
  } = debouncedQuery
    ? useTVShowSearch(debouncedQuery, activeFilters)
    : useDiscoverTVShows(activeFilters);

  const movies =
    movieData?.pages.flatMap(page =>
      page.results.map((movie: Movie) => ({...movie, type: 'movie' as const})),
    ) || [];
  const tvShows =
    tvData?.pages.flatMap(page =>
      page.results.map((show: TVShow) => ({...show, type: 'tv' as const})),
    ) || [];

  // trending
  const {
    data: trendingData,
    isLoading: isLoadingTrending,
    fetchNextPage: fetchNextTrendingPage,
    hasNextPage: hasNextTrendingPage,
    isFetchingNextPage: isFetchingTrendingPage,
  } = useTrending('day');

  // Load recent items on mount
  useEffect(() => {
    const loadRecentItems = async () => {
      try {
        const savedItems = await AsyncStorage.getItem(RECENT_ITEMS_KEY);
        if (savedItems) {
          setRecentItems(JSON.parse(savedItems));
        }
      } catch (error) {
        console.error('Error loading recent items:', error);
      }
    };
    loadRecentItems();
  }, []);

  // Save recent item
  const saveRecentItem = async (item: ContentItem) => {
    try {
      const savedItems = await AsyncStorage.getItem(RECENT_ITEMS_KEY);
      const currentItems: ContentItem[] = savedItems
        ? JSON.parse(savedItems)
        : [];

      const updatedItems = [
        item,
        ...currentItems.filter(i => i.id !== item.id),
      ].slice(0, MAX_RECENT_ITEMS);

      setRecentItems(updatedItems);
      await AsyncStorage.setItem(
        RECENT_ITEMS_KEY,
        JSON.stringify(updatedItems),
      );
    } catch (error) {
      console.error('Error saving recent item:', error);
    }
  };

  // Clear all recent items
  const clearRecentItems = async () => {
    try {
      await AsyncStorage.removeItem(RECENT_ITEMS_KEY);
      setRecentItems([]);
    } catch (error) {
      console.error('Error clearing recent items:', error);
    }
  };

  const handleClearSearch = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    // Don't reset filters when clearing search
  }, []);

  const handleResetFilters = useCallback(() => {
    setActiveFilters({});
    setContentType('all');
    // Refetch data with cleared filters
    refetchMovies();
    refetchTV();
  }, [refetchMovies, refetchTV]);

  const handleApplyFilters = useCallback(
    (filters: FilterParams, selectedContentType: 'all' | 'movie' | 'tv') => {
      setActiveFilters(filters);
      setContentType(selectedContentType);
      setShowFilters(false);

      // Always refetch when applying filters, regardless of search state
      refetchMovies();
      refetchTV();
    },
    [refetchMovies, refetchTV],
  );

  // Debounce search query
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      // When search query changes, refetch with current filters
      if (query !== debouncedQuery) {
        refetchMovies();
        refetchTV();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query, debouncedQuery, refetchMovies, refetchTV]);

  const handleItemPress = useCallback(
    (item: ContentItem) => {
      // Save to recent searches
      saveRecentItem(item);

      if (item.type === 'movie') {
        navigateWithLimit('MovieDetails', {movie: item as Movie});
      } else {
        navigateWithLimit('TVShowDetails', {show: item as TVShow});
      }
    },
    [navigateWithLimit, saveRecentItem],
  );

  const isLoading = isLoadingMovies || isLoadingTV;
  const hasError = isMovieError || isTVError;
  const hasNoResults =
    !isLoading && !hasError && movies.length === 0 && tvShows.length === 0;

  const applyContentTypeFilter = useCallback(
    (content: ContentItem[]) => {
      if (contentType === 'all') {
        return content;
      }
      return content.filter(item => item.type === contentType);
    },
    [contentType],
  );

  const applySearchFilters = useCallback(
    (content: ContentItem[]) => {
      if (!debouncedQuery || !Object.keys(activeFilters).length) {
        return content;
      }

      return content.filter(item => {
        // Filter by rating
        if (activeFilters['vote_average.gte'] !== undefined) {
          if (item.vote_average < activeFilters['vote_average.gte']) {
            return false;
          }
        }

        // Filter by date
        if (item.type === 'movie') {
          if (activeFilters['primary_release_date.gte'] && item.release_date) {
            if (item.release_date < activeFilters['primary_release_date.gte']) {
              return false;
            }
          }
          if (activeFilters['primary_release_date.lte'] && item.release_date) {
            if (item.release_date > activeFilters['primary_release_date.lte']) {
              return false;
            }
          }
        } else {
          if (activeFilters['first_air_date.gte'] && item.first_air_date) {
            if (item.first_air_date < activeFilters['first_air_date.gte']) {
              return false;
            }
          }
          if (activeFilters['first_air_date.lte'] && item.first_air_date) {
            if (item.first_air_date > activeFilters['first_air_date.lte']) {
              return false;
            }
          }
        }

        // Filter by language
        if (activeFilters.with_original_language && item.original_language) {
          if (item.original_language !== activeFilters.with_original_language) {
            return false;
          }
        }

        return true;
      });
    },
    [debouncedQuery, activeFilters],
  );

  const applySorting = useCallback(
    (content: ContentItem[]) => {
      if (!activeFilters.sort_by) {
        return content;
      }

      const [field, order] = activeFilters.sort_by.split('.');
      const multiplier = order === 'desc' ? -1 : 1;

      return [...content].sort((a, b) => {
        let aValue = a[field as keyof typeof a];
        let bValue = b[field as keyof typeof b];

        // Handle special cases for different field names between movies and TV shows
        if (field === 'title') {
          aValue = a.type === 'movie' ? (a as Movie).title : (a as TVShow).name;
          bValue = b.type === 'movie' ? (b as Movie).title : (b as TVShow).name;
        } else if (field === 'release_date') {
          aValue =
            a.type === 'movie'
              ? (a as Movie).release_date
              : (a as TVShow).first_air_date;
          bValue =
            b.type === 'movie'
              ? (b as Movie).release_date
              : (b as TVShow).first_air_date;
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return multiplier * aValue.localeCompare(bValue);
        }
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return multiplier * (aValue - bValue);
        }
        return 0;
      });
    },
    [activeFilters.sort_by],
  );

  const combinedContent = useMemo(() => {
    return [...movies, ...tvShows];
  }, [movies, tvShows]);

  const displayedContent = useMemo(() => {
    let filteredContent = applyContentTypeFilter(combinedContent);
    filteredContent = applySearchFilters(filteredContent);
    return applySorting(filteredContent);
  }, [
    combinedContent,
    applyContentTypeFilter,
    applySearchFilters,
    applySorting,
  ]);

  const hasActiveFilters = Object.keys(activeFilters).length > 0;
  const showSearchResults = debouncedQuery.length > 0 || hasActiveFilters;

  useEffect(() => {
    const handleSettingsChange = () => {
      queryClient.invalidateQueries({queryKey: ['movies']});
      queryClient.invalidateQueries({queryKey: ['tvshows']});
      queryClient.invalidateQueries({queryKey: ['discover_movies']});
      queryClient.invalidateQueries({queryKey: ['discover_tv']});
    };
    SettingsManager.addChangeListener(handleSettingsChange);
    return () => {
      SettingsManager.removeChangeListener(handleSettingsChange);
    };
  }, [queryClient]);

  return (
    <View style={[styles.container, {flex: 1}]}>
      <View style={styles.header}>
        <BlurView
          style={styles.blurView}
          blurType="dark"
          blurAmount={10}
          overlayColor={colors.modal.blur}
          reducedTransparencyFallbackColor={colors.modal.blur}
          pointerEvents="none"
        />
        <View style={styles.searchContainer}>
          <Icon
            name="search-outline"
            size={24}
            color={colors.text.tertiary}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search movies & TV shows..."
            placeholderTextColor={colors.text.tertiary}
            value={query}
            onChangeText={setQuery}
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={handleClearSearch}
              style={styles.clearButton}>
              <Icon
                name="close-circle"
                size={20}
                color={colors.text.tertiary}
              />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[
            styles.filterButton,
            hasActiveFilters && styles.filterButtonActive,
          ]}
          onPress={() => setShowFilters(true)}>
          <Icon
            name="options-outline"
            size={24}
            color={
              hasActiveFilters ? colors.text.primary : colors.text.tertiary
            }
          />
        </TouchableOpacity>
      </View>

      <View style={{flex: 1}}>
        {!showSearchResults ? (
          <FlatList
            style={{paddingTop: 120}}
            data={[{key: 'content'}]}
            renderItem={() => (
              <>
                {recentItems.length > 0 && (
                  <View style={styles.recentItemsContainer}>
                    <View style={styles.recentItemsHeader}>
                      <Text style={styles.sectionTitle}>Recent Searches</Text>
                      <TouchableOpacity onPress={clearRecentItems}>
                        <Text style={styles.clearAllText}>Clear All</Text>
                      </TouchableOpacity>
                    </View>
                    <HorizontalList
                      title="V2"
                      data={recentItems}
                      onItemPress={handleItemPress}
                      isLoading={false}
                    />
                  </View>
                )}

                <TrendingGrid
                  data={
                    trendingData?.pages?.flatMap((page: any) =>
                      page.results.map((item: any) => ({
                        ...item,
                        type: item.media_type === 'movie' ? 'movie' : 'tv',
                      })),
                    ) || []
                  }
                  onItemPress={handleItemPress}
                  isLoading={isLoadingTrending}
                  fetchNextPage={fetchNextTrendingPage}
                  hasNextPage={hasNextTrendingPage}
                  isFetchingNextPage={isFetchingTrendingPage}
                />
              </>
            )}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={{flex: 1}}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.text.muted} />
                <Text style={styles.loadingText}>
                  {debouncedQuery ? 'Searching...' : 'Applying filters...'}
                </Text>
              </View>
            ) : hasError ? (
              <View style={styles.errorContainer}>
                <Icon
                  name="alert-circle-outline"
                  size={64}
                  color={colors.status.error}
                />
                <Text style={styles.errorTitle}>Oops!</Text>
                <Text style={styles.errorText}>
                  Something went wrong. Please try again.
                </Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => {
                    refetchMovies();
                    refetchTV();
                  }}>
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : hasNoResults ? (
              <NoResults />
            ) : (
              <MovieList
                data={displayedContent}
                isLoading={isFetchingMoviePage || isFetchingTVPage}
                onMoviePress={handleItemPress}
                onLoadMore={
                  contentType === 'all'
                    ? hasNextMoviePage || hasNextTVPage
                      ? () => {
                          if (hasNextMoviePage) fetchNextMoviePage();
                          if (hasNextTVPage) fetchNextTVPage();
                        }
                      : undefined
                    : contentType === 'movie'
                    ? hasNextMoviePage
                      ? fetchNextMoviePage
                      : undefined
                    : hasNextTVPage
                    ? fetchNextTVPage
                    : undefined
                }
              />
            )}
          </View>
        )}
      </View>

      <FilterModal
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        onApply={handleApplyFilters}
        initialFilters={activeFilters}
        initialContentType={contentType}
        onReset={handleResetFilters}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    backgroundColor: 'transparent',
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 1,
    overflow: 'hidden',
    paddingVertical: spacing.md,
    margin: 20,
    borderRadius: borderRadius.round,
  },
  blurView: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.modal.content,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.modal.border,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 48,
    color: colors.text.primary,
    ...typography.body1,
  },
  clearButton: {
    padding: spacing.xs,
  },
  recentItemsContainer: {
    paddingTop: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.card.border,
  },
  recentItemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  sectionTitle: {
    color: colors.text.primary,
    ...typography.h3,
    marginBottom: spacing.sm,
  },
  clearAllText: {
    color: colors.text.muted,
    ...typography.body2,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 400,
  },
  loadingText: {
    color: colors.text.muted,
    ...typography.body1,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  errorTitle: {
    color: colors.text.primary,
    ...typography.h2,
    marginTop: spacing.md,
  },
  errorText: {
    color: colors.text.secondary,
    ...typography.body1,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  retryButton: {
    backgroundColor: colors.button.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.xl,
  },
  retryText: {
    color: colors.text.primary,
    ...typography.body1,
    fontWeight: '600',
  },
  noResultsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    width: '100%',
  },
  noResultsTitle: {
    color: colors.text.muted,
    ...typography.h2,
    marginTop: spacing.md,
  },
  noResultsText: {
    color: colors.text.muted,
    ...typography.body1,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  noResultsSubtext: {
    color: colors.text.muted,
    ...typography.body2,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.round,
    backgroundColor: colors.modal.content,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
    borderWidth: 1,
    borderColor: colors.modal.border,
  },
  filterButtonActive: {
    borderWidth: 1,
    borderColor: colors.modal.activeBorder,
  },
});
