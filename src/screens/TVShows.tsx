import React, {useCallback, useMemo, useEffect, useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {FlashList} from '@shopify/flash-list';
import {
  useTop10ShowsTodayByRegion,
  useTrendingTVShows,
  useTVShowsList,
  useDiscoverTVShows,
} from '../hooks/useTVShows';
import {TVShow} from '../types/tvshow';
import {useNavigation} from '@react-navigation/native';
import {HorizontalList} from '../components/HorizontalList';
import {FeaturedBanner} from '../components/FeaturedBanner';
import {ContentItem} from '../components/MovieList';
import {
  RootStackParamList,
  TVShowsStackParamList,
  TVShowCategoryType,
} from '../types/navigation';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {colors, spacing, typography} from '../styles/theme';
import {
  BannerSkeleton,
  GenreListSkeleton,
  HeadingSkeleton,
  HorizontalListSkeleton,
} from '../components/LoadingSkeleton';
import {getGenres} from '../services/tmdb';
import {Genre} from '../types/movie';
import {useRegion} from '../hooks/useApp';
import {HorizontalGenreList} from '../components/HorizontalGenreList';
import {useNavigationState} from '../hooks/useNavigationState';
import {Movie} from '../types/movie';

type TVShowsScreenNavigationProp =
  NativeStackNavigationProp<TVShowsStackParamList>;

export const TVShowsScreen = React.memo(() => {
  const {data: region} = useRegion();
  const navigation = useNavigation<TVShowsScreenNavigationProp>();
  const {navigateWithLimit} = useNavigationState();
  const [genres, setGenres] = useState<Genre[]>([]);
  const [isLoadingGenres, setIsLoadingGenres] = useState(true);

  useEffect(() => {
    const loadGenres = async () => {
      try {
        const tvGenres = await getGenres('tv');
        setGenres(tvGenres);
        setIsLoadingGenres(false);
      } catch (error) {
        console.error('Error loading genres:', error);
        setIsLoadingGenres(false);
      }
    };
    loadGenres();
  }, []);

  const handleGenrePress = (genre: Genre) => {
    navigateWithLimit('Genre', {
      genreId: genre.id,
      genreName: genre.name,
      contentType: 'tv',
    });
  };

  // Popular TV Shows
  const {
    data: popularShows,
    fetchNextPage: fetchNextPopular,
    hasNextPage: hasNextPopular,
    isFetchingNextPage: isFetchingPopular,
    refetch: refetchPopular,
  } = useTVShowsList('popular');

  // Trending TV Shows
  const {
    data: trendingShows,
    fetchNextPage: fetchNextTrending,
    hasNextPage: hasNextTrending,
    isFetchingNextPage: isFetchingTrending,
    refetch: refetchTrending,
  } = useTrendingTVShows('day');

  // Latest Shows
  const {
    data: latestShows,
    fetchNextPage: fetchNextLatest,
    hasNextPage: hasNextLatest,
    isFetchingNextPage: isFetchingLatest,
    refetch: refetchLatest,
  } = useTVShowsList('latest');

  // Get a random popular show for the banner
  const featuredShow = useMemo(() => {
    if (!latestShows?.pages?.[0]?.results) return null;
    const shows = latestShows.pages[0].results;
    const randomIndex = Math.floor(Math.random() * Math.min(shows.length, 5));
    return shows[randomIndex];
  }, [latestShows]);

  const handleFeaturedPress = useCallback(() => {
    if (featuredShow) {
      navigateWithLimit('TVShowDetails', {show: featuredShow});
    }
  }, [navigateWithLimit, featuredShow]);

  // Top Rated TV Shows
  const {
    data: topRatedShows,
    fetchNextPage: fetchNextTopRated,
    hasNextPage: hasNextTopRated,
    isFetchingNextPage: isFetchingTopRated,
    refetch: refetchTopRated,
  } = useTVShowsList('top_rated');

  const {
    data: top10ShowsTodayByRegion,
    isFetching: isFetchingTop10ShowsTodayByRegion,
  } = useTop10ShowsTodayByRegion();

  // Genre IDs for TV
  const kidsGenreId = 16;
  const familyGenreId = 10751;
  const comedyGenreId = 35;
  const romanceGenreId = 10749;
  const actionGenreId = 10759; // Action & Adventure for TV

  const {
    data: kidsShows,
    fetchNextPage: fetchNextKids,
    hasNextPage: hasNextKids,
    isFetchingNextPage: isFetchingKids,
  } = useDiscoverTVShows({
    with_genres: kidsGenreId.toString(),
  });

  const {
    data: familyShows,
    fetchNextPage: fetchNextFamily,
    hasNextPage: hasNextFamily,
    isFetchingNextPage: isFetchingFamily,
  } = useDiscoverTVShows({
    with_genres: familyGenreId.toString(),
  });

  const {
    data: comedyShows,
    fetchNextPage: fetchNextComedy,
    hasNextPage: hasNextComedy,
    isFetchingNextPage: isFetchingComedy,
  } = useDiscoverTVShows({
    with_genres: comedyGenreId.toString(),
  });

  const {
    data: romanceShows,
    fetchNextPage: fetchNextRomance,
    hasNextPage: hasNextRomance,
    isFetchingNextPage: isFetchingRomance,
  } = useDiscoverTVShows({
    with_genres: romanceGenreId.toString(),
  });

  const {
    data: actionShows,
    fetchNextPage: fetchNextAction,
    hasNextPage: hasNextAction,
    isFetchingNextPage: isFetchingAction,
  } = useDiscoverTVShows({
    with_genres: actionGenreId.toString(),
  });

  const handleShowPress = useCallback(
    (item: ContentItem) => {
      if (item.type === 'tv') {
        navigateWithLimit('TVShowDetails', {show: item as TVShow});
      } else {
        navigateWithLimit('MovieDetails', {movie: item as Movie});
      }
    },
    [navigateWithLimit],
  );

  const getShowsFromData = (data: any) =>
    data?.pages.flatMap((page: any) =>
      page.results.map((show: any) => ({...show, type: 'tv' as const})),
    ) || [];

  const handleSeeAllPress = useCallback(
    (title: string, categoryType: TVShowCategoryType) => {
      navigateWithLimit('Category', {
        title,
        categoryType,
        contentType: 'tv',
      });
    },
    [navigateWithLimit],
  );

  // 1. Memoize getShowsFromData results per paginated data
  const latestShowsFlat = useMemo(
    () => getShowsFromData(latestShows),
    [latestShows],
  );
  const popularShowsFlat = useMemo(
    () => getShowsFromData(popularShows),
    [popularShows],
  );
  const topRatedShowsFlat = useMemo(
    () => getShowsFromData(topRatedShows),
    [topRatedShows],
  );
  const kidsShowsFlat = useMemo(
    () => getShowsFromData(kidsShows).filter((show: any) => !show.adult),
    [kidsShows],
  );
  const familyShowsFlat = useMemo(
    () => getShowsFromData(familyShows).filter((show: any) => !show.adult),
    [familyShows],
  );
  const comedyShowsFlat = useMemo(
    () => getShowsFromData(comedyShows).filter((show: any) => !show.adult),
    [comedyShows],
  );
  const romanceShowsFlat = useMemo(
    () => getShowsFromData(romanceShows).filter((show: any) => !show.adult),
    [romanceShows],
  );
  const actionShowsFlat = useMemo(
    () => getShowsFromData(actionShows).filter((show: any) => !show.adult),
    [actionShows],
  );

  // 2. Move onSeeAllPress handlers outside useMemo for stable references
  const onSeeAllLatest = useCallback(
    () => handleSeeAllPress('Latest Shows', 'latest'),
    [handleSeeAllPress],
  );
  const onSeeAllPopular = useCallback(
    () => handleSeeAllPress('Popular Shows', 'popular'),
    [handleSeeAllPress],
  );
  const onSeeAllTopRated = useCallback(
    () => handleSeeAllPress('Top Rated Shows', 'top_rated'),
    [handleSeeAllPress],
  );
  const onSeeAllKids = useCallback(
    () => handleSeeAllPress('Kids', 'popular'),
    [handleSeeAllPress],
  );
  const onSeeAllFamily = useCallback(
    () => handleSeeAllPress('Family', 'popular'),
    [handleSeeAllPress],
  );
  const onSeeAllComedy = useCallback(
    () => handleSeeAllPress('Comedy', 'popular'),
    [handleSeeAllPress],
  );
  const onSeeAllRomance = useCallback(
    () => handleSeeAllPress('Romance', 'popular'),
    [handleSeeAllPress],
  );
  const onSeeAllAction = useCallback(
    () => handleSeeAllPress('Action', 'popular'),
    [handleSeeAllPress],
  );

  // 3. Optimize useMemo for sections
  const sections = useMemo(() => {
    const sectionsList = [];

    // Featured banner section
    if (featuredShow) {
      sectionsList.push({
        id: 'featured',
        type: 'featured',
        data: featuredShow,
      });
    } else if (isFetchingLatest) {
      sectionsList.push({
        id: 'featuredSkeleton',
        type: 'featuredSkeleton',
        data: null,
      });
    }

    // Genres section
    sectionsList.push({
      id: 'genres',
      type: 'genres',
      data: genres,
      isLoading: isLoadingGenres,
      onItemPress: handleGenrePress,
    });

    // Latest Shows section
    if (latestShowsFlat.length) {
      sectionsList.push({
        id: 'latestShows',
        type: 'horizontalList',
        title: 'Latest Shows',
        data: latestShowsFlat,
        onItemPress: handleShowPress,
        onEndReached: hasNextLatest ? fetchNextLatest : undefined,
        isLoading: isFetchingLatest,
        onSeeAllPress: onSeeAllLatest,
      });
    } else if (isFetchingLatest) {
      sectionsList.push({
        id: 'latestShowsSkeleton',
        type: 'horizontalListSkeleton',
      });
    }

    // Popular Shows section
    if (popularShowsFlat.length) {
      sectionsList.push({
        id: 'popularShows',
        type: 'horizontalList',
        title: 'Popular Shows',
        data: popularShowsFlat,
        onItemPress: handleShowPress,
        onEndReached: hasNextPopular ? fetchNextPopular : undefined,
        isLoading: isFetchingPopular,
        onSeeAllPress: onSeeAllPopular,
      });
    } else if (isFetchingPopular) {
      sectionsList.push({
        id: 'popularShowsSkeleton',
        type: 'horizontalListSkeleton',
      });
    }

    // Top Rated Shows section
    if (topRatedShowsFlat.length) {
      sectionsList.push({
        id: 'topRatedShows',
        type: 'horizontalList',
        title: 'Top Rated Shows',
        data: topRatedShowsFlat,
        onItemPress: handleShowPress,
        onEndReached: hasNextTopRated ? fetchNextTopRated : undefined,
        isLoading: isFetchingTopRated,
        onSeeAllPress: onSeeAllTopRated,
      });
    } else if (isFetchingTopRated) {
      sectionsList.push({
        id: 'topRatedShowsSkeleton',
        type: 'horizontalListSkeleton',
      });
    }

    // Top 10 section
    if (isFetchingTop10ShowsTodayByRegion) {
      sectionsList.push({
        id: 'top10Skeleton',
        type: 'horizontalListSkeleton',
      });
    } else if (top10ShowsTodayByRegion?.length) {
      sectionsList.push({
        id: 'top10',
        type: 'horizontalList',
        title: `Top 10 in ${region?.english_name}`,
        data: top10ShowsTodayByRegion,
        isLoading: false,
        onItemPress: handleShowPress,
        isSeeAll: false,
        isTop10: true,
      });
    }

    // Add after main lists
    // Kids Shows
    if (kidsShowsFlat.length) {
      sectionsList.push({
        id: 'kidsShows',
        type: 'horizontalList',
        title: 'Kids',
        data: kidsShowsFlat,
        onItemPress: handleShowPress,
        onEndReached: hasNextKids ? fetchNextKids : undefined,
        isLoading: isFetchingKids,
        onSeeAllPress: onSeeAllKids,
      });
    }
    // Family Shows
    if (familyShowsFlat.length) {
      sectionsList.push({
        id: 'familyShows',
        type: 'horizontalList',
        title: 'Family',
        data: familyShowsFlat,
        onItemPress: handleShowPress,
        onEndReached: hasNextFamily ? fetchNextFamily : undefined,
        isLoading: isFetchingFamily,
        onSeeAllPress: onSeeAllFamily,
      });
    }
    // Comedy Shows
    if (comedyShowsFlat.length) {
      sectionsList.push({
        id: 'comedyShows',
        type: 'horizontalList',
        title: 'Comedy',
        data: comedyShowsFlat,
        onItemPress: handleShowPress,
        onEndReached: hasNextComedy ? fetchNextComedy : undefined,
        isLoading: isFetchingComedy,
        onSeeAllPress: onSeeAllComedy,
      });
    }
    // Romance Shows
    if (romanceShowsFlat.length) {
      sectionsList.push({
        id: 'romanceShows',
        type: 'horizontalList',
        title: 'Romance',
        data: romanceShowsFlat,
        onItemPress: handleShowPress,
        onEndReached: hasNextRomance ? fetchNextRomance : undefined,
        isLoading: isFetchingRomance,
        onSeeAllPress: onSeeAllRomance,
      });
    }
    // Action Shows
    if (actionShowsFlat.length) {
      sectionsList.push({
        id: 'actionShows',
        type: 'horizontalList',
        title: 'Action',
        data: actionShowsFlat,
        onItemPress: handleShowPress,
        onEndReached: hasNextAction ? fetchNextAction : undefined,
        isLoading: isFetchingAction,
        onSeeAllPress: onSeeAllAction,
      });
    }

    return sectionsList;
  }, [
    featuredShow,
    genres,
    isLoadingGenres,
    latestShowsFlat,
    popularShowsFlat,
    topRatedShowsFlat,
    top10ShowsTodayByRegion,
    region,
    handleGenrePress,
    handleShowPress,
    isFetchingLatest,
    isFetchingPopular,
    isFetchingTopRated,
    isFetchingTop10ShowsTodayByRegion,
    hasNextLatest,
    hasNextPopular,
    hasNextTopRated,
    fetchNextLatest,
    fetchNextPopular,
    fetchNextTopRated,
    kidsShowsFlat,
    hasNextKids,
    fetchNextKids,
    isFetchingKids,
    familyShowsFlat,
    hasNextFamily,
    fetchNextFamily,
    isFetchingFamily,
    comedyShowsFlat,
    hasNextComedy,
    fetchNextComedy,
    isFetchingComedy,
    romanceShowsFlat,
    hasNextRomance,
    fetchNextRomance,
    isFetchingRomance,
    actionShowsFlat,
    hasNextAction,
    fetchNextAction,
    isFetchingAction,
    onSeeAllLatest,
    onSeeAllPopular,
    onSeeAllTopRated,
    onSeeAllKids,
    onSeeAllFamily,
    onSeeAllComedy,
    onSeeAllRomance,
    onSeeAllAction,
  ]);

  const renderSection = useCallback(
    ({item}: {item: any}) => {
      switch (item.type) {
        case 'featured':
          return (
            <FeaturedBanner
              item={item.data}
              type="tv"
              slides={(popularShowsFlat || []).filter(Boolean).slice(0, 7)}
              autoPlayIntervalMs={5000}
            />
          );
        case 'featuredSkeleton':
          return <BannerSkeleton />;
        case 'genres':
          return (
            <HorizontalGenreList
              title="Genres"
              data={item.data}
              onItemPress={item.onItemPress}
              isLoading={item.isLoading}
            />
          );
        case 'horizontalList':
          return (
            <HorizontalList
              title={item.title}
              data={item.data}
              onItemPress={item.onItemPress}
              onEndReached={item.onEndReached}
              isLoading={item.isLoading}
              onSeeAllPress={item.onSeeAllPress}
              isSeeAll={item.isSeeAll}
              isTop10={item.isTop10}
            />
          );
        case 'horizontalListSkeleton':
          return (
            <View>
              <HeadingSkeleton />
              <HorizontalListSkeleton />
            </View>
          );
        default:
          return null;
      }
    },
    [popularShowsFlat],
  );

  const keyExtractor = useCallback((item: any) => item.id, []);

  const isInitialLoading =
    !popularShows?.pages?.[0]?.results?.length ||
    !topRatedShows?.pages?.[0]?.results?.length ||
    !latestShows?.pages?.[0]?.results?.length;

  if (isInitialLoading) {
    return (
      <View
        style={{
          backgroundColor: colors.background.primary,
          marginTop: -20,
          paddingBottom: 100,
        }}>
        <BannerSkeleton />
        <HeadingSkeleton />
        <GenreListSkeleton />
        <HeadingSkeleton />
        <HorizontalListSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlashList
        data={sections}
        renderItem={renderSection}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingBottom: 100}}
        estimatedItemSize={320}
        getItemType={(item: any) => item.type}
        overrideItemLayout={(layout, item) => {
          // Provide stable heights to avoid on-the-fly measurements
          switch (item.type) {
            case 'featured':
              layout.size = 420; // banner height + paddings
              break;
            case 'featuredSkeleton':
              layout.size = 420;
              break;
            case 'genres':
              layout.size = 140; // heading + chips
              break;
            case 'horizontalList':
              layout.size = 300; // heading + row list
              break;
            case 'horizontalListSkeleton':
              layout.size = 300;
              break;
            default:
              layout.size = 300;
          }
        }}
        // FlashList optimizations
        removeClippedSubviews={true}
        // Scroll optimizations
        scrollEventThrottle={16}
        // Performance optimizations
        extraData={null}
        onScrollBeginDrag={() => {}}
        onScrollEndDrag={() => {}}
        onMomentumScrollEnd={() => {}}
        // Memory management
        disableIntervalMomentum={false}
        // initialNumToRender and windowSize removed, not supported by FlashList
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: colors.text.primary,
    ...typography.h2,
  },
  genreList: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  genreItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.secondary,
    borderRadius: 20,
    marginRight: spacing.sm,
  },
  genreText: {
    ...typography.body2,
    color: colors.text.primary,
  },
});
