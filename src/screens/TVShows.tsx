import React, {useCallback, useMemo, useState} from 'react';
import {View, StyleSheet, FlatList} from 'react-native';
import {
  useTop10ShowsTodayByRegion,
  useTrendingTVShows,
  useTVShowsList,
  useDiscoverTVShows,
} from '../hooks/useTVShows';
import {TVShow} from '../types/tvshow';
import {HorizontalList} from '../components/HorizontalList';
import {FeaturedBanner} from '../components/FeaturedBanner';
import {ContentItem} from '../components/MovieList';
import {TVShowCategoryType} from '../types/navigation';
import {colors, spacing, typography} from '../styles/theme';
import {GestureHandlerRootView as RNGestureHandlerRootView} from 'react-native-gesture-handler';
import {
  BannerSkeleton,
  GenreListSkeleton,
  HeadingSkeleton,
  HorizontalListSkeleton,
} from '../components/LoadingSkeleton';
import {useGenres} from '../hooks/useGenres';
import {Genre} from '../types/movie';
import {useRegion} from '../hooks/useApp';
import {HorizontalGenreList} from '../components/HorizontalGenreList';
import {useNavigationState} from '../hooks/useNavigationState';
import {Movie} from '../types/movie';
import {
  useMyLanguage,
  useMyOTTs,
  useTVByLanguageSimpleHook,
} from '../hooks/usePersonalization';
import {OttTabbedSection} from '../components/OttTabbedSection';
import {TrendingTVShowsSection} from '../components/TrendingTVShowsSection';
import {MyLanguageTVShowsInOTTsSection} from '../components/MyLanguageTVShowsInOTTsSection';

