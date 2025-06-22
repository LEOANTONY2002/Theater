import React, {useState, useEffect, useMemo, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Image,
  TouchableOpacity,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  RouteProp,
  useFocusEffect,
} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {
  MoviesStackParamList,
  TVShowsStackParamList,
  MovieCategoryType,
  TVShowCategoryType,
} from '../types/navigation';
import {ContentItem} from '../components/MovieList';
import {ContentCard} from '../components/ContentCard';
import {GradientBackground} from '../components/GradientBackground';
import {
  colors,
  spacing,
  typography,
  shadows,
  borderRadius,
} from '../styles/theme';
import {useMoviesList, useDiscoverMovies} from '../hooks/useMovies';
import {useTVShowsList, useDiscoverTVShows} from '../hooks/useTVShows';
import {useSavedFilterContent} from '../hooks/useApp';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import {Movie} from '../types/movie';
import {TVShow} from '../types/tvshow';
import {MovieCard} from '../components/MovieCard';
import {SavedFilter} from '../types/filters';
import {useNavigationState} from '../hooks/useNavigationState';

type CategoryScreenNavigationProp = NativeStackNavigationProp<
  MoviesStackParamList | TVShowsStackParamList,
  'Category'
>;

type CategoryScreenRouteProp = RouteProp<
  MoviesStackParamList | TVShowsStackParamList,
  'Category'
>;

export const CategoryScreen = () => {
  const navigation = useNavigation<CategoryScreenNavigationProp>();
  const route = useRoute<CategoryScreenRouteProp>();
  const {title, categoryType, contentType, filter} = route.params;
  const [canRenderContent, setCanRenderContent] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const {isNavigating} = useNavigationState();

  // Defer heavy rendering to prevent FPS drops
  useEffect(() => {
    const timer = setTimeout(() => {
      setCanRenderContent(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Set loading to false after a short delay to allow smooth transition
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // Define internal item press handler
  const handleItemPress = useCallback(
    (item: ContentItem) => {
      if (contentType === 'movie') {
        (
          navigation as NativeStackNavigationProp<MoviesStackParamList>
        ).navigate('MovieDetails', {
          movie: item as Movie,
        });
      } else if (contentType === 'tv') {
        (
          navigation as NativeStackNavigationProp<TVShowsStackParamList>
        ).navigate('TVShowDetails', {
          show: item as TVShow,
        });
      }
    },
    [navigation, contentType],
  );

  // Use the appropriate hooks based on content type and whether we have filters
  const movieCategoryType =
    contentType === 'movie' ? (categoryType as MovieCategoryType) : 'popular';
  const tvCategoryType =
    contentType === 'tv' ? (categoryType as TVShowCategoryType) : 'popular';

  const moviesList = useMoviesList(movieCategoryType);
  const tvShowsList = useTVShowsList(tvCategoryType);

  // Use the appropriate data source based on whether we have filters
  const {
    data: filterContent,
    isLoading: isFilterLoading,
    fetchNextPage: fetchNextFilterPage,
    hasNextPage: hasNextFilterPage,
    isFetchingNextPage: isFetchingNextFilterPage,
  } = useSavedFilterContent(filter as SavedFilter);

  console.log('saved filter in CategoryScreen', filter);
  console.log('filterContent in CategoryScreen', filterContent);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isLoading: isInitialLoadingData,
    isRefetching,
  } = contentType === 'movie' ? moviesList : tvShowsList;

  const isLoading = isInitialLoadingData || isRefetching || isFilterLoading;

  // Flatten the pages data for infinite queries
  const flattenedData = useMemo(() => {
    if (filter) {
      // For filter content, flatten all pages
      return (filterContent?.pages?.flatMap(page => page?.results || []) ??
        []) as ContentItem[];
    } else {
      // For regular content, flatten all pages
      return (data?.pages?.flatMap(page => page?.results || []) ??
        []) as ContentItem[];
    }
  }, [filter, filterContent, data]);

  const renderItem = ({item}: {item: ContentItem}) => (
    <MovieCard item={item} onPress={handleItemPress} />
  );

  const handleEndReached = () => {
    if (filter) {
      if (hasNextFilterPage && !isFetchingNextFilterPage) {
        fetchNextFilterPage();
      }
    } else if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  // Show loading screen until content can be rendered
  if (!canRenderContent) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
        </View>
      </View>

      <View style={styles.contentContainer}>
        <FlatList<ContentItem>
          data={flattenedData}
          renderItem={renderItem}
          keyExtractor={item => `${item.type}-${item.id}`}
          numColumns={3}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          // Netflix-style virtualization for grid performance
          removeClippedSubviews={true}
          maxToRenderPerBatch={3} // Render 3 items at a time for grid
          windowSize={3} // Keep 3 screens worth of items
          initialNumToRender={6} // Start with 6 items (2 rows)
          updateCellsBatchingPeriod={50} // Fast batching
          disableVirtualization={false} // Enable virtualization
          // Scroll optimizations
          scrollEventThrottle={0} // Disable scroll events for performance
          decelerationRate="fast"
          // Memory optimizations
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 10,
          }}
          // Disable extra features for performance
          extraData={null}
          onScrollBeginDrag={() => {}}
          onScrollEndDrag={() => {}}
          onMomentumScrollEnd={() => {}}
          // Grid-specific optimizations
          columnWrapperStyle={styles.row}
          ListFooterComponent={
            isFetchingNextPage || isFetchingNextFilterPage ? (
              <ActivityIndicator
                size="large"
                style={{marginVertical: spacing.xl}}
                color={colors.primary}
              />
            ) : null
          }
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.emptyContainer}>
                <Icon name="alert-circle" size={48} color={colors.text.muted} />
                <Text style={styles.emptyText}>No content found</Text>
              </View>
            ) : null
          }
        />
      </View>

      {(isInitialLoading || isNavigating) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  cardContainer: {
    flex: 1,
    margin: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleIconContainer: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.round,
    backgroundColor: colors.background.tertiary + '80',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
  },
  contentContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 120,
  },
  footerLoader: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  footerSpace: {
    height: 100,
  },
  loadingIndicatorContainer: {
    height: 50,
    alignItems: 'center',
    width: '100%',
  },
  loadingText: {
    color: colors.text.primary,
    marginTop: spacing.md,
    ...typography.body1,
  },
  emptyContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...typography.body1,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  retryButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary + '22',
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.primary + '44',
  },
  retryText: {
    color: colors.primary,
    ...typography.body2,
  },
  fullScreenLoader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background.primary + 'CC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginTop: spacing.lg,
  },
  loadingSubtitle: {
    ...typography.body2,
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background.primary + 'CC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
  },
});
