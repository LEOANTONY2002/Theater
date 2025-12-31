import React from 'react';
import {View, Text, StyleSheet, Image, useWindowDimensions} from 'react-native';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {useQuery, useInfiniteQuery} from '@tanstack/react-query';
import {discoverMovies} from '../services/tmdb';
import {Movie} from '../types/movie';
import {ContentItem} from './MovieList';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {HomeStackParamList} from '../types/navigation';
import {useResponsive} from '../hooks/useResponsive';
import LinearGradient from 'react-native-linear-gradient';
import Carousel from 'react-native-reanimated-carousel';
import {Pressable} from 'react-native';
import FastImage from 'react-native-fast-image';

interface CurrentMonthReleasesProps {
  onItemPress?: (item: ContentItem) => void;
}

interface ReleaseItemProps {
  item: Movie;
  onPress: (item: Movie) => void;
  width: number;
  height: number;
}

export const CurrentMonthReleases: React.FC<CurrentMonthReleasesProps> = ({
  onItemPress,
}) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const {isTablet} = useResponsive();
  const {width: SCREEN_WIDTH} = useWindowDimensions();

  const queryParams = React.useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    // First day of current month
    const firstDay = new Date(year, month, 1);
    // Last day of current month
    const lastDay = new Date(year, month + 1, 0);

    // Format dates in local timezone to avoid UTC conversion issues
    const formatLocalDate = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    return {
      'release_date.gte': formatLocalDate(firstDay),
      'release_date.lte': formatLocalDate(lastDay),
      with_release_type: '2|3', // Theatrical releases only (2=Theatrical, 3=Theatrical Limited)
    };
  }, []);

  const {
    data: moviesData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['currentMonthReleases', queryParams],
    queryFn: async ({pageParam = 1}) => {
      const {SettingsManager} = await import('../store/settings');
      const region = await SettingsManager.getRegion();
      const result = await discoverMovies(
        {
          ...queryParams,
          sort_by: 'release_date.asc',
          region: region?.iso_3166_1,
        },
        pageParam,
      );
      return result;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.page < lastPage.total_pages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: 1000 * 60 * 30,
  });

  const movies = React.useMemo(
    () => moviesData?.pages.flatMap(page => page.results) || [],
    [moviesData],
  );

  const carouselRef = React.useRef<any>(null);
  const [hasScrolledToToday, setHasScrolledToToday] = React.useState(false);
  const [isPrefetching, setIsPrefetching] = React.useState(false);

  // Prefetch all pages on mount to enable scrolling to today
  React.useEffect(() => {
    const prefetchAllPages = async () => {
      if (isPrefetching || !hasNextPage || isLoading) return;

      setIsPrefetching(true);
      try {
        // Keep fetching until no more pages
        let shouldContinue: boolean = !!hasNextPage;
        while (shouldContinue) {
          const result = await fetchNextPage();
          shouldContinue = !!result.hasNextPage;
        }
      } finally {
        setIsPrefetching(false);
      }
    };

    if (!isLoading && hasNextPage && !isPrefetching) {
      prefetchAllPages();
    }
  }, [isLoading, hasNextPage, isPrefetching, fetchNextPage]);

  // Scroll to today's date after all pages are loaded
  React.useEffect(() => {
    if (
      !isLoading &&
      !hasNextPage &&
      !hasScrolledToToday &&
      movies.length > 0 &&
      carouselRef.current
    ) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find the index of the movie closest to today
      let closestIndex = 0;
      let minDiff = Infinity;

      movies.forEach((movie, index) => {
        const releaseDate = new Date(movie.release_date);
        releaseDate.setHours(0, 0, 0, 0);
        const diff = Math.abs(today.getTime() - releaseDate.getTime());

        if (diff < minDiff) {
          minDiff = diff;
          closestIndex = index;
        }
      });

      // Scroll to the closest movie with a slight delay to ensure carousel is ready
      setTimeout(() => {
        carouselRef.current?.scrollTo({index: closestIndex, animated: false});
        setHasScrolledToToday(true);
      }, 100);
    }
  }, [isLoading, hasNextPage, movies, hasScrolledToToday]);

  const CARD_DIMENSIONS = React.useMemo(
    () => ({
      width: isTablet ? SCREEN_WIDTH * 0.95 : SCREEN_WIDTH,
      height: isTablet ? 450 : 250,
    }),
    [isTablet, SCREEN_WIDTH],
  );

  const handlePress = React.useCallback(
    (item: Movie) => {
      if (onItemPress) {
        onItemPress({...item, type: 'movie'});
      } else {
        navigation.push('MovieDetails', {movie: item as any});
      }
    },
    [onItemPress, navigation],
  );

  const handleSnapToItem = React.useCallback(
    (index: number) => {
      // Fetch next page when user is 3 items away from the end
      if (hasNextPage && !isFetchingNextPage && index >= movies.length - 3) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, movies.length, fetchNextPage],
  );

  const currentMonth = React.useMemo(
    () => new Date().toLocaleDateString('en-US', {month: 'long'}),
    [],
  );

  if (isLoading || movies.length === 0) {
    return null;
  }

  const ReleaseItem = React.memo(
    ({item, onPress, width, height}: ReleaseItemProps) => {
      const releaseDate = React.useMemo(
        () => new Date(item.release_date),
        [item.release_date],
      );

      return (
        <Pressable onPress={() => onPress(item)} style={styles.itemContainer}>
          <View style={[styles.card, {width, height}]}>
            <FastImage
              source={{
                uri: `https://image.tmdb.org/t/p/w780${
                  item.backdrop_path || item.poster_path
                }`,
                priority: FastImage.priority.normal,
              }}
              style={styles.poster}
              resizeMode={FastImage.resizeMode.cover}
            />

            <LinearGradient
              colors={[
                'transparent',
                'rgba(0,0,0,0.1)',
                'rgba(0,0,0,0.8)',
                'rgba(0,0,0,0.95)',
              ]}
              locations={[0, 0.4, 0.8, 1]}
              style={StyleSheet.absoluteFill}
            />

            <View style={styles.contentOverlay}>
              <View style={styles.dayContainer}>
                <Text style={styles.dayText}>{releaseDate.getDate()}</Text>
              </View>

              <View style={styles.infoContainer}>
                <Text style={styles.movieTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.overview} numberOfLines={2}>
                  {item.overview}
                </Text>
              </View>
            </View>
          </View>
        </Pressable>
      );
    },
    (prev, next) =>
      prev.item.id === next.item.id &&
      prev.width === next.width &&
      prev.height === next.height,
  );

  const styles = StyleSheet.create({
    container: {
      marginBottom: spacing.xl,
      marginTop: spacing.sm,
    },
    title: {
      ...typography.h3,
      color: colors.text.primary,
      paddingHorizontal: spacing.md,
    },
    itemContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    card: {
      borderRadius: isTablet ? 60 : 24,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.modal.blur,
      backgroundColor: '#1a1a1a',
      elevation: 50,
      shadowColor: '#000',
      shadowOffset: {
        width: 20,
        height: 20,
      },
      shadowOpacity: 0.6,
      shadowRadius: 20,
    },
    poster: {
      width: '100%',
      height: '100%',
    },
    contentOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: isTablet ? 40 : 20,
      flexDirection: 'row',
      alignItems: 'flex-end',
    },
    dayContainer: {
      marginRight: isTablet ? 24 : 16,
      justifyContent: 'flex-end',
      marginBottom: 4,
    },
    dayText: {
      ...typography.h1,
      fontSize: isTablet ? 96 : 56,
      fontWeight: '900',
      color: '#FFFFFF',
      includeFontPadding: false,
      textShadowColor: 'rgba(0, 0, 0, 0.5)',
      textShadowOffset: {width: 0, height: 2},
      textShadowRadius: 4,
    },
    infoContainer: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    movieTitle: {
      ...typography.h2,
      fontSize: isTablet ? 48 : 22,
      fontWeight: '700',
      color: '#FFFFFF',
      marginBottom: 6,
      lineHeight: isTablet ? 48 : 22,
    },
    overview: {
      ...typography.body2,
      fontSize: isTablet ? 14 : 12,
      color: colors.text.secondary,
      marginBottom: isTablet ? 14 : 10,
      lineHeight: 16,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    ratingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.4)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      gap: 4,
    },
    ratingText: {
      ...typography.body2,
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 12,
    },
    releaseFullDate: {
      ...typography.caption,
      color: 'rgba(255, 255, 255, 0.6)',
      fontSize: 12,
      fontWeight: '500',
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{currentMonth} Releases</Text>

      <View style={{height: CARD_DIMENSIONS.height, width: SCREEN_WIDTH}}>
        <Carousel
          ref={carouselRef}
          loop={true}
          width={SCREEN_WIDTH}
          height={CARD_DIMENSIONS.height}
          data={movies}
          mode="parallax"
          modeConfig={{
            parallaxScrollingScale: 0.8,
            parallaxScrollingOffset: isTablet ? 300 : 150,
          }}
          windowSize={3}
          scrollAnimationDuration={500}
          onSnapToItem={handleSnapToItem}
          renderItem={({item}: {item: Movie}) => (
            <ReleaseItem
              item={item}
              onPress={handlePress}
              width={CARD_DIMENSIONS.width}
              height={CARD_DIMENSIONS.height}
            />
          )}
        />
      </View>
    </View>
  );
};