export const TVShowsScreen = React.memo(() => {
  const {data: region} = useRegion();
  const {navigateWithLimit} = useNavigationState();
  const [isBannerVisible, setIsBannerVisible] = useState(true);

  // Use cached genres hook
  const {data: genres = [], isLoading: isLoadingGenres} = useGenres('tv');

  const handleGenrePress = useCallback(
    (genre: Genre) => {
      navigateWithLimit('Genre', {
        genreId: genre.id,
        genreName: genre.name,
        contentType: 'tv',
      });
    },
    [navigateWithLimit],
  );

  // Popular TV Shows
  const {
    data: popularShows,
    fetchNextPage: fetchNextPopular,
    hasNextPage: hasNextPopular,
    isFetchingNextPage: isFetchingPopular,
    refetch: refetchPopular,
  } = useTVShowsList('popular');

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
    () =>
      navigateWithLimit('Category', {
        title: 'Kids',
        contentType: 'tv',
        filter: {with_genres: kidsGenreId.toString()},
      }),
    [navigateWithLimit],
  );
  const onSeeAllFamily = useCallback(
    () =>
      navigateWithLimit('Category', {
        title: 'Family',
        contentType: 'tv',
        filter: {with_genres: familyGenreId.toString()},
      }),
    [navigateWithLimit],
  );
  const onSeeAllComedy = useCallback(
    () =>
      navigateWithLimit('Category', {
        title: 'Comedy',
        contentType: 'tv',
        filter: {with_genres: comedyGenreId.toString()},
      }),
    [navigateWithLimit],
  );
  const onSeeAllRomance = useCallback(
    () =>
      navigateWithLimit('Category', {
        title: 'Romance',
        contentType: 'tv',
        filter: {with_genres: romanceGenreId.toString()},
      }),
    [navigateWithLimit],
  );
  const onSeeAllAction = useCallback(
    () =>
      navigateWithLimit('Category', {
        title: 'Action',
        contentType: 'tv',
        filter: {with_genres: actionGenreId.toString()},
      }),
    [navigateWithLimit],
  );

  // Personalization (simple APIs)
  const {data: myLanguage} = useMyLanguage();
  const {data: myOTTs = []} = useMyOTTs();
  const defaultOTTs =
    region?.iso_3166_1 === 'IN'
      ? [
          {id: 8, provider_name: 'Netflix'},
          {id: 2336, provider_name: 'JioHotstar'},
          {id: 119, provider_name: 'Amazon Prime Video'},
        ]
      : [
          {id: 8, provider_name: 'Netflix'},
          {id: 10, provider_name: 'Amazon Video'},
          {id: 337, provider_name: 'Disney+'},
        ];
  const baseOTTs = myOTTs && myOTTs.length ? myOTTs : defaultOTTs;
  const normalizeProvider = (p: any) => {
    const nameRaw = p?.provider_name ?? p?.name ?? '';
    let id = p?.id ?? p?.provider_id;
    let provider_name = nameRaw || 'Provider';
    // Prime mapping
    if (/prime\s*video/i.test(provider_name) || id === 9 || id === 119) {
      if (region?.iso_3166_1 === 'IN') {
        id = 119;
        if (!nameRaw) provider_name = 'Amazon Prime Video';
      } else {
        id = 10;
        if (!nameRaw) provider_name = 'Amazon Video';
      }
    }
    // Disney/Hotstar mapping
    if (
      /disney|hotstar|jio\s*hotstar/i.test(provider_name) ||
      id === 337 ||
      id === 122 ||
      id === 2336
    ) {
      if (region?.iso_3166_1 === 'IN') {
        id = 2336;
        if (!nameRaw) provider_name = 'JioHotstar';
      } else {
        id = 337;
        if (!nameRaw) provider_name = 'Disney+';
      }
    }
    return {id, provider_name};
  };
  const allOttsNormalized = useMemo(
    () => baseOTTs.map(normalizeProvider),
    [baseOTTs, region?.iso_3166_1],
  );
  const langSimpleTV = useTVByLanguageSimpleHook(myLanguage?.iso_639_1);
  // Latest Shows in My Language (separate from Popular)
  const {
    data: latestLangTV,
    fetchNextPage: fetchNextLatestLangTV,
    hasNextPage: hasNextLatestLangTV,
    isFetchingNextPage: isFetchingLatestLangTV,
  } = useDiscoverTVShows(
    myLanguage?.iso_639_1
      ? {
          with_original_language: myLanguage.iso_639_1,
          sort_by: 'first_air_date.desc',
        }
      : ({} as any),
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

    // Trending TV Shows section
    sectionsList.push({
      id: 'trendingTVShows',
      type: 'trendingTVShows',
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

    // My Language Latest TV list
    if (myLanguage?.iso_639_1) {
      const latestTV = getShowsFromData(latestLangTV);
      if (latestTV?.length) {
        sectionsList.push({
          id: 'myLangTVLatest',
          type: 'horizontalList',
          title: `Latest Shows in ${
            myLanguage.name || myLanguage.english_name
          }`,
          data: latestTV,
          onItemPress: handleShowPress,
          onEndReached: hasNextLatestLangTV ? fetchNextLatestLangTV : undefined,
          isLoading: isFetchingLatestLangTV,
          isSeeAll: true,
          onSeeAllPress: () =>
            navigateWithLimit('Category', {
              title: `Latest Shows in ${
                myLanguage.name || myLanguage.english_name
              }`,
              contentType: 'tv',
              filter: {
                with_original_language: myLanguage.iso_639_1,
                sort_by: 'first_air_date.desc',
              },
            }),
        });
      }
    }

    // My Language simple TV list
    if (myLanguage?.iso_639_1) {
      const langTV = getShowsFromData(langSimpleTV?.data);
      if (langTV?.length) {
        sectionsList.push({
          id: 'myLangTVSimple',
          type: 'horizontalList',
          title: `Popular Shows in ${
            myLanguage.name || myLanguage.english_name
          }`,
          data: langTV,
          onItemPress: handleShowPress,
          onEndReached: langSimpleTV?.hasNextPage
            ? langSimpleTV.fetchNextPage
            : undefined,
          isLoading: langSimpleTV?.isLoading,
          isSeeAll: true,
          onSeeAllPress: () =>
            navigateWithLimit('Category', {
              title: `Popular Shows in ${
                myLanguage.name || myLanguage.english_name
              }`,
              contentType: 'tv',
              filter: {with_original_language: myLanguage.iso_639_1},
            }),
        });
      }

      // MyLanguage + MyOTTs combined section
      sectionsList.push({
        id: 'myLanguageTVShowsInOTTsSection',
        type: 'myLanguageTVShowsInOTTsSection',
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

    // My OTTs sections: Tabbed sections for Latest and Popular
    const isPersonalizedOTTs = myOTTs && myOTTs.length > 0;
    if (allOttsNormalized.length > 0) {
      // Latest on My OTTs
      sectionsList.push({
        id: 'tv_ott_tabbed_section_latest',
        type: 'ottTabbedSection',
        providers: allOttsNormalized,
        isPersonalized: isPersonalizedOTTs,
        kind: 'latest',
        contentType: 'tv',
      });
      
      // Popular on My OTTs
      sectionsList.push({
        id: 'tv_ott_tabbed_section_popular',
        type: 'ottTabbedSection',
        providers: allOttsNormalized,
        isPersonalized: isPersonalizedOTTs,
        kind: 'popular',
        contentType: 'tv',
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
    myLanguage,
    langSimpleTV?.data,
    langSimpleTV?.isLoading,
    langSimpleTV?.hasNextPage,
    // OTT deps
    allOttsNormalized,
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
              autoplayEnabled={isBannerVisible}
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
        case 'trendingTVShows':
          return <TrendingTVShowsSection />;
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
        case 'ottTabbedSection':
          return (
            <OttTabbedSection
              providers={item.providers}
              isPersonalized={item.isPersonalized}
              kind={item.kind}
              contentType={item.contentType}
            />
          );
        case 'myLanguageTVShowsInOTTsSection':
          return <MyLanguageTVShowsInOTTsSection />;

        default:
          return null;
      }
    },
    [popularShowsFlat, isBannerVisible],
  );

  const keyExtractor = useCallback((item: any) => String(item.id), []);

  // Estimate heights per section type to help FlatList skip measurements
  const sectionHeights = useMemo<number[]>(() => {
    const estimate = (t: string) => {
      switch (t) {
        case 'featured':
        case 'featuredSkeleton':
          return 580; // closer to actual banner height to avoid relayout
        case 'genres':
          return 140;
        case 'trendingTVShows':
          return 380; // title + tabs + horizontal list
        case 'myLanguageTVShowsInOTTsSection':
          return 380; // title + tabs + horizontal list
        case 'ottTabbedSection':
          return 380;
        case 'horizontalList':
          return 320;
        case 'horizontalListSkeleton':
          return 300;
        default:
          return 300;
      }
    };
    return (sections as any[]).map(s => estimate(s.type));
  }, [sections]);

  const sectionOffsets = useMemo<number[]>(() => {
    const offsets: number[] = [];
    let acc = 0;
    for (let i = 0; i < sectionHeights.length; i++) {
      offsets.push(acc);
      acc += sectionHeights[i];
    }
    return offsets;
  }, [sectionHeights]);

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: sectionHeights[index] || 300,
      offset: sectionOffsets[index] || 0,
      index,
    }),
    [sectionHeights, sectionOffsets],
  );

  // Pause banner autoplay when it's offscreen
  const viewabilityConfig = useMemo(
    () => ({
      minimumViewTime: 80,
      viewAreaCoveragePercentThreshold: 25,
    }),
    [],
  );

  const onViewableItemsChanged = useCallback(({viewableItems}: any) => {
    const visible = viewableItems?.some(
      (vi: any) => vi?.item?.type === 'featured',
    );
    setIsBannerVisible(!!visible);
  }, []);

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
    <RNGestureHandlerRootView style={{flex: 1, backgroundColor: 'transparent'}}>
      <View style={styles.container}>
        <FlatList
          data={sections}
          renderItem={renderSection}
          keyExtractor={keyExtractor}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{paddingBottom: 100}}
          getItemLayout={getItemLayout}
          viewabilityConfig={viewabilityConfig}
          onViewableItemsChanged={onViewableItemsChanged}
        />
      </View>
    </RNGestureHandlerRootView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
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
