import React, {useState, useEffect, useMemo, useCallback, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Image,
  TouchableOpacity,
  Animated,
  Easing,
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
import {BlurView} from '@react-native-community/blur';
import {GridListSkeleton} from '../components/LoadingSkeleton';

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

  // Animated value for scroll position
  const scrollY = useRef(new Animated.Value(0)).current;
  // Animated value for header animation (for smooth transition)
  const headerAnim = useRef(new Animated.Value(0)).current;

  // Smoothly animate headerAnim towards scrollY
  useEffect(() => {
    const id = scrollY.addListener(({value}) => {
      Animated.timing(headerAnim, {
        toValue: value,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false, // must be false for margin/background
      }).start();
    });
    return () => scrollY.removeListener(id);
  }, [scrollY, headerAnim]);

  // Interpolated styles for the animated title container (use headerAnim)
  const animatedTitleStyle = {
    marginTop: headerAnim.interpolate({
      inputRange: [0, 40],
      outputRange: [0, 46],
      extrapolate: 'clamp',
    }),
    paddingTop: headerAnim.interpolate({
      inputRange: [0, 80],
      outputRange: [50, 20],
      extrapolate: 'clamp',
    }),
    marginHorizontal: headerAnim.interpolate({
      inputRange: [0, 40],
      outputRange: [0, 16],
      extrapolate: 'clamp',
    }),
    marginBottom: headerAnim.interpolate({
      inputRange: [0, 40],
      outputRange: [0, 16],
      extrapolate: 'clamp',
    }),
    // backgroundColor: headerAnim.interpolate({
    //   inputRange: [0, 40],
    //   outputRange: ['rgba(0,0,0,0)', colors.background.primary + 'EE'],
    //   extrapolate: 'clamp',
    // }),
    borderRadius: headerAnim.interpolate({
      inputRange: [0, 40],
      outputRange: [0, 24],
      extrapolate: 'clamp',
    }),
    elevation: headerAnim.interpolate({
      inputRange: [0, 40],
      outputRange: [0, 6],
      extrapolate: 'clamp',
    }),
    shadowOpacity: headerAnim.interpolate({
      inputRange: [0, 40],
      outputRange: [0, 0.15],
      extrapolate: 'clamp',
    }),
    shadowRadius: headerAnim.interpolate({
      inputRange: [0, 40],
      outputRange: [0, 8],
      extrapolate: 'clamp',
    }),
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
  };

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
      <View style={styles.loadingOverlay}>
        <GridListSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.header, animatedTitleStyle]}>
        <BlurView
          style={styles.blurView}
          blurType="dark"
          blurAmount={10}
          overlayColor={colors.modal.blur}
          reducedTransparencyFallbackColor={colors.modal.blur}
          pointerEvents="none"
        />
        <View style={styles.titleContainer}>
          <View
            style={{
              display: 'flex',
              flex: 1,
              alignItems: 'center',
              gap: 20,
              flexDirection: 'row',
            }}>
            <TouchableOpacity
              onPress={() => {
                navigation.goBack();
              }}
              style={{width: 30, height: 30, zIndex: 3}}>
              <Icon name="chevron-back" size={30} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.title}>{title}</Text>
          </View>
        </View>
      </Animated.View>

      <View style={styles.contentContainer}>
        <Animated.FlatList<ContentItem>
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
          scrollEventThrottle={16} // Use 16ms for smooth animation
          decelerationRate="fast"
          // Memory optimizations
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 10,
          }}
          // Disable extra features for performance
          extraData={null}
          onScroll={Animated.event(
            [{nativeEvent: {contentOffset: {y: scrollY}}}],
            {useNativeDriver: false},
          )}
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

      {isInitialLoading && (
        <View style={styles.loadingOverlay}>
          <GridListSkeleton />
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
    paddingHorizontal: spacing.md,
    // paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
    backgroundColor: colors.modal.background,
    overflow: 'hidden',
    position: 'absolute',
    top: 0,
    zIndex: 1,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  blurView: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
    flex: 1,
    textAlign: 'center',
    marginLeft: -50,
  },
  contentContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingVertical: 120,
    // flex: 1,
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
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 120,
  },
  row: {
    flexDirection: 'row',
  },
});
