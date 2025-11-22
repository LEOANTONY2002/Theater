import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  FlatList,
  Platform,
} from 'react-native';
import {RouteProp, useNavigation, useIsFocused} from '@react-navigation/native';
import {HomeStackParamList} from '../types/navigation';
import {useInfiniteQuery, useQueryClient} from '@tanstack/react-query';
import {getContentByGenre} from '../services/tmdb';
import {borderRadius, colors, spacing, typography} from '../styles/theme';
import {Movie} from '../types/movie';
import {TVShow} from '../types/tvshow';
import Icon from 'react-native-vector-icons/Ionicons';
import {MovieCard} from '../components/MovieCard';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {ContentItem} from '../components/MovieList';
import {GridListSkeleton} from '../components/LoadingSkeleton';
import {useNavigationState} from '../hooks/useNavigationState';
import {useResponsive} from '../hooks/useResponsive';
import {SettingsManager} from '../store/settings';
import {GradientSpinner} from '../components/GradientSpinner';
import LinearGradient from 'react-native-linear-gradient';
import {BlurPreference} from '../store/blurPreference';

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
  const themeMode = BlurPreference.getMode();
  const isSolid = themeMode === 'normal';

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

  // Removed animated header and scroll-driven interpolation

  // Optimize initial render and cleanup
  useEffect(() => {
    const timer = setTimeout(() => {
      setCanRenderContent(true);
      setIsInitialLoading(false);
    }, 50);

    return () => {
      clearTimeout(timer);
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
      marginTop: spacing.xl,
      overflow: 'hidden',
      position: 'absolute',
      top: 0,
      zIndex: 2,
      borderRadius: borderRadius.round,
      marginHorizontal:
        isTablet && orientation === 'portrait'
          ? '18%'
          : isTablet && orientation === 'landscape'
          ? '27%'
          : 24,
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
      <FlatList
        data={allItems}
        renderItem={renderItem}
        keyExtractor={item => `${item.id}-${item.type}`}
        showsVerticalScrollIndicator={false}
        numColumns={columns}
        contentContainerStyle={[
          styles.listContent,
          allItems.length === 0 && styles.emptyListContent,
          {paddingTop: 100},
        ]}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        removeClippedSubviews
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          !isLoading && !isFetching ? (
            <View style={styles.emptyContainer}>
              <Icon name="alert-circle" size={48} color={colors.text.muted} />
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
  ]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background.primary, 'transparent']}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: 200,
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />
      <View style={styles.header}>
        {isSolid ? (
          <LinearGradient
            colors={['transparent', colors.background.primary]}
            style={{
              position: 'absolute',
              left: -50,
              right: 0,
              bottom: -20,
              height: 100,
              zIndex: 1,
              width: '150%',
              transform: [{rotate: '-5deg'}],
              pointerEvents: 'none',
            }}
          />
        ) : null}
        <View
          style={{
            gap: 20,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            width: '100%',
            paddingHorizontal: spacing.md,
            height: 60,
            borderRadius: 16,
            backgroundColor: isSolid
              ? colors.background.primary
              : 'rgba(122, 122, 122, 0.31)',
            borderColor: colors.modal.content,
            borderWidth: 0,
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
            <Icon name="chevron-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>{genreName}</Text>
        </View>
      </View>
      <View style={styles.contentContainer}>{renderContent}</View>
      {(isInitialLoading || isNavigating) && (
        <View style={styles.loadingContainer}>
          <GridListSkeleton />
        </View>
      )}
    </View>
  );
};
