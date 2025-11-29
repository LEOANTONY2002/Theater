import React, {useState, useCallback, useEffect, useMemo, useRef} from 'react';
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
  useWindowDimensions,
  Animated,
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
import {SearchStackParamList} from '../types/navigation';
import Icon from 'react-native-vector-icons/Ionicons';
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
import {useAIEnabled} from '../hooks/useAIEnabled';
import {HistoryManager} from '../store/history';
import {RecentSearchItemsManager} from '../store/recentSearchItems';
import {useResponsive} from '../hooks/useResponsive';
import {MicButton} from '../components/MicButton';
import {aiSearch} from '../services/gemini';
import {getImageUrl} from '../services/tmdb';

const MAX_RECENT_ITEMS = 10;

type TabType = 'trending' | 'history';

export const SearchScreen = React.memo(() => {
  const {navigateWithLimit} = useNavigationState();
  const {width} = useWindowDimensions();
  const [query, setQuery] = React.useState('');
  const [debouncedQuery, setDebouncedQuery] = React.useState('');
  const [recentItems, setRecentItems] = React.useState<ContentItem[]>([]);
  const [historyItems, setHistoryItems] = React.useState<ContentItem[]>([]);
  const [activeFilters, setActiveFilters] = React.useState<FilterParams>({});
  const [contentType, setContentType] = React.useState<'all' | 'movie' | 'tv'>(
    'all',
  );
  const [showFilters, setShowFilters] = React.useState(false);
  const [isAISearchMode, setIsAISearchMode] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<TabType>('trending');
  const [isAISearching, setIsAISearching] = React.useState(false);
  const [aiResults, setAiResults] = React.useState<{
    bestMatch: any;
    moreResults: any[];
    source: 'ai' | 'tmdb_fallback';
  } | null>(null);

  // Animation refs
  const toggleAnimation = useRef(new Animated.Value(0)).current;
  const gradientOpacity = useRef(new Animated.Value(0)).current;
  const filterIconOpacity = useRef(new Animated.Value(1)).current;
  const micButtonTranslateX = useRef(new Animated.Value(0)).current;

  const isFocused = useIsFocused();
  const {isAIEnabled} = useAIEnabled();
  const route = useRoute<RouteProp<SearchStackParamList, 'SearchScreen'>>();
  const queryClient = useQueryClient();
  const {isTablet} = useResponsive();

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

  // Load view history and recent search items from Realm on mount and when returning to tab
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load history from Realm (for History tab)
        const historyData = await HistoryManager.getAll();
        setHistoryItems(historyData as unknown as ContentItem[]);

        // Load recent search items from Realm (for Recent Searches section)
        const recentSearchData = await RecentSearchItemsManager.getAll();
        const recentSearchItems = recentSearchData.slice(0, MAX_RECENT_ITEMS);
        setRecentItems(recentSearchItems as unknown as ContentItem[]);
      } catch (e) {}
    };
    loadData();
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [navigation]);

  // Animate when AI search mode changes
  useEffect(() => {
    if (isAISearchMode) {
      // Going to AI mode: fade out filter and move mic simultaneously
      Animated.parallel([
        Animated.timing(filterIconOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(micButtonTranslateX, {
          toValue: 48,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(toggleAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(gradientOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Going to normal mode: move mic back and fade in filter simultaneously
      Animated.parallel([
        Animated.timing(micButtonTranslateX, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(filterIconOpacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(toggleAnimation, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(gradientOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isAISearchMode]);

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

  // Save recent search item (clicked content from search screen) to Realm
  const saveRecentItem = async (
    item: ContentItem,
    isFromSearch: boolean = false,
  ) => {
    try {
      const itemData: any = item;

      // Save to RecentSearchItems (specific to search screen) with full data
      await RecentSearchItemsManager.add({
        id: item.id,
        type: item.type,
        isSearch: isFromSearch, // true if from search query, false if from trending
        title: itemData.title || itemData.name, // Use title or name
        name: itemData.name || itemData.title, // Use name or title
        poster_path: item.poster_path,
        backdrop_path: item.backdrop_path,
        vote_average: item.vote_average,
        release_date: itemData.release_date,
        first_air_date: itemData.first_air_date,
        overview: item.overview,
      });

      // Update local state
      const updatedItems = [
        item,
        ...recentItems.filter(i => i.id !== item.id),
      ].slice(0, MAX_RECENT_ITEMS);
      setRecentItems(updatedItems);
    } catch (error) {}
  };

  // Clear all recent search items from Realm
  const clearRecentItems = async () => {
    try {
      await RecentSearchItemsManager.clear();
      setRecentItems([]);
    } catch (error) {}
  };

  const handleClearSearch = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    setAiResults(null);
    // Don't reset filters when clearing search
  }, []);

  const handleAISearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setIsAISearching(true);
    setAiResults(null);

    try {
      const searchResults = await aiSearch({query: searchQuery});
      setAiResults(searchResults);
    } catch (error) {
      console.error('AI Search error:', error);
    } finally {
      setIsAISearching(false);
    }
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
      setActiveFilters(filters);
      setContentType(selectedContentType);
      setQuery(''); // Clear search query when using AI filters
    },
    [],
  );

  // Debounce search query - only for normal mode
  React.useEffect(() => {
    const timer = setTimeout(() => {
      // Only set debounced query for normal search mode
      if (!isAISearchMode) {
        setDebouncedQuery(query);
      } else {
        // Clear debounced query in AI mode to prevent normal search
        setDebouncedQuery('');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query, isAISearchMode]);

  // Handler for items clicked from search results (isSearch = true)
  const handleSearchItemPress = useCallback(
    (item: ContentItem) => {
      // Save to recent searches with isSearch = true
      saveRecentItem(item, true);

      if (item.type === 'movie') {
        navigateWithLimit('MovieDetails', {movie: item as Movie});
      } else {
        navigateWithLimit('TVShowDetails', {show: item as TVShow});
      }
    },
    [navigateWithLimit, saveRecentItem],
  );

  // Handler for items clicked from trending/history/watchlists (isSearch = false)
  const handleItemPress = useCallback(
    (item: ContentItem) => {
      // Save to recent searches with isSearch = false
      saveRecentItem(item, false);

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
      marginHorizontal: isTablet ? '10%' : spacing.md,
      marginTop: spacing.xl,
      marginBottom: spacing.md,
      backgroundColor: 'transparent',
      position: 'absolute',
      top: 0,
      zIndex: 10,
      overflow: 'hidden',
      paddingVertical: spacing.sm,
      margin: 20,
      borderRadius: borderRadius.round,
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
      paddingLeft: spacing.sm,
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
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
      borderColor: colors.modal.blur,
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
      flex: 1,
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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'trending':
        return renderTrendingContent();
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
      {/* Background Gradient - animated opacity */}
      <Animated.View
        style={[StyleSheet.absoluteFillObject, {opacity: gradientOpacity}]}
        pointerEvents="none">
        <LinearGradient
          colors={['rgb(18, 0, 53)', 'rgb(38, 0, 36)']}
          style={StyleSheet.absoluteFillObject}
          useAngle={true}
          angle={120}
          angleCenter={{x: 0.5, y: 0.5}}
        />
      </Animated.View>
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
          <Icon name="search" size={15} color={colors.text.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search movies & TV shows..."
            numberOfLines={1}
            placeholderTextColor={colors.text.tertiary}
            value={query}
            onChangeText={setQuery}
          />
          {!(isAISearchMode && query.trim().length > 0) && (
            <Animated.View
              style={[
                styles.inlineFilterButton,
                {
                  transform: [{translateX: micButtonTranslateX}],
                  zIndex: 10,
                },
              ]}>
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
            </Animated.View>
          )}
          {isAISearchMode && query.trim().length > 0 && (
            <Animated.View
              style={{
                transform: [{translateX: micButtonTranslateX}],
                zIndex: 10,
              }}>
              <TouchableOpacity
                style={[
                  styles.inlineFilterButton,
                  {
                    padding: 10,
                  },
                ]}
                onPress={() => handleAISearch(query.trim())}>
                <Icon name="send" size={15} color={colors.accent} />
              </TouchableOpacity>
            </Animated.View>
          )}
          <Animated.View style={{opacity: filterIconOpacity}}>
            <TouchableOpacity
              style={[
                styles.inlineFilterButton,
                {
                  padding: 10,
                },
              ]}
              onPress={() => setShowFilters(true)}
              disabled={isAISearchMode}>
              <Icon
                name="funnel"
                size={15}
                color={hasActiveFilters ? colors.accent : colors.text.tertiary}
              />
            </TouchableOpacity>
          </Animated.View>
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
        {!showSearchResults && !aiResults && !isAISearching ? (
          <FlatList
            data={[{key: 'content'}]}
            renderItem={() => (
              <>
                <View style={{height: 110}} />
                {/* AI Search Toggle */}
                {isAIEnabled && (
                  <View
                    style={{
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.md,
                      marginHorizontal: isTablet ? '10%' : spacing.md,
                      marginBottom: spacing.md,
                      borderRadius: borderRadius.lg,
                      borderWidth: 1.5,
                      borderBottomWidth: 0,
                      borderColor: colors.modal.content,
                      backgroundColor: colors.modal.blur,
                    }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: spacing.md,
                      }}>
                      {/* Sparkle Icon */}
                      <Icon name="sparkles" size={24} color={colors.accent} />

                      {/* Text Column */}
                      <View style={{flex: 1}}>
                        <Text
                          style={{
                            ...typography.body1,
                            fontWeight: '600',
                            color: colors.text.primary,
                            marginBottom: spacing.xs,
                          }}>
                          AI Search Mode
                        </Text>
                        <Text
                          style={{
                            ...typography.caption,
                            color: colors.text.muted,
                          }}>
                          Find by partial title, storyline or anything you
                          remember
                        </Text>
                      </View>

                      {/* Toggle Switch */}
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => {
                          setIsAISearchMode(!isAISearchMode);
                          if (isAISearchMode) {
                            setAiResults(null);
                          }
                        }}
                        style={{
                          width: 55,
                          height: 30,
                          borderRadius: borderRadius.round,
                          overflow: 'hidden',
                        }}>
                        <Animated.View
                          style={{
                            width: '100%',
                            height: '100%',
                            borderWidth: 1,
                            borderBottomWidth: 0,
                            borderColor: colors.modal.content,
                            borderRadius: borderRadius.round,
                            backgroundColor: toggleAnimation.interpolate({
                              inputRange: [0, 1],
                              outputRange: [
                                colors.modal.blur,
                                colors.modal.header,
                              ],
                            }),
                            justifyContent: 'center',
                            paddingHorizontal: 2,
                          }}>
                          <Animated.View
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: 12,
                              backgroundColor: toggleAnimation.interpolate({
                                inputRange: [0, 1],
                                outputRange: [
                                  colors.modal.content,
                                  colors.text.primary,
                                ],
                              }),
                              transform: [
                                {
                                  translateX: toggleAnimation.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, 22],
                                  }),
                                },
                              ],
                            }}
                          />
                        </Animated.View>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                {recentItems.length > 0 && (
                  <View style={styles.recentItemsContainer}>
                    <View style={styles.recentItemsHeader}>
                      <Text style={[styles.sectionTitle, {fontSize: 14}]}>
                        Recent Searches
                      </Text>
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
                {/* <View
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
                </View> */}

                {/* Tab Navigation */}
                <ScrollView
                  style={styles.tabContainer}
                  horizontal={true}
                  showsHorizontalScrollIndicator={false}>
                  {renderTabButton('trending', 'Trending')}
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
            {/* AI Search Toggle Button - only show in AI mode when not loading or showing results */}
            {isAIEnabled && isAISearchMode && !aiResults && !isAISearching && (
              <View
                style={{
                  paddingHorizontal: spacing.md,
                  paddingBottom: spacing.md,
                }}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    setIsAISearchMode(!isAISearchMode);
                    if (isAISearchMode) {
                      setAiResults(null);
                    }
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.md,
                    borderRadius: borderRadius.round,
                    borderWidth: 1,
                    borderColor: isAISearchMode
                      ? colors.modal.active
                      : colors.modal.border,
                    backgroundColor: isAISearchMode
                      ? colors.modal.border
                      : colors.modal.blur,
                    gap: spacing.xs,
                    alignSelf: 'center',
                  }}>
                  <Icon name="sparkles" size={16} color={colors.accent} />
                  <Text
                    style={{
                      ...typography.body2,
                      color: isAISearchMode
                        ? colors.text.primary
                        : colors.text.secondary,
                      fontWeight: isAISearchMode ? '600' : '400',
                    }}>
                    {isAISearchMode ? 'AI Search Active' : 'AI Search'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            {isAISearching ? (
              <View style={styles.loadingContainer}>
                <GradientSpinner
                  size={30}
                  style={{
                    alignItems: 'center',
                    alignSelf: 'center',
                  }}
                  color={colors.modal.activeBorder}
                />
                <Text style={styles.loadingText}>AI is thinking...</Text>
              </View>
            ) : aiResults ? (
              // AI Search Results
              <ScrollView
                style={{paddingTop: 100}}
                showsVerticalScrollIndicator={false}>
                {/* Best Match Section */}
                <View style={{alignItems: 'center', paddingTop: spacing.xl}}>
                  {aiResults.bestMatch && (
                    <View
                      style={{
                        alignItems: 'center',
                      }}>
                      {/* Large percentage in background */}
                      <View
                        style={{
                          position: 'absolute',
                          alignItems: 'center',
                          opacity: 0.09,
                        }}>
                        <View
                          style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: isTablet ? 'center' : 'flex-end',
                          }}>
                          <Text
                            style={{
                              fontSize: isTablet ? 120 : 85,
                              fontWeight: '900',
                              color: colors.text.primary,
                            }}>
                            {Math.round(aiResults.bestMatch.confidence * 100)}
                          </Text>
                          <Text
                            style={{
                              fontSize: isTablet ? 85 : 65,
                              fontWeight: '900',
                              color: colors.text.primary,
                            }}>
                            %
                          </Text>
                        </View>
                      </View>

                      {/* Movie Poster Card */}
                      <TouchableOpacity
                        style={{
                          width: isTablet ? width * 0.4 : width * 0.5,
                          height: isTablet ? width * 0.6 : width * 0.8,
                          marginTop: isTablet
                            ? spacing.xl * 3.5
                            : spacing.xl * 2.5,
                          flexDirection: 'column',
                          alignItems: 'center',
                        }}
                        onPress={() =>
                          handleSearchItemPress({
                            id: aiResults.bestMatch.id,
                            type: aiResults.bestMatch.type,
                            title: aiResults.bestMatch.title,
                            name: aiResults.bestMatch.title,
                            poster_path: aiResults.bestMatch.poster_path,
                            backdrop_path: aiResults.bestMatch.backdrop_path,
                            vote_average: aiResults.bestMatch.vote_average,
                            overview: aiResults.bestMatch.overview,
                            release_date: aiResults.bestMatch.year
                              ? `${aiResults.bestMatch.year}-01-01`
                              : '',
                            first_air_date: aiResults.bestMatch.year
                              ? `${aiResults.bestMatch.year}-01-01`
                              : '',
                            popularity: 0,
                            genre_ids: [],
                            original_language: 'en',
                            origin_country: [],
                          } as ContentItem)
                        }
                        activeOpacity={0.9}>
                        {/* Match Badge */}
                        <Image
                          source={require('../assets/match.png')}
                          style={{
                            position: 'absolute',
                            top: isTablet ? -60 : -45,
                            height: 60,
                            width: isTablet ? width * 0.15 : width * 0.2,
                          }}
                          resizeMode="contain"
                        />
                        {/* Poster */}
                        <FastImage
                          source={{
                            uri: aiResults.bestMatch.poster_path
                              ? getImageUrl(
                                  aiResults.bestMatch.poster_path,
                                  'w500',
                                )
                              : 'https://via.placeholder.com/300x450?text=No+Image',
                          }}
                          style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: borderRadius.xl,
                          }}
                          resizeMode="cover"
                        />
                        {/* Arc Decoration */}
                        <Image
                          source={require('../assets/arc.png')}
                          style={{
                            position: 'absolute',
                            bottom: -30,
                            height: isTablet ? 70 : 60,
                            width: isTablet ? width * 0.5 : width * 0.6,
                          }}
                          resizeMode="contain"
                        />
                      </TouchableOpacity>

                      {/* Movie Info */}
                      <View
                        style={{
                          alignItems: 'center',
                          marginTop: spacing.xl,
                          paddingHorizontal: spacing.md,
                        }}>
                        <Text
                          style={{
                            ...typography.h2,
                            color: colors.text.primary,
                            textAlign: 'center',
                          }}>
                          {aiResults.bestMatch.title}
                        </Text>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: spacing.xs,
                            marginTop: spacing.sm,
                          }}>
                          {aiResults.bestMatch.year && (
                            <Text
                              style={{
                                ...typography.body2,
                                color: colors.text.secondary,
                              }}>
                              {aiResults.bestMatch.year}
                            </Text>
                          )}
                          {aiResults.bestMatch.year && (
                            <Text
                              style={{
                                ...typography.body2,
                                color: colors.text.muted,
                              }}>
                              •
                            </Text>
                          )}
                          <Text
                            style={{
                              ...typography.body2,
                              color: colors.text.secondary,
                            }}>
                            English
                          </Text>
                          {aiResults.bestMatch.vote_average && (
                            <>
                              <Text
                                style={{
                                  ...typography.body2,
                                  color: colors.text.muted,
                                }}>
                                •
                              </Text>
                              <Text
                                style={{
                                  ...typography.body2,
                                  color: colors.text.secondary,
                                }}>
                                {aiResults.bestMatch.vote_average.toFixed(1)}
                              </Text>
                            </>
                          )}
                        </View>
                      </View>

                      {/* Why This Match */}
                      {aiResults.bestMatch.explanation && (
                        <View
                          style={{
                            marginTop: 50,
                            paddingHorizontal: spacing.md,
                            width: '100%',
                          }}>
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: spacing.md,
                              marginBottom: spacing.sm,
                            }}>
                            <Icon
                              name="sparkles"
                              size={16}
                              color={colors.accent}
                            />
                            <Text
                              style={{
                                ...typography.body1,
                                fontWeight: '600',
                                color: colors.text.primary,
                              }}>
                              Why This Match
                            </Text>
                          </View>
                          <Text
                            style={{
                              ...typography.body2,
                              color: colors.text.muted,
                            }}>
                            {aiResults.bestMatch.explanation}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* More Results Section */}
                  {aiResults.moreResults &&
                    aiResults.moreResults.length > 0 && (
                      <View
                        style={{
                          marginTop: spacing.xl,
                          width: '100%',
                          paddingHorizontal: spacing.md,
                        }}>
                        <Text
                          style={{
                            ...typography.h3,
                            color: colors.text.primary,
                            marginBottom: spacing.md,
                          }}>
                          More Results
                        </Text>
                        {aiResults.moreResults.map(
                          (item: any, index: number) => (
                            <TouchableOpacity
                              key={index}
                              onPress={() =>
                                handleSearchItemPress({
                                  id: item.id,
                                  type: item.type,
                                  title: item.title,
                                  name: item.title,
                                  poster_path: item.poster_path,
                                  backdrop_path: item.backdrop_path,
                                  vote_average: item.vote_average,
                                  overview: item.overview,
                                  release_date: item.year
                                    ? `${item.year}-01-01`
                                    : '',
                                  first_air_date: item.year
                                    ? `${item.year}-01-01`
                                    : '',
                                  popularity: 0,
                                  genre_ids: [],
                                  original_language: 'en',
                                  origin_country: [],
                                } as ContentItem)
                              }
                              activeOpacity={0.7}
                              style={{
                                flexDirection: 'row',
                                marginBottom: spacing.md,
                                gap: spacing.sm,
                              }}>
                              <FastImage
                                source={{
                                  uri: item.backdrop_path
                                    ? getImageUrl(item.backdrop_path, 'w300')
                                    : 'https://via.placeholder.com/300x169?text=No+Image',
                                }}
                                style={{
                                  width: isTablet ? 200 : 150,
                                  height: isTablet ? 120 : 90,
                                  borderRadius: borderRadius.sm,
                                }}
                                resizeMode="cover"
                              />
                              <View style={{flex: 1, justifyContent: 'center'}}>
                                <Text
                                  style={{
                                    ...typography.body1,
                                    fontWeight: '600',
                                    color: colors.text.primary,
                                  }}
                                  numberOfLines={1}>
                                  {item.title}
                                </Text>
                                {item.reason && (
                                  <Text
                                    style={{
                                      ...typography.caption,
                                      color: colors.text.muted,
                                      marginTop: spacing.xs,
                                    }}
                                    numberOfLines={2}>
                                    {item.reason}
                                  </Text>
                                )}
                              </View>
                            </TouchableOpacity>
                          ),
                        )}
                      </View>
                    )}
                </View>
                <View style={{height: 200}} />
              </ScrollView>
            ) : isLoading ? (
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
                onMoviePress={handleSearchItemPress}
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
