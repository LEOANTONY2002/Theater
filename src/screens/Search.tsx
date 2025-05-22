import React, {useState, useCallback, useEffect} from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Text,
  ScrollView,
  ActivityIndicator,
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

type SearchScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const RECENT_ITEMS_KEY = '@recent_items';
const MAX_RECENT_ITEMS = 10;

const getItemTitle = (item: ContentItem) => {
  if (item.type === 'movie') {
    return item.title;
  }
  return item.name;
};

const NoResults = ({query}: {query: string}) => (
  <View style={styles.noResultsContainer}>
    <Icon name="search-outline" size={64} color={colors.text.secondary} />
    <Text style={styles.noResultsTitle}>No Results Found</Text>
    <Text style={styles.noResultsText}>
      We couldn't find any matches for "{query}"
    </Text>
    <Text style={styles.noResultsSubtext}>
      Try checking your spelling or using different keywords
    </Text>
  </View>
);

export const SearchScreen = () => {
  const navigation = useNavigation<SearchScreenNavigationProp>();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [recentItems, setRecentItems] = useState<ContentItem[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterParams>({});
  const [contentType, setContentType] = useState<'movie' | 'tv'>('movie');

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
    ? useMovieSearch(debouncedQuery)
    : useDiscoverMovies({...activeFilters, include_adult: true});

  const {
    data: tvData,
    fetchNextPage: fetchNextTVPage,
    hasNextPage: hasNextTVPage,
    isFetchingNextPage: isFetchingTVPage,
    refetch: refetchTV,
    isLoading: isLoadingTV,
    isError: isTVError,
  } = debouncedQuery
    ? useTVShowSearch(debouncedQuery)
    : useDiscoverTVShows({...activeFilters, include_adult: true});

  const movies =
    movieData?.pages.flatMap(page =>
      page.results.map((movie: Movie) => ({...movie, type: 'movie' as const})),
    ) || [];
  const tvShows =
    tvData?.pages.flatMap(page =>
      page.results.map((show: TVShow) => ({...show, type: 'tv' as const})),
    ) || [];

  // Combine and transform trending data
  const trendingData = React.useMemo(() => {
    const movies =
      trendingMovies?.pages[0]?.results.map((movie: Movie) => ({
        ...movie,
        type: 'movie' as const,
      })) || [];

    const shows =
      trendingTVShows?.pages[0]?.results.map((show: TVShow) => ({
        ...show,
        type: 'tv' as const,
      })) || [];

    // Combine and shuffle the arrays
    const combined = [...movies, ...shows];
    return combined.sort(() => Math.random() - 0.5);
  }, [trendingMovies, trendingTVShows]);

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

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  const handleItemPress = useCallback(
    (item: ContentItem) => {
      saveRecentItem(item);
      if (item.type === 'movie') {
        navigation.navigate('MovieDetails', {movie: item as Movie});
      } else {
        navigation.navigate('TVShowDetails', {show: item as TVShow});
      }
    },
    [navigation],
  );

  const handleApplyFilters = useCallback(
    (filters: FilterParams, selectedContentType: 'movie' | 'tv') => {
      setActiveFilters(filters);
      setContentType(selectedContentType);
      setShowFilters(false);
    },
    [],
  );

  const isLoading = isLoadingMovies || isLoadingTV;
  const hasError = isMovieError || isTVError;
  const hasNoResults =
    !isLoading && !hasError && movies.length === 0 && tvShows.length === 0;

  const displayedContent = contentType === 'movie' ? movies : tvShows;
  const hasActiveFilters = Object.keys(activeFilters).length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Icon
            name="search-outline"
            size={24}
            color={colors.text.secondary}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search movies & TV shows..."
            placeholderTextColor={colors.text.secondary}
            value={query}
            onChangeText={setQuery}
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => setQuery('')}
              style={styles.clearButton}>
              <Icon
                name="close-circle"
                size={20}
                color={colors.text.secondary}
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
            color={hasActiveFilters ? colors.primary : colors.text.secondary}
          />
        </TouchableOpacity>
      </View>

      {query.length === 0 ? (
        <ScrollView>
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
            data={trendingData}
            onItemPress={handleItemPress}
            isLoading={isLoadingTrendingMovies || isLoadingTrendingTV}
          />
        </ScrollView>
      ) : (
        <>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Searching...</Text>
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
            <NoResults query={debouncedQuery} />
          ) : (
            <MovieList
              data={displayedContent}
              isLoading={isFetchingMoviePage || isFetchingTVPage}
              onMoviePress={handleItemPress}
              onLoadMore={
                contentType === 'movie'
                  ? hasNextMoviePage
                    ? fetchNextMoviePage
                    : undefined
                  : hasNextTVPage
                  ? fetchNextTVPage
                  : undefined
              }
            />
          )}
        </>
      )}

      <FilterModal
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        onApply={handleApplyFilters}
        initialFilters={activeFilters}
        initialContentType={contentType}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: spacing.lg,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card.background,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.card.border,
    ...shadows.small,
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
  },
  clearAllText: {
    color: colors.status.error,
    ...typography.body2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.text.primary,
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  noResultsTitle: {
    color: colors.text.primary,
    ...typography.h2,
    marginTop: spacing.md,
  },
  noResultsText: {
    color: colors.text.secondary,
    ...typography.body1,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  noResultsSubtext: {
    color: colors.text.secondary,
    ...typography.body2,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  filterButtonActive: {
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.primary,
  },
});
