import React, {useCallback, useMemo, useEffect, useState, useRef} from 'react';
import {View, StyleSheet} from 'react-native';
import {
  useMoviesList,
  useTop10MoviesTodayByRegion,
  useDiscoverMovies,
} from '../hooks/useMovies';
import {Movie} from '../types/movie';
import {useNavigation, useIsFocused} from '@react-navigation/native';
import {HorizontalList} from '../components/HorizontalList';
import {FeaturedBanner} from '../components/FeaturedBanner';
import {ContentItem} from '../components/MovieList';
import {RootStackParamList, MovieCategoryType} from '../types/navigation';
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
import {TVShow} from '../types/tvshow';
import {HorizontalGenreList} from '../components/HorizontalGenreList';
import {useNavigationState} from '../hooks/useNavigationState';
import {FlatList} from 'react-native-gesture-handler';
import {GestureHandlerRootView as RNGestureHandlerRootView} from 'react-native-gesture-handler';
import {
  useMyLanguage,
  useMyOTTs,
  useMoviesByLanguageSimpleHook,
} from '../hooks/usePersonalization';
import {OttRowMovies} from '../components/OttRowMovies';

type MoviesScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const MoviesScreen = React.memo(() => {
  const {data: region} = useRegion();
  const navigation = useNavigation<MoviesScreenNavigationProp>();
  const {navigateWithLimit} = useNavigationState();
  const isFocused = useIsFocused();
  const [genres, setGenres] = useState<Genre[]>([]);
  const [isLoadingGenres, setIsLoadingGenres] = useState(true);
  const [renderPhase, setRenderPhase] = useState(0);
  const [isBannerVisible, setIsBannerVisible] = useState(true);

  // Staggered loading to reduce initial render load
  useEffect(() => {
    const timer1 = setTimeout(() => setRenderPhase(1), 100);
    const timer2 = setTimeout(() => setRenderPhase(2), 300);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  useEffect(() => {
    const loadGenres = async () => {
      try {
        const movieGenres = await getGenres('movie');
        setGenres(movieGenres);
        setIsLoadingGenres(false);
      } catch (error) {
        console.error('Error loading genres:', error);
        setIsLoadingGenres(false);
      }
    };
    loadGenres();
  }, []);

  // Recent Movies (Now Playing)
  const {
    data: recentMovies,
    fetchNextPage: fetchNextRecent,
    hasNextPage: hasNextRecent,
    isFetchingNextPage: isFetchingRecent,
  } = useMoviesList('latest');

  // Popular Movies
  const {
    data: popularMovies,
    fetchNextPage: fetchNextPopular,
    hasNextPage: hasNextPopular,
    isFetchingNextPage: isFetchingPopular,
  } = useMoviesList('popular');

  // Top Rated Movies
  const {
    data: topRatedMovies,
    fetchNextPage: fetchNextTopRated,
    hasNextPage: hasNextTopRated,
    isFetchingNextPage: isFetchingTopRated,
  } = useMoviesList('top_rated');

  // Now Playing Movies
  const {
    data: nowPlayingMovies,
    fetchNextPage: fetchNextNowPlaying,
    hasNextPage: hasNextNowPlaying,
    isFetchingNextPage: isFetchingNowPlaying,
  } = useMoviesList('now_playing');

  // Upcoming Movies
  const {
    data: upcomingMovies,
    fetchNextPage: fetchNextUpcoming,
    hasNextPage: hasNextUpcoming,
    isFetchingNextPage: isFetchingUpcoming,
  } = useMoviesList('upcoming');

  // Genre IDs
  const kidsGenreId = 16;
  const familyGenreId = 10751;
  const comedyGenreId = 35;
  const romanceGenreId = 10749;
  const actionGenreId = 28;

  const {
    data: kidsMovies,
    fetchNextPage: fetchNextKids,
    hasNextPage: hasNextKids,
    isFetchingNextPage: isFetchingKids,
  } = useDiscoverMovies({
    with_genres: kidsGenreId.toString(),
  });

  const {
    data: familyMovies,
    fetchNextPage: fetchNextFamily,
    hasNextPage: hasNextFamily,
    isFetchingNextPage: isFetchingFamily,
  } = useDiscoverMovies({
    with_genres: familyGenreId.toString(),
  });

  const {
    data: comedyMovies,
    fetchNextPage: fetchNextComedy,
    hasNextPage: hasNextComedy,
    isFetchingNextPage: isFetchingComedy,
  } = useDiscoverMovies({
    with_genres: comedyGenreId.toString(),
  });

  const {
    data: romanceMovies,
    fetchNextPage: fetchNextRomance,
    hasNextPage: hasNextRomance,
    isFetchingNextPage: isFetchingRomance,
  } = useDiscoverMovies({
    with_genres: romanceGenreId.toString(),
  });

  const {
    data: actionMovies,
    fetchNextPage: fetchNextAction,
    hasNextPage: hasNextAction,
    isFetchingNextPage: isFetchingAction,
  } = useDiscoverMovies({
    with_genres: actionGenreId.toString(),
  });

  const {
    data: top10MoviesTodayByRegion,
    isFetching: isFetchingTop10MoviesTodayByRegion,
  } = useTop10MoviesTodayByRegion();

  const top10MoviesTodayByRegionData = useMemo(() => {
    return top10MoviesTodayByRegion || [];
  }, [top10MoviesTodayByRegion]);

  // Get a random popular movie for the banner
  const featuredMovie = useMemo(() => {
    if (!recentMovies?.pages?.[0]?.results) return null;
    const movies = recentMovies.pages[0].results;
    const randomIndex = Math.floor(Math.random() * Math.min(movies.length, 5));
    return movies[randomIndex];
  }, [recentMovies]);

  const handleFeaturedPress = useCallback(() => {
    if (featuredMovie) {
      navigateWithLimit('MovieDetails', {movie: featuredMovie});
    }
  }, [navigateWithLimit, featuredMovie]);

  const handleMoviePress = useCallback(
    (item: ContentItem) => {
      if (item.type !== 'tv') {
        navigateWithLimit('MovieDetails', {movie: item as Movie});
      } else {
        navigateWithLimit('TVShowDetails', {tv: item as TVShow});
      }
    },
    [navigateWithLimit],
  );

  const getMoviesFromData = (data: any) =>
    data?.pages.flatMap((page: any) =>
      page.results.map((movie: any) => ({...movie, type: 'movie' as const})),
    ) || [];

  const handleSeeAllPress = useCallback(
    (title: string, categoryType: MovieCategoryType) => {
      navigateWithLimit('Category', {
        title,
        categoryType,
        contentType: 'movie',
      });
    },
    [navigateWithLimit],
  );

  const handleGenrePress = useCallback(
    (genre: Genre) => {
      navigateWithLimit('Genre', {
        genreId: genre.id,
        genreName: genre.name,
        contentType: 'movie',
      });
    },
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
  const allOttsNormalized = baseOTTs.map(normalizeProvider);
  const langSimple = useMoviesByLanguageSimpleHook(myLanguage?.iso_639_1);
  // Today string for date filters
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  // Latest Movies in My Language (separate from Popular)
  const {
    data: latestLangMovies,
    fetchNextPage: fetchNextLatestLangMovies,
    hasNextPage: hasNextLatestLangMovies,
    isFetchingNextPage: isFetchingLatestLangMovies,
  } = useDiscoverMovies(
    myLanguage?.iso_639_1
      ? {
          with_original_language: myLanguage.iso_639_1,
          sort_by: 'release_date.desc',
          'release_date.lte': todayStr,
        }
      : ({} as any),
  );

  // 1. Memoize getMoviesFromData results per paginated data
  const recentMoviesFlat = useMemo(
    () => getMoviesFromData(recentMovies),
    [recentMovies],
  );
  const popularMoviesFlat = useMemo(
    () => getMoviesFromData(popularMovies),
    [popularMovies],
  );
  const topRatedMoviesFlat = useMemo(
    () => getMoviesFromData(topRatedMovies),
    [topRatedMovies],
  );
  const nowPlayingMoviesFlat = useMemo(
    () => getMoviesFromData(nowPlayingMovies),
    [nowPlayingMovies],
  );
  const upcomingMoviesFlat = useMemo(
    () => getMoviesFromData(upcomingMovies),
    [upcomingMovies],
  );
  const kidsMoviesFlat = useMemo(
    () => getMoviesFromData(kidsMovies).filter((movie: any) => !movie.adult),
    [kidsMovies],
  );
  const familyMoviesFlat = useMemo(
    () => getMoviesFromData(familyMovies).filter((movie: any) => !movie.adult),
    [familyMovies],
  );
  const comedyMoviesFlat = useMemo(
    () => getMoviesFromData(comedyMovies).filter((movie: any) => !movie.adult),
    [comedyMovies],
  );
  const actionMoviesFlat = useMemo(
    () => getMoviesFromData(actionMovies).filter((movie: any) => !movie.adult),
    [actionMovies],
  );

  // Featured slides: merge multiple sources, keep items with backdrops, dedupe by id
  const featuredSlides = useMemo(() => {
    const merged: Movie[] = (
      [
        ...recentMoviesFlat,
        ...popularMoviesFlat,
        ...topRatedMoviesFlat,
        ...nowPlayingMoviesFlat,
        ...upcomingMoviesFlat,
      ].filter(Boolean) as Movie[]
    ).filter(m => !!m?.backdrop_path);
    const seen = new Set<number>();
    const deduped: Movie[] = [];
    for (const m of merged) {
      if (!seen.has(m.id)) {
        seen.add(m.id);
        deduped.push(m);
      }
    }
    return deduped.slice(0, 8);
  }, [
    recentMoviesFlat,
    popularMoviesFlat,
    topRatedMoviesFlat,
    nowPlayingMoviesFlat,
    upcomingMoviesFlat,
  ]);

  // 2. Move onSeeAllPress handlers outside useMemo for stable references
  const onSeeAllRecent = useCallback(
    () => handleSeeAllPress('Recent Movies', 'latest'),
    [handleSeeAllPress],
  );
  const onSeeAllPopular = useCallback(
    () => handleSeeAllPress('Popular Movies', 'popular'),
    [handleSeeAllPress],
  );
  const onSeeAllTopRated = useCallback(
    () => handleSeeAllPress('Top Rated Movies', 'top_rated'),
    [handleSeeAllPress],
  );
  const onSeeAllNowPlaying = useCallback(
    () => handleSeeAllPress('Now Playing', 'now_playing'),
    [handleSeeAllPress],
  );
  const onSeeAllUpcoming = useCallback(
    () => handleSeeAllPress('Upcoming Movies', 'upcoming'),
    [handleSeeAllPress],
  );
  const onSeeAllKids = useCallback(
    () =>
      navigateWithLimit('Category', {
        title: 'Kids',
        contentType: 'movie',
        filter: {with_genres: kidsGenreId.toString()},
      }),
    [navigateWithLimit],
  );
  const onSeeAllFamily = useCallback(
    () =>
      navigateWithLimit('Category', {
        title: 'Family',
        contentType: 'movie',
        filter: {with_genres: familyGenreId.toString()},
      }),
    [navigateWithLimit],
  );
  const onSeeAllComedy = useCallback(
    () =>
      navigateWithLimit('Category', {
        title: 'Comedy',
        contentType: 'movie',
        filter: {with_genres: comedyGenreId.toString()},
      }),
    [navigateWithLimit],
  );
  const onSeeAllAction = useCallback(
    () =>
      navigateWithLimit('Category', {
        title: 'Action',
        contentType: 'movie',
        filter: {with_genres: actionGenreId.toString()},
      }),
    [navigateWithLimit],
  );

  // 3. Optimize useMemo for sections
  const sections = useMemo(() => {
    const sectionsList = [];

    // Featured banner section (prefer slides, fallback to featuredMovie, else skeleton while fetching)
    if (featuredSlides.length > 0 || featuredMovie) {
      sectionsList.push({
        id: 'featured',
        type: 'featured',
        data: featuredMovie || featuredSlides[0],
      });
    } else if (isFetchingRecent) {
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

    // Recent Movies section
    if (renderPhase >= 1 && recentMoviesFlat.length) {
      sectionsList.push({
        id: 'recentMovies',
        type: 'horizontalList',
        title: 'Recent Movies',
        data: recentMoviesFlat,
        onItemPress: handleMoviePress,
        onEndReached: hasNextRecent ? fetchNextRecent : undefined,
        isLoading: isFetchingRecent,
        onSeeAllPress: onSeeAllRecent,
      });
    } else if (isFetchingRecent) {
      sectionsList.push({
        id: 'recentMoviesSkeleton',
        type: 'horizontalListSkeleton',
      });
    }

    // Popular Movies section
    if (renderPhase >= 2 && popularMoviesFlat.length) {
      sectionsList.push({
        id: 'popularMovies',
        type: 'horizontalList',
        title: 'Popular Movies',
        data: popularMoviesFlat,
        onItemPress: handleMoviePress,
        onEndReached: hasNextPopular ? fetchNextPopular : undefined,
        isLoading: isFetchingPopular,
        onSeeAllPress: onSeeAllPopular,
      });
    } else if (isFetchingPopular) {
      sectionsList.push({
        id: 'popularMoviesSkeleton',
        type: 'horizontalListSkeleton',
      });
    }

    // Top Rated Movies section
    if (renderPhase >= 1 && topRatedMoviesFlat.length) {
      sectionsList.push({
        id: 'topRatedMovies',
        type: 'horizontalList',
        title: 'Top Rated Movies',
        data: topRatedMoviesFlat,
        onItemPress: handleMoviePress,
        onEndReached: hasNextTopRated ? fetchNextTopRated : undefined,
        isLoading: isFetchingTopRated,
        onSeeAllPress: onSeeAllTopRated,
      });
    } else if (isFetchingTopRated) {
      sectionsList.push({
        id: 'topRatedMoviesSkeleton',
        type: 'horizontalListSkeleton',
      });
    }

    // Now Playing section
    if (renderPhase >= 2 && nowPlayingMoviesFlat.length) {
      sectionsList.push({
        id: 'nowPlaying',
        type: 'horizontalList',
        title: 'Now Playing',
        data: nowPlayingMoviesFlat,
        onItemPress: handleMoviePress,
        onEndReached: hasNextNowPlaying ? fetchNextNowPlaying : undefined,
        isLoading: isFetchingNowPlaying,
        onSeeAllPress: onSeeAllNowPlaying,
      });
    } else if (isFetchingNowPlaying) {
      sectionsList.push({
        id: 'nowPlayingSkeleton',
        type: 'horizontalListSkeleton',
      });
    }

    // Upcoming Movies section
    if (renderPhase >= 2 && upcomingMoviesFlat.length) {
      sectionsList.push({
        id: 'upcomingMovies',
        type: 'horizontalList',
        title: 'Upcoming Movies',
        data: upcomingMoviesFlat,
        onItemPress: handleMoviePress,
        onEndReached: hasNextUpcoming ? fetchNextUpcoming : undefined,
        isLoading: isFetchingUpcoming,
        onSeeAllPress: onSeeAllUpcoming,
      });
    } else if (isFetchingUpcoming) {
      sectionsList.push({
        id: 'upcomingMoviesSkeleton',
        type: 'horizontalListSkeleton',
      });
    }

    // Top 10 section
    if (isFetchingTop10MoviesTodayByRegion) {
      sectionsList.push({
        id: 'top10Skeleton',
        type: 'horizontalListSkeleton',
      });
    } else if (top10MoviesTodayByRegionData?.length) {
      sectionsList.push({
        id: 'top10',
        type: 'horizontalList',
        title: `Top 10 in ${region?.english_name}`,
        data: top10MoviesTodayByRegionData,
        isLoading: false,
        onItemPress: handleMoviePress,
        isSeeAll: false,
        isTop10: true,
      });
    }

    // My Language simple list
    if (renderPhase >= 2 && myLanguage?.iso_639_1) {
      // Latest Movies in your language
      const latestMovies = getMoviesFromData(latestLangMovies);
      if (latestMovies?.length) {
        sectionsList.push({
          id: 'myLangMoviesLatest',
          type: 'horizontalList',
          title: 'Latest Movies in your language',
          data: latestMovies,
          onItemPress: handleMoviePress,
          onEndReached: hasNextLatestLangMovies
            ? fetchNextLatestLangMovies
            : undefined,
          isLoading: isFetchingLatestLangMovies,
          isSeeAll: true,
          onSeeAllPress: () =>
            navigateWithLimit('Category', {
              title: 'Latest Movies in your language',
              contentType: 'movie',
              filter: {
                with_original_language: myLanguage.iso_639_1,
                sort_by: 'release_date.desc',
                'release_date.lte': todayStr,
              },
            }),
        });
      }
      const langMovies = getMoviesFromData(langSimple?.data);
      if (langMovies?.length) {
        sectionsList.push({
          id: 'myLangMoviesSimple',
          type: 'horizontalList',
          title: 'Popular Movies in your language',
          data: langMovies,
          onItemPress: handleMoviePress,
          onEndReached: langSimple?.hasNextPage
            ? langSimple.fetchNextPage
            : undefined,
          isLoading: langSimple?.isLoading,
          isSeeAll: true,
          onSeeAllPress: () =>
            navigateWithLimit('Category', {
              title: 'Popular Movies in your language',
              contentType: 'movie',
              filter: {with_original_language: myLanguage.iso_639_1},
            }),
        });
      }
    }

    // Kids Movies
    if (kidsMoviesFlat.length) {
      sectionsList.push({
        id: 'kidsMovies',
        type: 'horizontalList',
        title: 'Kids',
        data: kidsMoviesFlat,
        onItemPress: handleMoviePress,
        onEndReached: hasNextKids ? fetchNextKids : undefined,
        isLoading: isFetchingKids,
        onSeeAllPress: onSeeAllKids,
      });
    }
    // Family Movies
    if (familyMoviesFlat.length) {
      sectionsList.push({
        id: 'familyMovies',
        type: 'horizontalList',
        title: 'Family',
        data: familyMoviesFlat,
        onItemPress: handleMoviePress,
        onEndReached: hasNextFamily ? fetchNextFamily : undefined,
        isLoading: isFetchingFamily,
        onSeeAllPress: onSeeAllFamily,
      });
    }
    // Comedy Movies
    if (comedyMoviesFlat.length) {
      sectionsList.push({
        id: 'comedyMovies',
        type: 'horizontalList',
        title: 'Comedy',
        data: comedyMoviesFlat,
        onItemPress: handleMoviePress,
        onEndReached: hasNextComedy ? fetchNextComedy : undefined,
        isLoading: isFetchingComedy,
        onSeeAllPress: onSeeAllComedy,
      });
    }
    // Romance Movies
    if (romanceMovies?.pages?.[0]?.results?.length) {
      sectionsList.push({
        id: 'romanceMovies',
        type: 'horizontalList',
        title: 'Romance',
        data: getMoviesFromData(romanceMovies).filter(
          (movie: any) => !movie.adult,
        ),
        onItemPress: handleMoviePress,
        onEndReached: hasNextRomance ? fetchNextRomance : undefined,
        isLoading: isFetchingRomance,
        onSeeAllPress: () =>
          navigateWithLimit('Category', {
            title: 'Romance',
            contentType: 'movie',
            filter: {with_genres: romanceGenreId.toString()},
          }),
      });
    }
    // Action Movies
    if (actionMoviesFlat.length) {
      sectionsList.push({
        id: 'actionMovies',
        type: 'horizontalList',
        title: 'Action',
        data: actionMoviesFlat,
        onItemPress: handleMoviePress,
        onEndReached: hasNextAction ? fetchNextAction : undefined,
        isLoading: isFetchingAction,
        onSeeAllPress: onSeeAllAction,
      });
    }

    // My OTTs sections (movies): one row per provider using OttRowMovies
    allOttsNormalized.forEach(prov => {
      sectionsList.push({
        id: `ott_${prov.id}_movies_row`,
        type: 'ottMoviesRow',
        providerId: prov.id,
        providerName: prov.provider_name,
      });
    });

    return sectionsList;
  }, [
    featuredMovie,
    genres,
    isLoadingGenres,
    handleGenrePress,
    onSeeAllComedy,
    onSeeAllAction,
    myLanguage,
    langSimple?.data,
    langSimple?.isLoading,
    langSimple,
    latestLangMovies,
    hasNextLatestLangMovies,
    isFetchingLatestLangMovies,
    fetchNextLatestLangMovies,
    // OTT deps
    baseOTTs,
    allOttsNormalized,
  ]);

  // Render all sections without batching

  const renderSection = useCallback(({item}: {item: any}) => {
    switch (item.type) {
      case 'featured':
        return (
          <FeaturedBanner
            item={item.data}
            type="movie"
            slides={(popularMoviesFlat || []).filter(Boolean).slice(0, 7)}
            autoPlayIntervalMs={5000}
            autoplayEnabled={isBannerVisible}
          />
        );
      case 'genres':
        return (
          <HorizontalGenreList
            title="Genres"
            data={item.data}
            onItemPress={handleGenrePress}
            isLoading={item.isLoading}
          />
        );
      case 'ottMoviesRow':
        return (
          <OttRowMovies
            providerId={item.providerId}
            providerName={item.providerName}
          />
        );
      case 'featuredSkeleton':
        return <BannerSkeleton />;

      case 'horizontalList':
        return (
          <HorizontalList
            title={item.title}
            data={item.data}
            onItemPress={item.onItemPress}
            onEndReached={item.onEndReached}
            isLoading={item.isLoading}
            onSeeAllPress={item.onSeeAllPress}
            isTop10={item.isTop10}
          />
        );

      default:
        return null;
    }
  }, []);

  const keyExtractor = useCallback((item: any) => String(item.id), []);

  // Estimate heights per section to help FlatList avoid measuring
  const sectionHeights = useMemo<number[]>(() => {
    const estimate = (t: string) => {
      switch (t) {
        case 'featured':
        case 'featuredSkeleton':
          return 580; // banner in movies is taller
        case 'genres':
          return 140;
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

  // Match TVShows: pause banner autoplay when offscreen
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
    !popularMovies?.pages?.[0]?.results?.length ||
    !topRatedMovies?.pages?.[0]?.results?.length ||
    !recentMovies?.pages?.[0]?.results?.length;

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
    <RNGestureHandlerRootView style={{flex: 1}}>
      <View style={styles.container}>
        <FlatList
          data={sections}
          renderItem={renderSection}
          keyExtractor={keyExtractor}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{paddingBottom: 100}}
          removeClippedSubviews={true}
          scrollEventThrottle={16}
          initialNumToRender={4}
          windowSize={7}
          maxToRenderPerBatch={4}
          style={{display: isFocused ? ('flex' as const) : ('none' as const)}}
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
