import React, {useState, useCallback, useEffect, useMemo} from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
} from 'react-native';
import {useMovieSearch} from '../hooks/useMovies';
import {useTVShowSearch} from '../hooks/useTVShows';
import {
  useEnhancedMovieSearch,
  useEnhancedTVSearch,
} from '../hooks/useEnhancedSearch';
import {MovieList, ContentItem} from '../components/MovieList';
import {Movie} from '../types/movie';
import {TVShow} from '../types/tvshow';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {HorizontalList} from '../components/HorizontalList';
import {TrendingGrid} from '../components/TrendingGrid';
import {colors, spacing, borderRadius, typography} from '../styles/theme';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../types/navigation';
import {FilterModal} from '../components/FilterModal';
import {FilterParams, SavedFilter} from '../types/filters';
import {useTrending} from '../hooks/useApp';
import {useNavigationState} from '../hooks/useNavigationState';
import {useQueryClient, useQuery} from '@tanstack/react-query';
import {SettingsManager} from '../store/settings';
import {BlurView} from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import FastImage from 'react-native-fast-image';
import {GradientButton} from '../components/GradientButton';
import {GradientSpinner} from '../components/GradientSpinner';
import {FiltersManager} from '../store/filters';
import {useWatchlists, useWatchlistItems} from '../hooks/useWatchlists';
import {HomeFilterRow} from '../components/HomeFilterRow';
import {useAIEnabled} from '../hooks/useAIEnabled';
import CreateButton from '../components/createButton';

type SearchScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const RECENT_ITEMS_KEY = '@recent_search_items';
const MAX_RECENT_ITEMS = 10;

const NoResults = ({query}: {query: string}) => (
  <View style={styles.noResultsContainer}>
    <LinearGradient
      style={{
        position: 'absolute',
        top: 53,
        width: '60%',
        height: 300,
        zIndex: 1,
        marginLeft: 30,
        transform: [{rotateX: '50deg'}],
      }}
      colors={[colors.background.secondary, 'transparent']}
    />
    <Image
      source={require('../assets/cat.png')}
      style={{width: 220, opacity: 0.5, marginBottom: -30}}
      resizeMode="contain"
    />
    <View style={{position: 'relative'}}>
      <LinearGradient
        style={{
          position: 'absolute',
          bottom: 0,
          width: '100%',
          height: 40,
          zIndex: 1,
        }}
        colors={['transparent', colors.background.primary]}
      />
      <Text style={styles.noResultsTitle}>No results found</Text>
    </View>
  </View>
);

type TabType = 'trending' | 'filters' | 'watchlists';

