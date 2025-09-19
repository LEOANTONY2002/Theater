import React, {useState, useEffect, useCallback, useMemo, useRef} from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import {RouteProp, useNavigation, useIsFocused} from '@react-navigation/native';
import {HomeStackParamList} from '../types/navigation';
import {useInfiniteQuery, useQueryClient} from '@tanstack/react-query';
import {getContentByGenre} from '../services/tmdb';
import {borderRadius, colors, spacing, typography} from '../styles/theme';
import {Movie} from '../types/movie';
import {TVShow} from '../types/tvshow';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {MovieCard} from '../components/MovieCard';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {ContentItem} from '../components/MovieList';
import {GridListSkeleton} from '../components/LoadingSkeleton';
import {useNavigationState} from '../hooks/useNavigationState';
import {useResponsive} from '../hooks/useResponsive';
import {SettingsManager} from '../store/settings';
import {GradientSpinner} from '../components/GradientSpinner';

type GenreScreenNavigationProp = NativeStackNavigationProp<HomeStackParamList>;
type GenreScreenRouteProp = RouteProp<HomeStackParamList, 'Genre'>;

interface GenreScreenProps {
  navigation: GenreScreenNavigationProp;
  route: GenreScreenRouteProp;
}

export const GenreScreen: React.FC<GenreScreenProps> = ({route}) => {
  const navigation = useNavigation<GenreScreenNavigationProp>();
  const {genreId, genreName, contentType} = route.params;
  const isFocused = useIsFocused();
  const [canRenderContent, setCanRenderContent] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const {isNavigating, navigateWithLimit} = useNavigationState();
  const {isTablet, orientation} = useResponsive();
  const {width} = useWindowDimensions();

  // Spacing and sizing - memoize calculations
  const {horizontalPadding, perCardGap, minCardWidth} = useMemo(
    () => ({
      horizontalPadding: (spacing?.sm ?? 8) * 2,
      perCardGap: 6, // 3 * 2 (margin on both sides)
      minCardWidth: isTablet ? 150 : 110,
    }),
    [isTablet],
  );

  const {columns, cardWidth, rowHeight} = useMemo(() => {
    const available = Math.max(0, width - horizontalPadding);
    const perCardTotal = minCardWidth + perCardGap;
    const rawCols = Math.max(1, Math.floor(available / perCardTotal));
    const cols =
      !isTablet && orientation === 'portrait' ? Math.max(3, rawCols) : rawCols;

    const availableWidth = Math.max(
      0,
      width - horizontalPadding - cols * perCardGap,
    );
    const cWidth = cols > 0 ? availableWidth / cols : availableWidth;

    return {
      columns: cols,
      cardWidth: cWidth,
      rowHeight: cWidth * 1.5,
    };
  }, [
    width,
    horizontalPadding,
    minCardWidth,
    perCardGap,
    isTablet,
    orientation,
  ]);

  // Animation refs
  const scrollY = useRef(new Animated.Value(0));
  const headerAnim = useRef(new Animated.Value(0));
  const animationConfig = useMemo(
    () => ({
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }),
    [],
  );

  // Create interpolated styles
  const headerInterpolation = useMemo(() => {
    const inputRange = [0, 40];

    return {
      marginHorizontal: headerAnim.current.interpolate({
        inputRange,
        outputRange: [0, spacing.lg],
        extrapolate: 'clamp',
      }),
      marginTop: headerAnim.current.interpolate({
        inputRange,
        outputRange: [40, 60],
        extrapolate: 'clamp',
      }),
      borderRadius: headerAnim.current.interpolate({
        inputRange,
        outputRange: [16, 24],
        extrapolate: 'clamp',
      }),
    };
  }, [spacing.lg]);

  const blurOpacity = useMemo(
    () =>
      headerAnim.current.interpolate({
        inputRange: [0, 40],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      }),
    [],
  );

  const animatedHeaderStyle = headerInterpolation;

  // Animate header on scroll
  useEffect(() => {
    const id = scrollY.current.addListener(({value}) => {
      Animated.timing(headerAnim.current, {
        toValue: value,
        ...animationConfig,
      }).start();
    });
    return () => scrollY.current.removeListener(id);
  }, [animationConfig]);

  // Optimize initial render and cleanup
  useEffect(() => {
    const timer = setTimeout(() => {
      setCanRenderContent(true);
      setIsInitialLoading(false);
    }, 50);

    return () => {
      clearTimeout(timer);
      scrollY.current.removeAllListeners();
    };
  }, []);

  const queryClient = useQueryClient();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
    refetch,
    isError,
    isFetching,
  } = useInfiniteQuery({
    queryKey: ['genre', genreId, contentType],
    queryFn: async ({pageParam = 1}) => {
      const result = await getContentByGenre(genreId, contentType, pageParam);
      return result;
    },
    getNextPageParam: lastPage =>
      lastPage?.page < lastPage?.total_pages ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    enabled: !!genreId && !!contentType,
  });

  useEffect(() => {
    if (isError) {
      console.error('Query error:', error);
    }
  }, [isError, error]);

  const allItems =
    data?.pages.flatMap(page =>
      page.results.map((item: Movie | TVShow) => ({
        ...item,
        type: contentType === 'movie' ? ('movie' as const) : ('tv' as const),
      })),
    ) || [];

  useEffect(() => {
    if (genreId && contentType) {
      refetch();
    }
  }, [genreId, contentType, refetch]);

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

  // Note: Do NOT early-return based on focus to keep hooks order consistent across renders.

  const handleItemPress = useCallback(
    (item: ContentItem) => {
      const params =
        item.type === 'movie' ? {movie: item as Movie} : {show: item as TVShow};
      navigateWithLimit(
        item.type === 'movie' ? 'MovieDetails' : 'TVShowDetails',
        params,
      );
    },
    [navigateWithLimit],
  );

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({item}: {item: ContentItem}) => (
      <View style={styles.itemContainer}>
        <MovieCard
          item={item}
          onPress={handleItemPress}
          cardWidth={cardWidth}
        />
      </View>
    ),
    [handleItemPress, cardWidth],
  );

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footerLoader}>
        <GradientSpinner
          size={30}
          style={{
            marginVertical: 50,
            marginBottom: 100,
            alignItems: 'center',
            alignSelf: 'center',
          }}
          color={colors.modal.activeBorder}
        />
      </View>
    );
  }, [isFetchingNextPage]);

  // Calculate the content to render
  const renderContent = useMemo(() => {
    if (!canRenderContent) {
      return (
        <View style={styles.loadingContainer}>
          <GridListSkeleton />
        </View>
      );
    }

    if (isLoading) {
      return (
        <View
          style={{
            marginTop: 100,
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}>
          <GridListSkeleton />
        </View>
      );
    }

    const getItemLayout = (
      data: ArrayLike<ContentItem> | null | undefined,
      index: number,
    ) => ({
      length: rowHeight,
      offset: rowHeight * Math.floor(index / columns),
      index,
    });

    return (
      <Animated.FlatList<ContentItem>
        key={`genre-list-${columns}`}
        data={allItems}
        renderItem={renderItem}
        keyExtractor={item => `${item.id}-${item.type}`}
        showsVerticalScrollIndicator={false}
        numColumns={columns}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={[
          styles.listContent,
          allItems.length === 0 && styles.emptyListContent,
          {paddingTop: 100},
        ]}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        updateCellsBatchingPeriod={100}
        maxToRenderPerBatch={6}
        windowSize={5}
        initialNumToRender={6}
        removeClippedSubviews={Platform.OS === 'android'}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          !isLoading && !isFetching ? (
            <View style={styles.emptyContainer}>
              <Icon
                name="alert-circle-outline"
                size={48}
                color={colors.text.muted}
              />
              <Text style={styles.emptyText}>
                No {contentType === 'movie' ? 'movies' : 'TV shows'} found in
                this genre
              </Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => refetch()}
                activeOpacity={0.7}>
                <Text style={styles.retryText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        getItemLayout={getItemLayout}
        onScroll={Animated.event<{y: number}>(
          [{nativeEvent: {contentOffset: {y: scrollY.current}}}],
          {useNativeDriver: true},
        )}
        // Keep mounted to preserve scroll; hide when not focused
        style={{display: isFocused ? ('flex' as const) : ('none' as const)}}
        pointerEvents={isFocused ? 'auto' : 'none'}
      />
    );
  }, [
    canRenderContent,
    isLoading,
    allItems,
    renderItem,
    columns,
    handleLoadMore,
    isFetching,
    contentType,
    refetch,
    rowHeight,
    renderFooter,
    isFocused,
  ]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.header, animatedHeaderStyle]}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              opacity: blurOpacity,
              zIndex: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
            },
          ]}
        />
        <View
          style={{
            gap: 20,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            width: '100%',
          }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              width: 30,
              height: 30,
              zIndex: 3,
              display: 'flex',
              alignItems: 'center',
            }}>
            <Icon name="chevron-left" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>{genreName}</Text>
        </View>
      </Animated.View>
      <View style={styles.contentContainer}>{renderContent}</View>
      {(isInitialLoading || isNavigating) && (
        <View style={styles.loadingContainer}>
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
  contentContainer: {
    flex: 1,
  },
  itemContainer: {},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginTop: spacing.xxl,
    height: 60,
    backgroundColor: colors.modal.background,
    overflow: 'hidden',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
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
    backgroundColor: `${colors.background.tertiary}80`,
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
  listContent: {
    paddingVertical: 120,
    alignItems: 'center',
  },
  columnWrapper: {
    justifyContent: 'center',
  },
  footerLoader: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  footerSpace: {
    height: 100,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingIndicatorContainer: {
    height: 50,
    alignItems: 'center',
    width: '100%',
  },
  loadingText: {
    marginTop: spacing.sm,
    color: colors.text.primary,
    ...typography.body2,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 0,
  },
  emptyContainer: {
    flex: 1,
    minHeight: 400,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
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
    backgroundColor: `${colors.primary}22`,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: `${colors.primary}44`,
  },
  retryText: {
    color: colors.primary,
    ...typography.button,
  },
  loadingTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  loadingSubtitle: {
    ...typography.body2,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blurView: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
