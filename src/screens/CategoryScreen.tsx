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
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {MoviesStackParamList, TVShowsStackParamList} from '../types/navigation';
import {ContentItem} from '../components/MovieList';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {useDynamicContentSource} from '../hooks/useApp';
import Icon from 'react-native-vector-icons/Ionicons';
import {Movie} from '../types/movie';
import {TVShow} from '../types/tvshow';
import {MovieCard} from '../components/MovieCard';
import {useNavigationState} from '../hooks/useNavigationState';
import {BlurView} from '@react-native-community/blur';
import {GridListSkeleton} from '../components/LoadingSkeleton';
import {useQueryClient} from '@tanstack/react-query';
import {SettingsManager} from '../store/settings';
import {GradientSpinner} from '../components/GradientSpinner';

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
  const animatedHeaderStyle = {
    marginHorizontal: headerAnim.interpolate({
      inputRange: [0, 40],
      outputRange: [0, spacing.lg],
      extrapolate: 'clamp',
    }),
    marginTop: headerAnim.interpolate({
      inputRange: [0, 40],
      outputRange: [40, 60],
      extrapolate: 'clamp',
    }),
    marginBottom: headerAnim.interpolate({
      inputRange: [0, 40],
      outputRange: [spacing.md, spacing.lg],
      extrapolate: 'clamp',
    }),
    borderRadius: headerAnim.interpolate({
      inputRange: [0, 40],
      outputRange: [16, 24],
      extrapolate: 'clamp',
    }),
  };
  const blurOpacity = headerAnim.interpolate({
    inputRange: [0, 40],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

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

  // Use the new dynamic content source hook
  const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} =
    useDynamicContentSource({categoryType, contentType, filter});

  // Flatten the pages data for infinite queries
  const flattenedData = useMemo(() => {
    return (data?.pages?.flatMap(page => page?.results || []) ??
      []) as ContentItem[];
  }, [data]);

  const ITEM_HEIGHT = 220; // Adjust to your MovieCard height

  const MemoizedMovieCard = React.memo(MovieCard);

  const keyExtractor = useCallback(
    (item: ContentItem) => item.id?.toString() ?? '',
    [],
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    [],
  );

  const renderItem = useCallback(
    ({item}: {item: ContentItem}) => (
      <MemoizedMovieCard item={item} onPress={handleItemPress} />
    ),
    [handleItemPress],
  );

  const handleEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage?.();
    }
  };

  const queryClient = useQueryClient();

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
      <Animated.View style={[styles.header, animatedHeaderStyle]}>
        <Animated.View
          style={[StyleSheet.absoluteFill, {opacity: blurOpacity, zIndex: 0}]}>
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType="dark"
            blurAmount={16}
            overlayColor={colors.modal?.blur || 'rgba(255,255,255,0.11)'}
            reducedTransparencyFallbackColor={
              colors.modal?.blur || 'rgba(255,255,255,0.11)'
            }
            pointerEvents="none"
          />
        </Animated.View>
        <View
          style={{
            display: 'flex',
            gap: 20,
            flexDirection: 'row',
            alignItems: 'center',
            width: '100%',
          }}>
          <TouchableOpacity
            onPress={() => {
              navigation.goBack();
            }}
            style={{
              width: 30,
              height: 30,
              zIndex: 3,
              display: 'flex',
              alignItems: 'center',
            }}>
            <Icon name="chevron-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
        </View>
      </Animated.View>
      <View style={styles.contentContainer}>
        <Animated.FlatList
          data={flattenedData}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          numColumns={3}
          columnWrapperStyle={styles.row}
          initialNumToRender={10}
          windowSize={7}
          removeClippedSubviews={true}
          decelerationRate={0.97}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isFetchingNextPage ? (
              <GradientSpinner
                size={30}
                thickness={3}
                style={{
                  marginVertical: 50,
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
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.listContent, {paddingVertical: 100}]}
          onScroll={Animated.event(
            [{nativeEvent: {contentOffset: {y: scrollY}}}],
            {useNativeDriver: false},
          )}
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
    marginTop: spacing.xxl,
    height: 60,
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
    flex: 1,
    paddingTop: 100,
  },
  row: {
    flexDirection: 'row',
  },
});