export const SearchScreen = React.memo(() => {
  const {navigateWithLimit} = useNavigationState();
  const {isAIEnabled} = useAIEnabled();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [recentItems, setRecentItems] = useState<ContentItem[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterParams>({});
  const [contentType, setContentType] = useState<'all' | 'movie' | 'tv'>('all');
  const [activeTab, setActiveTab] = useState<TabType>('trending');
  const queryClient = useQueryClient();

  // Get real saved filters data
  const {data: savedFilters = []} = useQuery({
    queryKey: ['savedFilters'],
    queryFn: FiltersManager.getSavedFilters,
  });

  // Get real watchlists data
  const {data: watchlists = []} = useWatchlists();

  // Search or discover based on query - use enhanced search for better filtering
  const {
    data: movieData,
    fetchNextPage: fetchNextMoviePage,
    hasNextPage: hasNextMoviePage,
    isFetchingNextPage: isFetchingMoviePage,
    refetch: refetchMovies,
    isLoading: isLoadingMovies,
    isError: isMovieError,
  } = useEnhancedMovieSearch(debouncedQuery, activeFilters);

  const {
    data: tvData,
    fetchNextPage: fetchNextTVPage,
    hasNextPage: hasNextTVPage,
    isFetchingNextPage: isFetchingTVPage,
    refetch: refetchTV,
    isLoading: isLoadingTV,
    isError: isTVError,
  } = useEnhancedTVSearch(debouncedQuery, activeFilters);

  const movies = movieData?.pages.flatMap(page => page.results) || [];
  const tvShows = tvData?.pages.flatMap(page => page.results) || [];

  const navigation = useNavigation();

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
      // Do NOT clear the query or manually refetch here.
    },
    [],
  );

  // Debounce search query
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      // When search query changes, refetch with current filters
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

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

  console.log('hasNoResults', hasNoResults);

  const applyContentTypeFilter = useCallback(
    (content: ContentItem[]) => {
      if (contentType === 'all') {
        return content;
      }
      return content.filter(item => item.type === contentType);
    },
    [contentType, query],
  );

  const applySorting = useCallback(
    (content: ContentItem[]) => {
      // If query has value and activeFilters is empty, sort by popularity desc
      if (query && Object.keys(activeFilters).length === 0) {
        return [...content].sort((a, b) => b.popularity - a.popularity);
      }

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
    [activeFilters.sort_by, query, activeFilters],
  );

  const combinedContent = useMemo(() => {
    return [...movies, ...tvShows];
  }, [movies, tvShows]);

  const displayedContent = useMemo(() => {
    // Enhanced search hooks already handle filtering, so we just need content type filtering and sorting
    let filteredContent = applyContentTypeFilter(combinedContent);
    return applySorting(filteredContent);
  }, [combinedContent, applyContentTypeFilter, applySorting]);

  console.log('displayedContent', displayedContent);

  const hasActiveFilters = Object.keys(activeFilters).length > 0;
  const showSearchResults = debouncedQuery.length > 0 || hasActiveFilters;

  // Tab rendering functions
  const renderTabButton = (tab: TabType, label: string) => (
    <TouchableOpacity
      key={tab}
      style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
      onPress={() => setActiveTab(tab)}>
      <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderTrendingContent = () => (
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
  );

  const renderFiltersContent = () => {
    return (
      <View>
        {savedFilters.length > 0 ? (
          savedFilters.map((filter: SavedFilter) => (
            <HomeFilterRow key={filter.id} savedFilter={filter} />
          ))
        ) : (
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: 100,
            }}>
            <Text style={styles.emptyStateTitle}>No Filters Yet</Text>
            <Text style={styles.emptyStateText}>
              Create your first filter to apply on the search
            </Text>
            <CreateButton
              onPress={() =>
                navigation.navigate('MySpace', {screen: 'MyFiltersScreen'})
              }
              title="Go to My Filter"
              icon={null}
            />
          </View>
        )}
      </View>
    );
  };

  const renderWatchlistsContent = () => {
    return (
      <View>
        {watchlists?.length > 0 ? (
          watchlists.map(watchlist => (
            <WatchlistRow
              key={watchlist.id}
              watchlist={watchlist}
              onItemPress={handleItemPress}
              navigation={navigation}
            />
          ))
        ) : (
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: 100,
            }}>
            <Text style={styles.emptyStateTitle}>No Watchlists Yet</Text>
          </View>
        )}
      </View>
    );
  };

  // Separate component to handle individual watchlist rendering
  const WatchlistRow = ({watchlist, onItemPress, navigation}: any) => {
    const {data: watchlistItems = []} = useWatchlistItems(watchlist.id);

    // Transform watchlist items to ContentItem format
    const transformedItems = watchlistItems.map((item: any) => {
      if (item.type === 'tv') {
        return {
          ...item,
          type: 'tv' as const,
          name: item.name || item.title || '',
          first_air_date: item.first_air_date || item.release_date || '',
          genre_ids: item.genre_ids || [],
          original_language: item.original_language || 'en',
          origin_country: item.origin_country || [],
        };
      } else {
        return {
          ...item,
          type: 'movie' as const,
          title: item.title || item.name || '',
          originalTitle: item.originalTitle || item.title || item.name || '',
          release_date: item.release_date || item.first_air_date || '',
          genre_ids: item.genre_ids || [],
          original_language: item.original_language || 'en',
          adult: false,
          video: false,
        };
      }
    });

    return (
      <HorizontalList
        title={watchlist.name}
        data={transformedItems}
        isLoading={false}
        onItemPress={onItemPress}
        onSeeAllPress={() => {
          navigation.navigate('Main', {
            screen: 'MySpace',
            params: {
              screen: 'WatchlistDetails',
              params: {
                watchlistId: watchlist.id,
              },
            },
          });
        }}
      />
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'trending':
        return renderTrendingContent();
      case 'filters':
        return renderFiltersContent();
      case 'watchlists':
        return renderWatchlistsContent();
      default:
        return renderTrendingContent();
    }
  };

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
    <View style={styles.container}>
      <View style={styles.header}>
        <BlurView
          style={styles.blurView}
          blurType="dark"
          blurAmount={10}
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
            color={hasActiveFilters ? colors.text.primary : colors.modal.active}
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
                <View
                  style={{
                    justifyContent: 'center',
                    margin: spacing.md,
                    padding: spacing.md,
                    borderWidth: 1,
                    borderBottomWidth: 0,
                    borderColor: colors.modal.border,
                    borderRadius: borderRadius.lg,
                    maxWidth: 400,
                    alignSelf: 'center',
                  }}>
                  <LinearGradient
                    colors={[
                      'transparent',
                      colors.background.primary,
                      colors.background.primary,
                    ]}
                    pointerEvents="none"
                    style={{
                      width: '180%',
                      height: '130%',
                      position: 'absolute',
                      bottom: -25,
                      left: -50,
                      zIndex: 0,
                      transform: [{rotate: '-15deg'}],
                    }}
                    start={{x: 0, y: 0}}
                    end={{x: 0, y: 1}}
                  />
                  <View
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}>
                    <FastImage
                      source={require('../assets/theater.png')}
                      style={{width: 60, height: 60}}
                    />
                    <View>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: 400,
                          color: 'rgb(255, 240, 253)',
                        }}>
                        Explore with Theater AI
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: 400,
                          color: 'rgba(198, 150, 215, 0.87)',
                        }}>
                        Find your next worthy movie or TV show to watch
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      if (isAIEnabled) {
                        navigation.navigate('Main', {
                          screen: 'MySpace',
                          params: {screen: 'OnlineAIScreen'},
                        });
                      } else {
                        navigation.navigate('Main', {
                          screen: 'MySpace',
                          params: {screen: 'AISettingsScreen'},
                        });
                      }
                    }}>
                    <LinearGradient
                      colors={[colors.primary, colors.secondary]}
                      start={{x: 0, y: 0}}
                      end={{x: 1, y: 0}}
                      style={{
                        padding: 10,
                        paddingHorizontal: 25,
                        borderRadius: 50,
                        marginTop: 15,
                        alignItems: 'center',
                      }}>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: colors.text.primary,
                        }}>
                        Ask AI
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                {/* Tab Navigation */}
                <View style={styles.tabContainer}>
                  {renderTabButton('trending', 'Trending')}
                  {renderTabButton('filters', 'My Filters')}
                  {renderTabButton('watchlists', 'My Watchlists')}
                </View>

                {/* Tab Content */}
                {renderTabContent()}
                <View style={{height: 200}} />
              </>
            )}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <GradientSpinner
                  size={30}
                  thickness={3}
                  style={{
                    alignItems: 'center',
                    alignSelf: 'center',
                  }}
                  colors={[
                    colors.modal.activeBorder,
                    colors.modal.activeBorder,
                    colors.transparent,
                    colors.transparentDim,
                  ]}
                />
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
            ) : hasNoResults || displayedContent.length === 0 ? (
              <NoResults query={debouncedQuery} />
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
          </>
        )}
      </View>

      <FilterModal
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        onApply={handleApplyFilters}
        initialFilters={activeFilters}
        initialContentType={contentType}
        onReset={handleResetFilters}
        savedFilters={[]}
      />
    </View>
  );
});

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
    // backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.modal.active,
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
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.round,
    // backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
    borderWidth: 1,
    borderColor: colors.modal.active,
  },
  filterButtonActive: {
    borderWidth: 1,
    borderColor: colors.modal.border,
    backgroundColor: colors.modal.active,
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
    marginTop: spacing.sm,
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
    color: colors.text.muted,
    fontSize: 40,
    opacity: 0.5,
    fontWeight: '900',
    textAlign: 'center',
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
  // Tab styles
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
    marginVertical: spacing.md,
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
  tabContent: {
    padding: spacing.md,
  },
  sectionSubtitle: {
    color: colors.text.secondary,
    ...typography.body2,
    marginBottom: spacing.lg,
  },
  // Filter tab styles
  currentFiltersContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  currentFiltersTitle: {
    color: colors.text.primary,
    ...typography.h3,
    marginBottom: spacing.sm,
  },
  filterChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  filterChip: {
    backgroundColor: colors.modal.active,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  filterChipText: {
    color: colors.text.primary,
    ...typography.caption,
  },
  saveFilterButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  saveFilterText: {
    color: colors.text.primary,
    ...typography.body2,
    fontWeight: '600',
  },
  createFilterButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  createFilterButtonText: {
    color: colors.text.primary,
    ...typography.body2,
    fontWeight: '600',
  },
  savedFiltersContainer: {
    marginTop: spacing.md,
  },
  savedFiltersTitle: {
    color: colors.text.primary,
    ...typography.h3,
    marginBottom: spacing.md,
  },
  savedFilterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  savedFilterInfo: {
    flex: 1,
  },
  savedFilterName: {
    color: colors.text.primary,
    ...typography.body1,
    fontWeight: '600',
  },
  savedFilterDetails: {
    color: colors.text.secondary,
    ...typography.caption,
    marginTop: spacing.xs,
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyStateTitle: {
    color: colors.text.primary,
    ...typography.h3,
    marginTop: spacing.md,
  },
  emptyStateText: {
    color: colors.text.secondary,
    ...typography.body2,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  // Watchlist tab styles
  watchlistsContainer: {
    marginTop: spacing.md,
  },
  watchlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  watchlistIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.round,
    backgroundColor: colors.modal.active,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  watchlistInfo: {
    flex: 1,
  },
  watchlistName: {
    color: colors.text.primary,
    ...typography.body1,
    fontWeight: '600',
  },
  watchlistDescription: {
    color: colors.text.secondary,
    ...typography.caption,
    marginTop: spacing.xs,
  },
});
