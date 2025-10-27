import React, {useState, useCallback, useEffect, useMemo} from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Text,
  FlatList,
  Image,
  ScrollView,
  Platform,
} from 'react-native';
import {
  useEnhancedMovieSearch,
  useEnhancedTVSearch,
} from '../hooks/useEnhancedSearch';
import {MovieList, ContentItem} from '../components/MovieList';
import {Movie} from '../types/movie';
import {TVShow} from '../types/tvshow';
import {
  useIsFocused,
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {SearchStackParamList} from '../types/navigation';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {HorizontalList} from '../components/HorizontalList';
import {TrendingGrid} from '../components/TrendingGrid';
import {colors, spacing, borderRadius, typography} from '../styles/theme';
import {FilterModal} from '../components/FilterModal';
import {FilterParams} from '../types/filters';
import {useTrending} from '../hooks/useApp';
import {useNavigationState} from '../hooks/useNavigationState';
import {useQueryClient} from '@tanstack/react-query';
import {SettingsManager} from '../store/settings';
import {MaybeBlurView} from '../components/MaybeBlurView';
import LinearGradient from 'react-native-linear-gradient';
import FastImage from 'react-native-fast-image';
import {GradientSpinner} from '../components/GradientSpinner';
import {useWatchlists, useWatchlistItems} from '../hooks/useWatchlists';
import {useAIEnabled} from '../hooks/useAIEnabled';
import {HistoryManager} from '../store/history';
import {useResponsive} from '../hooks/useResponsive';
import {MicButton} from '../components/MicButton';
import {AISearchFilterBuilder} from '../components/AISearchFilterBuilder';

const RECENT_ITEMS_KEY = '@recent_search_items';
const MAX_RECENT_ITEMS = 10;

const NoResults = ({query}: {query: string}) => (
  <View style={styles.noResultsContainer}>
    <Image
      source={require('../assets/search.png')}
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

type TabType = 'trending' | 'watchlists' | 'history';

export const SearchScreen = React.memo(() => {
  const {navigateWithLimit} = useNavigationState();
  const [query, setQuery] = React.useState('');
  const [debouncedQuery, setDebouncedQuery] = React.useState('');
  const [recentItems, setRecentItems] = React.useState<ContentItem[]>([]);
  const [historyItems, setHistoryItems] = React.useState<ContentItem[]>([]);
  const [activeFilters, setActiveFilters] = React.useState<FilterParams>({});
  const [contentType, setContentType] = React.useState<'all' | 'movie' | 'tv'>(
    'all',
  );
  const [showFilters, setShowFilters] = React.useState(false);
  const [showAISearch, setShowAISearch] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<TabType>('trending');
  const isFocused = useIsFocused();
  const {isAIEnabled} = useAIEnabled();
  const route = useRoute<RouteProp<SearchStackParamList, 'SearchScreen'>>();
  const queryClient = useQueryClient();
  const {isTablet} = useResponsive();

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

  // Load view history on mount and when returning to tab
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const items = await HistoryManager.getAll();
        setHistoryItems(items as unknown as ContentItem[]);
      } catch (e) {
        console.error('Error loading history items:', e);
      }
    };
    loadHistory();
    const unsubscribe = navigation.addListener('focus', loadHistory);
    return unsubscribe;
  }, [navigation]);

  const renderHistoryContent = () => {
    return (
      <View>
        {historyItems.length > 0 ? (
          <>
            <View
              style={[styles.recentItemsHeader, {marginBottom: spacing.md}]}>
              <Text style={styles.sectionTitle}></Text>
              <TouchableOpacity
                onPress={async () => {
                  await HistoryManager.clear();
                  setHistoryItems([]);
                }}>
                <Text style={styles.clearAllText}>Clear All</Text>
              </TouchableOpacity>
            </View>
            <TrendingGrid
              data={historyItems}
              onItemPress={handleItemPress}
              isLoading={false}
              fetchNextPage={() => {}}
              hasNextPage={false}
              isFetchingNextPage={false}
            />
          </>
        ) : (
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 100,
            }}>
            <Text style={styles.emptyStateTitle}>No History Yet</Text>
            <Text style={styles.emptyStateText}>
              Start watching to see your history here
            </Text>
          </View>
        )}
      </View>
    );
  };

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

  const handleApplyAIFilters = useCallback(
    (
      filters: FilterParams,
      selectedContentType: 'all' | 'movie' | 'tv',
      explanation: string,
    ) => {
      console.log('🤖 AI Filters applied:', {
        filters,
        contentType: selectedContentType,
        explanation,
        genres: filters.with_genres,
        language: filters.with_original_language,
        allFilters: filters,
      });
      setActiveFilters(filters);
      setContentType(selectedContentType);
      setQuery(''); // Clear search query when using AI filters
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
              paddingVertical: 100,
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
      case 'watchlists':
        return renderWatchlistsContent();
      case 'history':
        return renderHistoryContent();
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
      <LinearGradient
        colors={[colors.background.primary, 'transparent']}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 100,
          zIndex: 1,
        }}
      />

      <View style={styles.header}>
        {isFocused && (
          <MaybeBlurView
            style={styles.blurView}
            blurType="dark"
            blurAmount={10}
            dialog
            pointerEvents="none"
          />
        )}
        <View style={styles.searchContainer}>
          <MicButton
            onPartialText={text => {
              if (text) setQuery(text);
            }}
            onFinalText={text => {
              setQuery(text);
            }}
            locale={Platform.OS === 'android' ? 'en-US' : undefined}
            mode="hold"
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search movies & TV shows..."
            numberOfLines={1}
            placeholderTextColor={colors.text.tertiary}
            value={query}
            onChangeText={setQuery}
          />
          {isAIEnabled && (
            <TouchableOpacity
              style={styles.inlineFilterButton}
              onPress={() => setShowAISearch(true)}>
              <Icon name="sparkles" size={20} color={colors.text.muted} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.inlineFilterButton}
            onPress={() => setShowFilters(true)}>
            <Icon
              name="options-outline"
              size={20}
              color={hasActiveFilters ? colors.accent : colors.text.tertiary}
            />
          </TouchableOpacity>
          {(query.length > 0 || hasActiveFilters) && (
            <TouchableOpacity
              onPress={() => {
                if (query.length > 0) {
                  handleClearSearch();
                }
                if (hasActiveFilters) {
                  handleResetFilters();
                }
              }}
              style={styles.clearButton}>
              <Icon
                name="close-circle"
                size={20}
                color={colors.text.tertiary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View
        style={{
          flex: 1,
          // Keep mounted to preserve scroll; hide when not focused
          display: isFocused ? ('flex' as const) : ('none' as const),
        }}
        pointerEvents={isFocused ? 'auto' : 'none'}>
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
                    marginHorizontal: 50,
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
                      height: '170%',
                      position: 'absolute',
                      bottom: -25,
                      left: -50,
                      zIndex: 0,
                      transform: [{rotate: '-10deg'}],
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
                      source={require('../assets/theater.webp')}
                      style={{width: 60, height: 60}}
                    />
                    <View>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: 400,
                          color: 'rgb(255, 240, 253)',
                          fontFamily: 'Inter_18pt-Regular',
                        }}>
                        Explore with Theater AI
                      </Text>
                      <Text
                        numberOfLines={2}
                        style={{
                          fontSize: 12,
                          fontWeight: 400,
                          maxWidth: isTablet ? 400 : 200,
                          color: 'rgba(198, 150, 215, 0.87)',
                          fontFamily: 'Inter_18pt-Regular',
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
                          fontFamily: 'Inter_18pt-Regular',
                        }}>
                        Ask AI
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                {/* Tab Navigation */}
                <ScrollView
                  style={styles.tabContainer}
                  horizontal={true}
                  showsHorizontalScrollIndicator={false}>
                  {renderTabButton('trending', 'Trending')}
                  {renderTabButton('watchlists', 'My Watchlists')}
                  {renderTabButton('history', 'History')}
                </ScrollView>

                {/* Tab Content */}
                {renderTabContent()}
                <View style={{height: 300}} />
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
                  style={{
                    alignItems: 'center',
                    alignSelf: 'center',
                  }}
                  color={colors.modal.activeBorder}
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

      <AISearchFilterBuilder
        visible={showAISearch}
        onClose={() => setShowAISearch(false)}
        onApplyFilters={handleApplyAIFilters}
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
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    backgroundColor: 'transparent',
    position: 'absolute',
    top: 0,
    zIndex: 1,
    overflow: 'hidden',
    paddingVertical: spacing.sm,
    margin: 20,
    borderRadius: borderRadius.round,
    width: '90%',
    alignSelf: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.round,
  },
  searchInput: {
    flex: 1,
    height: 48,
    paddingHorizontal: spacing.sm,
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
    borderColor: colors.modal.border,
  },
  filterButtonActive: {
    borderWidth: 1,
    borderColor: colors.modal.border,
    backgroundColor: colors.modal.activeText,
  },
  inlineFilterButton: {
    padding: spacing.sm,
    marginRight: spacing.sm,
    borderRadius: borderRadius.round,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    backgroundColor: colors.modal.blur,
    borderColor: colors.modal.content,
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
    fontFamily: 'Inter_18pt-Regular',
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
    padding: spacing.xs,
    paddingHorizontal: spacing.sm,
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
