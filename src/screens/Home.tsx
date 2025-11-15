import React, {useCallback, useEffect, useMemo, useState, useRef} from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  Modal,
  TouchableOpacity,
  useWindowDimensions,
  AppState,
} from 'react-native';
import {
  useMoviesList,
  useTop10MoviesTodayByRegion,
  useDiscoverMovies,
  useTrendingMovies,
} from '../hooks/useMovies';
import {
  useTop10ShowsTodayByRegion,
  useTVShowsList,
  useDiscoverTVShows,
} from '../hooks/useTVShows';
import {ContentItem} from '../components/MovieList';
import {HorizontalList} from '../components/HorizontalList';
import {Movie} from '../types/movie';
import {TVShow} from '../types/tvshow';
import {
  MovieCategoryType,
  TVShowCategoryType,
  ContentType,
} from '../types/navigation';
import {colors, spacing, borderRadius} from '../styles/theme';
import {
  BannerHomeSkeleton,
  HeadingSkeleton,
  HorizontalListSkeleton,
  PersonalizedBannerSkeleton,
} from '../components/LoadingSkeleton';
import {FeaturedBannerHome} from '../components/FeaturedBannerHome';
import {useRegion} from '../hooks/useApp';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {FiltersManager} from '../store/filters';
import {SavedFilter} from '../types/filters';
import {searchFilterContent} from '../services/tmdb';
import {HomeFilterRow} from '../components/HomeFilterRow';
import {useNavigationState} from '../hooks/useNavigationState';
import LinearGradient from 'react-native-linear-gradient';
import {SettingsManager} from '../store/settings';
import {useResponsive} from '../hooks/useResponsive';
import {MyNextWatch} from '../components/MyNextWatch';
import {MoodQuestionnaire} from '../components/MoodQuestionnaire';
import {
  UserPreferencesManager,
  RealmSettingsManager,
  AIPersonalizationCacheManager,
} from '../database/managers';
import {RecentSearchItemsManager} from '../store/recentSearchItems';
import {HistoryManager} from '../store/history';
import FastImage from 'react-native-fast-image';
import {useAIEnabled} from '../hooks/useAIEnabled';
import {cache, CACHE_KEYS} from '../utils/cache';
import {
  useMyOTTs,
  useMyLanguage,
  useMoviesByLanguageSimpleHook,
  useTVByLanguageSimpleHook,
  useAvailableProviders,
} from '../hooks/usePersonalization';
import {OttTabbedSection} from '../components/OttTabbedSection';
import {MoviesTabbedSection} from '../components/MoviesTabbedSection';
import {TVShowsTabbedSection} from '../components/TVShowsTabbedSection';
import {LanguageMoviesTabbedSection} from '../components/LanguageMoviesTabbedSection';
import {LanguageTVShowsTabbedSection} from '../components/LanguageTVShowsTabbedSection';
import {MyLanguageMoviesInOTTsSection} from '../components/MyLanguageMoviesInOTTsSection';
import {MyLanguageTVShowsInOTTsSection} from '../components/MyLanguageTVShowsInOTTsSection';
import {useNavigation, CompositeNavigationProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {HomeStackParamList, TabParamList} from '../types/navigation';
import {usePersonalizedRecommendations} from '../hooks/usePersonalizedRecommendations';
import {PersonalizedBanner} from '../components/PersonalizedBanner';
import {useIsFocused} from '@react-navigation/native';
import {WatchlistAISection} from '../components/WatchlistAISection';
import {ThematicGenres} from '../components/ThematicGenres';
import {OTTCardsRow} from '../components/OTTCardsRow';
import {
  useCinemaDNA,
  useTopDirectorContent,
  useTopActorContent,
} from '../hooks/useCinemaDNA';
import {
  useRewatchFavorites,
  useRecentlyWatched,
} from '../hooks/useRewatchFavorites';

export const HomeScreen = React.memo(() => {
  const {data: region} = useRegion();
  const navigation = useNavigation<any>();
  const {navigateWithLimit} = useNavigationState();
  const isFocused = useIsFocused();
  const {isAIEnabled} = useAIEnabled();
  const {
    data: personalizedRecommendations = [],
    isLoading: isLoadingPersonalized,
    isFetching: isFetchingPersonalized,
  } = usePersonalizedRecommendations();
  const [top10ContentByRegion, setTop10ContentByRegion] = useState<
    ContentItem[]
  >([]);
  const [renderPhase, setRenderPhase] = useState(2);
  const [showMoreContent, setShowMoreContent] = useState(true);
  const [moodAnswers, setMoodAnswers] = useState<{
    [key: string]: string;
  } | null>(null);
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [moodLoaded, setMoodLoaded] = useState(false);
  // Increment only when mood is updated to signal MyNextWatch to refresh
  const [moodVersion, setMoodVersion] = useState(0);
  const appState = useRef(AppState.currentState);
  const hasCheckedHistoryOnAppOpen = useRef(false);
  // We no longer force-remount MyNextWatch on Home focus; it can refresh itself via its own UI
  // const [moodRefreshKey, setMoodRefreshKey] = useState(0);
  const queryClient = useQueryClient();

  const {
    data: latestMoviesByRegion,
    hasNextPage: hasNextLatestMoviesByRegion,
    isFetchingNextPage: isFetchingLatestMoviesByRegion,
    fetchNextPage: fetchNextLatestMoviesByRegion,
  } = useMoviesList('latest_by_region');

  const {
    data: popularMovies,
    fetchNextPage: fetchNextPopularMovies,
    hasNextPage: hasNextPopularMovies,
    isFetchingNextPage: isFetchingPopularMovies,
  } = useMoviesList('popular');

  // Removed Top Rated Movies hook

  // Removed Upcoming Movies hook

  // Removed Upcoming Movies by Region hook

  // Removed Popular TV Shows hook (now using TVShowsTabbedSection)

  // Removed Top Rated TV Shows hook

  // Recent Movies (Now Playing)
  const {
    data: recentMovies,
    fetchNextPage: fetchNextRecentMovies,
    hasNextPage: hasNextRecentMovies,
    isFetchingNextPage: isFetchingRecentMovies,
  } = useMoviesList('latest');

  // Recent TV Shows (On Air)
  const {
    data: recentTVShows,
    fetchNextPage: fetchNextRecentTV,
    hasNextPage: hasNextRecentTV,
    isFetchingNextPage: isFetchingRecentTV,
  } = useTVShowsList('latest');

  // Upcoming Movies by Region (only)
  const {
    data: upcomingMoviesByRegion,
    fetchNextPage: fetchNextUpcomingMoviesByRegion,
    hasNextPage: hasNextUpcomingMoviesByRegion,
    isFetchingNextPage: isFetchingUpcomingMoviesByRegion,
  } = useMoviesList('upcoming_by_region');

  const {
    data: top10MoviesTodayByRegion,
    isFetching: isFetchingTop10MoviesTodayByRegion,
  } = useTop10MoviesTodayByRegion();

  const {
    data: top10ShowsTodayByRegion,
    isFetching: isFetchingTop10ShowsTodayByRegion,
  } = useTop10ShowsTodayByRegion();

  // // Trending Movies
  // const {
  //   data: trendingMovies,
  //   fetchNextPage: fetchNextTrendingMovies,
  //   hasNextPage: hasNextTrendingMovies,
  //   isFetchingNextPage: isFetchingTrendingMovies,
  //   refetch: refetchTrendingMovies,
  // } = useTrendingMovies('day');

  // // Trending TV Shows
  // const {
  //   data: trendingTVShows,
  //   fetchNextPage: fetchNextTrendingTVShows,
  //   hasNextPage: hasNextTrendingTVShows,
  //   isFetchingNextPage: isFetchingTrendingTVShows,
  //   refetch: refetchTrendingTVShows,
  // } = useTrendingTVShows('day');

  // Get trending movies
  const {data: trendingMoviesData} = useTrendingMovies('day');

  // Featured banner items: compute from available sources (up to 3) and refresh as data arrives
  const featuredItems = useMemo(() => {
    const latestList = recentMovies?.pages?.[0]?.results || [];
    const popularList = popularMovies?.pages?.[0]?.results || [];
    const trendingList = trendingMoviesData?.pages?.[0]?.results || [];
    const upcomingList = upcomingMoviesByRegion?.pages?.[0]?.results || [];
    const top10MoviesList = top10MoviesTodayByRegion || [];

    // Helper function to pick first item with poster that hasn't been added yet
    const pickUniqueFirstWithPoster = (arr: any[], addedIds: Set<number>) => {
      for (const item of arr || []) {
        const id = item?.id;
        if (id && !addedIds.has(id) && item?.poster_path) {
          return item;
        }
      }
      // If no unique item found, return null
      return null;
    };

    const addedIds = new Set<number>();
    const next: Array<{item: any; type: 'movie' | 'tv'; title: string}> = [];

    // Try to add one item from each category, avoiding duplicates
    // Latest
    const latestItem = pickUniqueFirstWithPoster(latestList, addedIds);
    if (latestItem) {
      addedIds.add(latestItem.id);
      next.push({item: latestItem, type: 'movie', title: 'Latest'});
    }

    // Trending
    const trendingItem = pickUniqueFirstWithPoster(trendingList, addedIds);
    if (trendingItem) {
      addedIds.add(trendingItem.id);
      next.push({item: trendingItem, type: 'movie', title: 'Trending'});
    }

    // Popular
    const popularItem = pickUniqueFirstWithPoster(popularList, addedIds);
    if (popularItem) {
      addedIds.add(popularItem.id);
      next.push({item: popularItem, type: 'movie', title: 'Popular'});
    }

    // Top 10
    const top10Item = pickUniqueFirstWithPoster(top10MoviesList, addedIds);
    if (top10Item) {
      addedIds.add(top10Item.id);
      next.push({item: top10Item, type: 'movie', title: 'Top'});
    }

    // Upcoming
    const upcomingItem = pickUniqueFirstWithPoster(upcomingList, addedIds);
    if (upcomingItem) {
      addedIds.add(upcomingItem.id);
      next.push({item: upcomingItem, type: 'movie', title: 'Upcoming'});
    }

    return next;
  }, [
    recentMovies,
    popularMovies,
    trendingMoviesData,
    upcomingMoviesByRegion,
    top10MoviesTodayByRegion,
  ]);

  useEffect(() => {
    if (top10MoviesTodayByRegion && top10ShowsTodayByRegion) {
      const top10ContentByRegion = [
        ...top10MoviesTodayByRegion.map((movie: Movie) => ({
          ...movie,
          type: 'movie' as const,
        })),
        ...top10ShowsTodayByRegion.map((show: TVShow) => ({
          ...show,
          type: 'tv' as const,
        })),
      ];
      const sortedContent = top10ContentByRegion.sort(
        (a: ContentItem, b: ContentItem) => {
          return b.popularity - a.popularity;
        },
      );
      setTop10ContentByRegion(sortedContent.slice(0, 10));
    }
  }, [top10MoviesTodayByRegion, top10ShowsTodayByRegion]);

  // My OTTs (Home): get first 3 or fallback to Netflix/Prime/Disney
  const {data: myOTTs = []} = useMyOTTs();
  const {data: myLanguage} = useMyLanguage();

  // CinemaDNA: Top Director and Actor content
  const {data: cinemaDNA} = useCinemaDNA();
  const topDirectorData = useTopDirectorContent(!!cinemaDNA);
  const topActorData = useTopActorContent(!!cinemaDNA);

  // Rewatch Favorites and Recently Watched (no API calls - just Realm)
  const {data: rewatchFavorites = [], isLoading: isLoadingRewatch} =
    useRewatchFavorites();
  const {data: recentlyWatched = [], isLoading: isLoadingRecent} =
    useRecentlyWatched();

  // Fetch available providers to enrich fallback OTTs with logos
  const {data: availableProviders = []} = useAvailableProviders(
    region?.iso_3166_1,
  );

  const defaultOTTIds =
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

  // Enrich default OTTs with logo_path from available providers
  const defaultOTTs = defaultOTTIds.map(defaultOtt => {
    const matchingProvider = availableProviders.find(
      (p: any) => p.provider_id === defaultOtt.id,
    );
    return {
      id: defaultOtt.id,
      provider_name: defaultOtt.provider_name,
      logo_path: matchingProvider?.logo_path || undefined,
    };
  });

  const baseOTTs = myOTTs && myOTTs.length ? myOTTs : defaultOTTs;
  const normalizeProvider = (p: any) => {
    const nameRaw = p?.provider_name ?? p?.name ?? '';
    let id = p?.id ?? p?.provider_id;
    let provider_name = nameRaw || 'Provider';
    let logo_path = p?.logo_path;
    // Prime mapping
    if (/prime\s*video/i.test(provider_name) || id === 9 || id === 119) {
      if (region?.iso_3166_1 === 'IN') {
        id = 119; // Amazon Prime Video (India)
        if (!nameRaw) provider_name = 'Amazon Prime Video';
      } else {
        id = 10; // Amazon Video (global)
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
        id = 2336; // JioHotstar (India per TMDB)
        if (!nameRaw) provider_name = 'JioHotstar';
      } else {
        id = 337; // Disney+ (global)
        if (!nameRaw) provider_name = 'Disney+';
      }
    }
    return {id, provider_name, logo_path};
  };
  const allOttsNormalized = baseOTTs.map(normalizeProvider);
  // no fixed hooks here; each provider will be rendered by its own OttRowMovies component

  // My Language rows (Home)
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  // Movies: Popular (simple) and Latest (discover)
  const langMoviesSimple = useMoviesByLanguageSimpleHook(myLanguage?.iso_639_1);
  const {
    data: latestLangMovies,
    hasNextPage: hasNextLatestLangMovies,
    isFetchingNextPage: isFetchingLatestLangMovies,
    fetchNextPage: fetchNextLatestLangMovies,
  } = useDiscoverMovies(
    myLanguage?.iso_639_1
      ? {
          with_original_language: myLanguage.iso_639_1,
          sort_by: 'release_date.desc',
          'release_date.lte': todayStr,
        }
      : ({} as any),
  );
  // TV: Popular (simple) and Latest (discover)
  const langTVSimple = useTVByLanguageSimpleHook(myLanguage?.iso_639_1);
  const {
    data: latestLangTV,
    hasNextPage: hasNextLatestLangTV,
    isFetchingNextPage: isFetchingLatestLangTV,
    fetchNextPage: fetchNextLatestLangTV,
  } = useDiscoverTVShows(
    myLanguage?.iso_639_1
      ? {
          with_original_language: myLanguage.iso_639_1,
          sort_by: 'first_air_date.desc',
        }
      : ({} as any),
  );

  const {data: savedFilters, isLoading: isLoadingSavedFilters} = useQuery({
    queryKey: ['savedFilters'],
    queryFn: () => FiltersManager.getSavedFilters(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  const handleItemPress = useCallback(
    (item: ContentItem) => {
      if (item.type === 'movie') {
        navigateWithLimit('MovieDetails', {movie: item as unknown as Movie});
      } else {
        navigateWithLimit('TVShowDetails', {show: item as unknown as TVShow});
      }
    },
    [navigateWithLimit],
  );

  const getMoviesFromData = (data: any) =>
    data?.pages.flatMap((page: any) =>
      page.results.map((movie: any) => ({...movie, type: 'movie' as const})),
    ) || [];

  const getTVShowsFromData = (data: any) =>
    data?.pages?.flatMap((page: any) =>
      page.results?.map((show: any) => ({...show, type: 'tv' as const})),
    ) || [];

  const handleSeeAllPress = useCallback(
    (
      title: string,
      categoryType: MovieCategoryType | TVShowCategoryType,
      contentType: ContentType,
    ) => {
      navigateWithLimit('Category', {
        title,
        categoryType,
        contentType,
      });
    },
    [navigateWithLimit],
  );

  const WIDTH = useWindowDimensions().width;
  const {isTablet} = useResponsive();

  // Load mood answers from Realm on component mount and when screen comes into focus
  const loadMoodAnswers = useCallback(async () => {
    try {
      const preferences = await UserPreferencesManager.getPreferences();
      if (preferences && preferences.moodAnswers) {
        setMoodAnswers(preferences.moodAnswers);
      } else {
        setMoodAnswers(null);
      }
    } catch (error) {
      console.error('[Home] Error loading mood answers from Realm:', error);
    } finally {
      setMoodLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadMoodAnswers();
  }, [loadMoodAnswers]);

  // Add focus listener to refresh mood data when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadMoodAnswers();
      // No forced remount of MyNextWatch here; it manages its own refresh
    });

    return unsubscribe;
  }, [navigation, loadMoodAnswers]);

  // Check if history changed (first 10 items) when app opens from background
  useEffect(() => {
    if (!isAIEnabled) {
      return;
    }

    const checkHistoryChangeOnce = async () => {
      // Only check once per app session
      if (hasCheckedHistoryOnAppOpen.current) {
        console.log('[Home] Already checked history this session, skipping');
        return;
      }

      hasCheckedHistoryOnAppOpen.current = true;

      try {
        console.log(
          '[Home] 🔍 Checking if history changed since last app session',
        );

        // The hook will handle cache comparison automatically
        // Just invalidate to trigger a fresh check
        queryClient.invalidateQueries({
          queryKey: ['personalized_recommendations'],
        });
      } catch (error) {
        console.error('[Home] Error checking history change:', error);
      }
    };

    const subscription = AppState.addEventListener('change', nextAppState => {
      // Reset flag when app goes to background
      if (nextAppState.match(/inactive|background/)) {
        hasCheckedHistoryOnAppOpen.current = false;
        console.log('[Home] App went to background - reset history check flag');
      }
      // Check when app comes to foreground
      else if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log(
          '[Home] App became active - will check history on next Home visit',
        );
      }
      appState.current = nextAppState;
    });

    // Check on initial mount (first time opening app)
    checkHistoryChangeOnce();

    return () => {
      subscription.remove();
    };
  }, [isAIEnabled, queryClient]);

  // Listen for navigation focus to check if first-time user just viewed content
  useEffect(() => {
    if (!isAIEnabled) {
      return;
    }

    const unsubscribe = navigation.addListener('focus', async () => {
      // Check if this is first time and user now has history
      const cache = await AIPersonalizationCacheManager.get();

      if (!cache) {
        // No cache exists - might be first time user
        const history = await HistoryManager.getAll();

        if (history.length > 0 && !hasCheckedHistoryOnAppOpen.current) {
          console.log(
            '[Home] 🎉 First-time user has history now - triggering personalized recommendations',
          );
          hasCheckedHistoryOnAppOpen.current = true;
          queryClient.invalidateQueries({
            queryKey: ['personalized_recommendations'],
          });
        }
      }
    });

    return unsubscribe;
  }, [isAIEnabled, navigation, queryClient]);

  const handleMoodComplete = async (answers: {[key: string]: string}) => {
    try {
      // Save fresh mood data to Realm
      await UserPreferencesManager.setPreferences([], answers);
      await RealmSettingsManager.setSetting('next_watch_onboarding', 'true');

      // Update local state
      setMoodAnswers(answers);

      // Clear AI recommendation cache so next fetch uses new mood
      await cache.clear(CACHE_KEYS.AI_RECOMMENDATION);

      // Reload mood answers from Realm to ensure consistency
      await loadMoodAnswers();

      // Invalidate all mood-related queries to force fresh data
      queryClient.invalidateQueries({queryKey: ['mood']});
      queryClient.invalidateQueries({queryKey: ['recommendations']});
      queryClient.invalidateQueries({queryKey: ['userPreferences']});

      // Signal MyNextWatch to refresh due to mood change without remounting
      setMoodVersion(v => v + 1);

      setShowMoodModal(false);
    } catch (error) {
      console.error('Error updating mood preferences:', error);
    }
  };

  const handleMoodCancel = () => {
    setShowMoodModal(false);
  };

  const sections = useMemo(() => {
    const sectionsList = [];

    // Featured banner section
    if (featuredItems.length > 0) {
      sectionsList.push({
        id: 'featured',
        type: 'featured',
        data: featuredItems,
      });
    } else if (
      isFetchingRecentMovies ||
      isFetchingRecentTV ||
      isFetchingPopularMovies
    ) {
      sectionsList.push({
        id: 'featuredSkeleton',
        type: 'featuredSkeleton',
        data: [],
      });
    }

    // Mood setup or My Next Watch section - only if AI is enabled
    if (moodLoaded && isAIEnabled) {
      if (!moodAnswers) {
        // Show mood setup prompt
        sectionsList.push({
          id: 'moodSetup',
          type: 'moodSetup',
        });
      } else {
        // Show My Next Watch with a stable id so it does not remount on every visit
        sectionsList.push({
          id: 'myNextWatch',
          type: 'myNextWatch',
          refreshSignal: moodVersion,
        });
      }
    }

    // Personalized Recommendations section - AI powered
    if (isAIEnabled) {
      if (isFetchingPersonalized) {
        sectionsList.push({
          id: 'personalizedRecommendationsSkeleton',
          type: 'personalizedRecommendationsSkeleton',
        });
      } else if (personalizedRecommendations.length > 0) {
        sectionsList.push({
          id: 'personalizedRecommendations',
          type: 'personalizedRecommendations',
          data: personalizedRecommendations,
        });
      }
    }

    // Thematic Genres by AI section
    if (isAIEnabled) {
      sectionsList.push({
        id: 'thematicGenres',
        type: 'thematicGenres',
      });
    }

    // Watchlist AI Recommendations section
    if (isAIEnabled) {
      sectionsList.push({
        id: 'watchlistAISection',
        type: 'watchlistAISection',
      });
    }

    // Because You Watched section
    // sectionsList.push({
    //   id: `becauseYouWatched:${becauseSeed}`,
    //   type: 'becauseYouWatched',
    //   data: [],
    // });

    // Recent Movies section
    if (recentMovies?.pages?.[0]?.results?.length) {
      sectionsList.push({
        id: 'recentMovies',
        type: 'horizontalList',
        title: 'Recent Movies',
        data: getMoviesFromData(recentMovies),
        isLoading: isFetchingRecentMovies,
        onEndReached: hasNextRecentMovies ? fetchNextRecentMovies : undefined,
        onSeeAllPress: () =>
          handleSeeAllPress('Recent Movies', 'latest', 'movie'),
      });
    } else if (isFetchingRecentMovies) {
      sectionsList.push({
        id: 'recentMoviesSkeleton',
        type: 'horizontalListSkeleton',
      });
    }

    if (latestMoviesByRegion?.pages?.[0]?.results?.length) {
      sectionsList.push({
        id: 'latestMoviesByRegion',
        type: 'horizontalList',
        title: 'Latest Movies in ' + region?.english_name,
        data: getMoviesFromData(latestMoviesByRegion),
        isLoading: isFetchingLatestMoviesByRegion,
        onEndReached: hasNextLatestMoviesByRegion
          ? fetchNextLatestMoviesByRegion
          : undefined,
        isSeeAll: false,
      });
    } else if (isFetchingLatestMoviesByRegion) {
      sectionsList.push({
        id: 'latestMoviesByRegionSkeleton',
        type: 'horizontalListSkeleton',
      });
    }

    // Latest Shows section
    if (recentTVShows?.pages?.[0]?.results?.length) {
      sectionsList.push({
        id: 'latestShows',
        type: 'horizontalList',
        title: 'Latest Shows',
        data: getTVShowsFromData(recentTVShows),
        isLoading: isFetchingRecentTV,
        onEndReached: hasNextRecentTV ? fetchNextRecentTV : undefined,
        onSeeAllPress: () => handleSeeAllPress('Latest Shows', 'latest', 'tv'),
      });
    } else if (isFetchingRecentTV) {
      sectionsList.push({
        id: 'latestShowsSkeleton',
        type: 'horizontalListSkeleton',
      });
    }

    // Top 10 section
    if (
      isFetchingTop10MoviesTodayByRegion ||
      isFetchingTop10ShowsTodayByRegion
    ) {
      sectionsList.push({
        id: 'top10Skeleton',
        type: 'horizontalListSkeleton',
      });
    } else if (top10ContentByRegion?.length) {
      sectionsList.push({
        id: 'top10',
        type: 'horizontalList',
        title: `Top 10 in ${region ? region?.english_name : 'your region'}`,
        data: top10ContentByRegion,
        isLoading: false,
        isSeeAll: false,
        isTop10: true,
      });
    }

    // My OTTs Cards Row
    if (allOttsNormalized.length > 0) {
      sectionsList.push({
        id: 'ottCardsRow',
        type: 'ottCardsRow',
        data: allOttsNormalized,
      });
    }

    // Movies Tabbed Section (Popular & Top Rated)
    sectionsList.push({
      id: 'moviesTabbedSection',
      type: 'moviesTabbedSection',
    });

    // TV Shows Tabbed Section (Popular & Top Rated)
    sectionsList.push({
      id: 'tvShowsTabbedSection',
      type: 'tvShowsTabbedSection',
    });

    // My Language tabbed sections
    if (myLanguage?.iso_639_1) {
      sectionsList.push({
        id: 'languageMoviesTabbedSection',
        type: 'languageMoviesTabbedSection',
        languageIso: myLanguage.iso_639_1,
        languageName: myLanguage.name || myLanguage.english_name,
      });

      sectionsList.push({
        id: 'languageTVShowsTabbedSection',
        type: 'languageTVShowsTabbedSection',
        languageIso: myLanguage.iso_639_1,
        languageName: myLanguage.name || myLanguage.english_name,
      });

      // MyLanguage + MyOTTs combined sections
      sectionsList.push({
        id: 'myLanguageMoviesInOTTsSection',
        type: 'myLanguageMoviesInOTTsSection',
      });

      sectionsList.push({
        id: 'myLanguageTVShowsInOTTsSection',
        type: 'myLanguageTVShowsInOTTsSection',
      });
    }

    // My OTTs sections (movies): Latest releases
    const isPersonalizedOTTs = myOTTs && myOTTs.length > 0;
    if (allOttsNormalized.length > 0) {
      sectionsList.push({
        id: 'home_ott_tabbed_section_latest',
        type: 'ottTabbedSection',
        providers: allOttsNormalized,
        isPersonalized: isPersonalizedOTTs,
        kind: 'latest',
        contentType: 'movie',
      });
    }

    // My OTTs sections (movies): Popular
    if (allOttsNormalized.length > 0) {
      sectionsList.push({
        id: 'home_ott_tabbed_section_popular',
        type: 'ottTabbedSection',
        providers: allOttsNormalized,
        isPersonalized: isPersonalizedOTTs,
        kind: 'popular',
        contentType: 'movie',
      });
    }

    // Upcoming Movies in Region (only)
    if (upcomingMoviesByRegion?.pages?.[0]?.results?.length) {
      sectionsList.push({
        id: 'upcomingMoviesByRegion',
        type: 'horizontalList',
        title: 'Upcoming Movies in ' + region?.english_name,
        data: getMoviesFromData(upcomingMoviesByRegion),
        isLoading: isFetchingUpcomingMoviesByRegion,
        onEndReached: hasNextUpcomingMoviesByRegion
          ? fetchNextUpcomingMoviesByRegion
          : undefined,
        isSeeAll: false,
      });
    } else if (isFetchingUpcomingMoviesByRegion) {
      sectionsList.push({
        id: 'upcomingMoviesByRegionSkeleton',
        type: 'horizontalListSkeleton',
      });
    }

    // Top Director Content section
    if (cinemaDNA && topDirectorData.director && topDirectorData.isEnabled) {
      const directorMovies =
        topDirectorData.movieCredits.data?.pages?.[0]?.results || [];
      const directorShows =
        topDirectorData.tvCredits.data?.pages?.[0]?.results || [];
      const combinedContent = [
        ...directorMovies.map((m: any) => ({...m, type: 'movie' as const})),
        ...directorShows.map((s: any) => ({...s, type: 'tv' as const})),
      ].slice(0, 20);

      if (combinedContent.length > 0) {
        sectionsList.push({
          id: 'topDirectorContent',
          type: 'horizontalList',
          title: `${topDirectorData.director.name}'s Work`,
          data: combinedContent,
          onSeeAllPress: () => {
            // Navigate to person credits screen
            navigation.navigate('PersonCredits', {
              personId: topDirectorData.director!.id,
              personName: topDirectorData.director!.name,
              contentType: 'movie',
            });
          },
          isSeeAll: true,
        });
      }
    }

    // Top Actor Content section
    if (cinemaDNA && topActorData.actor && topActorData.isEnabled) {
      const actorMovies =
        topActorData.movieCredits.data?.pages?.[0]?.results || [];
      const actorShows = topActorData.tvCredits.data?.pages?.[0]?.results || [];
      const combinedContent = [
        ...actorMovies.map((m: any) => ({...m, type: 'movie' as const})),
        ...actorShows.map((s: any) => ({...s, type: 'tv' as const})),
      ].slice(0, 20);

      if (combinedContent.length > 0) {
        sectionsList.push({
          id: 'topActorContent',
          type: 'horizontalList',
          title: `${topActorData.actor.name}'s Work`,
          data: combinedContent,
          onSeeAllPress: () => {
            // Navigate to person credits screen
            navigation.navigate('PersonCredits', {
              personId: topActorData.actor!.id,
              personName: topActorData.actor!.name,
              contentType: 'movie',
            });
          },
          isSeeAll: true,
        });
      }
    }

    // Rewatch Favorites section (no API calls!)
    if (rewatchFavorites.length > 0) {
      sectionsList.push({
        id: 'rewatchFavorites',
        type: 'horizontalList',
        title: 'Your Comfort Watches',
        data: rewatchFavorites,
        isSeeAll: false,
      });
    } else if (isLoadingRewatch) {
      sectionsList.push({
        id: 'rewatchFavoritesSkeleton',
        type: 'horizontalListSkeleton',
      });
    }

    // Recently Watched section (no API calls!)
    if (recentlyWatched.length > 0) {
      sectionsList.push({
        id: 'recentlyWatched',
        type: 'horizontalList',
        title: 'Recently Visited',
        data: recentlyWatched,
        isSeeAll: false,
      });
    } else if (isLoadingRecent) {
      sectionsList.push({
        id: 'recentlyWatchedSkeleton',
        type: 'horizontalListSkeleton',
      });
    }

    // Saved Filters section
    if (!isLoadingSavedFilters && savedFilters && savedFilters.length > 0) {
      sectionsList.push({
        id: 'savedFilters',
        type: 'savedFilters',
        data: savedFilters,
      });
    }

    // No saved filters section - show when no filters exist
    if (
      !isLoadingSavedFilters &&
      (!savedFilters || savedFilters.length === 0)
    ) {
      sectionsList.push({
        id: 'noSavedFilters',
        type: 'noSavedFilters',
      });
    }

    return sectionsList;
  }, [
    featuredItems,
    renderPhase,
    recentMovies,
    recentTVShows,
    showMoreContent,
    top10ContentByRegion,
    savedFilters,
    isLoadingSavedFilters,
    isFetchingRecentMovies,
    isFetchingRecentTV,
    region,
    latestMoviesByRegion,
    // MyLang deps
    myLanguage,
    langMoviesSimple?.data,
    langMoviesSimple?.isLoading,
    langMoviesSimple?.hasNextPage,
    latestLangMovies,
    isFetchingLatestLangMovies,
    hasNextLatestLangMovies,
    langTVSimple?.data,
    langTVSimple?.isLoading,
    langTVSimple?.hasNextPage,
    latestLangTV,
    isFetchingLatestLangTV,
    hasNextLatestLangTV,
    todayStr,
    hasNextRecentMovies,
    hasNextRecentTV,
    fetchNextRecentMovies,
    fetchNextRecentTV,
    handleSeeAllPress,
    moodLoaded,
    moodAnswers,
    isAIEnabled,
    moodVersion,
    personalizedRecommendations,
    isLoadingPersonalized,
    isFetchingPersonalized,
    // CinemaDNA deps
    cinemaDNA,
    topDirectorData.director,
    topDirectorData.isEnabled,
    topDirectorData.movieCredits.data,
    topDirectorData.tvCredits.data,
    topActorData.actor,
    topActorData.isEnabled,
    topActorData.movieCredits.data,
    topActorData.tvCredits.data,
    navigation,
    // Rewatch & Recently Watched deps
    rewatchFavorites,
    isLoadingRewatch,
    recentlyWatched,
    isLoadingRecent,
    // OTT deps
    baseOTTs,
    allOttsNormalized,
  ]);

  // Render all sections without batching

  const onUpdateMoodCb = useCallback(() => setShowMoodModal(true), []);

  const renderSection = useCallback(
    ({item}: {item: any}) => {
      switch (item.type) {
        case 'featured':
          return <FeaturedBannerHome items={item.data} />;

        case 'featuredSkeleton':
          return <BannerHomeSkeleton />;

        case 'myNextWatch':
          return (
            <MyNextWatch
              key={`mnw:${item.refreshSignal}`}
              onUpdateMood={onUpdateMoodCb}
              refreshSignal={item.refreshSignal}
            />
          );

        case 'personalizedRecommendations':
          return <PersonalizedBanner items={item.data} />;

        case 'personalizedRecommendationsSkeleton':
          return (
            <>
              <HeadingSkeleton />
              <PersonalizedBannerSkeleton />
            </>
          );

        case 'thematicGenres':
          return <ThematicGenres />;

        case 'ottCardsRow':
          return <OTTCardsRow otts={item.data} />;

        case 'watchlistAISection':
          return <WatchlistAISection />;

        case 'moodSetup':
          return (
            <View
              style={{
                padding: spacing.md,
                borderRadius: borderRadius.lg,
                maxWidth: 600,
                alignSelf: 'center',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 20,
                width: '100%',
                marginHorizontal: spacing.lg,
                marginBottom: spacing.xl,
                flex: isTablet ? 1 : 0,
              }}>
              <View
                style={{
                  padding: spacing.md,
                  borderWidth: 1,
                  borderBottomWidth: 0,
                  borderColor: colors.modal.border,
                  borderRadius: borderRadius.lg,
                  maxWidth: 600,
                  alignSelf: 'center',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 20,
                  flex: 1,
                  width: '100%',
                }}>
                <LinearGradient
                  colors={[
                    'transparent',
                    colors.background.primary,
                    colors.background.primary,
                  ]}
                  pointerEvents="none"
                  style={{
                    width: '250%',
                    height: '170%',
                    position: 'absolute',
                    bottom: isTablet ? -5 : -30,
                    left: -250,
                    zIndex: 0,
                    transform: [{rotate: '-5deg'}],
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
                      My Next Watch
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: 400,
                        color: 'rgba(198, 150, 215, 0.87)',
                        fontFamily: 'Inter_18pt-Regular',
                      }}>
                      How are you feeling today?
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setShowMoodModal(true)}>
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
                      Start
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          );

        // case 'becauseYouWatched':
        //   return <BecauseYouWatched />;

        case 'horizontalList':
          return (
            <HorizontalList
              key={item.id}
              title={item.title}
              data={item.data}
              onItemPress={handleItemPress}
              isLoading={item.isLoading}
              onEndReached={item.onEndReached}
              onSeeAllPress={item.onSeeAllPress}
              isSeeAll={item.isSeeAll}
              isTop10={item.isTop10}
            />
          );

        case 'horizontalListSkeleton':
          return (
            <View style={{marginBottom: 32}}>
              <View style={{alignItems: 'center', marginBottom: 12}}>
                <HeadingSkeleton />
              </View>
              <HorizontalListSkeleton />
            </View>
          );

        case 'savedFilters':
          return (
            <View>
              {/* <View style={styles.heading}>
                <LinearGradient
                  colors={['transparent', colors.background.primary]}
                  start={{x: 0.5, y: 0}}
                  end={{x: 0.5, y: 1}}
                  style={[styles.gradient, {height: isTablet ? 200 : 100}]}
                />
                <Text style={styles.headingText}>My Filters</Text>
              </View> */}
              {item.data?.map((filter: SavedFilter) => (
                <HomeFilterRow key={filter.id} savedFilter={filter} />
              ))}
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

        case 'moviesTabbedSection':
          return <MoviesTabbedSection />;

        case 'tvShowsTabbedSection':
          return <TVShowsTabbedSection />;

        case 'languageMoviesTabbedSection':
          return (
            <LanguageMoviesTabbedSection
              languageIso={item.languageIso}
              languageName={item.languageName}
            />
          );

        case 'languageTVShowsTabbedSection':
          return (
            <LanguageTVShowsTabbedSection
              languageIso={item.languageIso}
              languageName={item.languageName}
            />
          );

        case 'myLanguageMoviesInOTTsSection':
          return <MyLanguageMoviesInOTTsSection />;

        case 'myLanguageTVShowsInOTTsSection':
          return <MyLanguageTVShowsInOTTsSection />;

        case 'noSavedFilters':
          return (
            <View
              style={{
                padding: spacing.lg,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: spacing.xl,
                marginBottom: spacing.xxl,
              }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: colors.text.primary,
                  textAlign: 'center',
                  marginBottom: spacing.md,
                  fontFamily: 'Inter_18pt-SemiBold',
                }}>
                This is not the end...
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: colors.text.muted,
                  textAlign: 'center',
                  marginBottom: spacing.xl,
                  lineHeight: 20,
                  fontFamily: 'Inter_18pt-Regular',
                }}>
                Create your own personalized filters to discover movies and
                shows tailored just for you!
              </Text>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('Main', {
                    screen: 'MySpace',
                    params: {screen: 'MyFiltersScreen'},
                  })
                }
                style={{
                  paddingHorizontal: spacing.md,
                  borderRadius: borderRadius.round,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                }}>
                <FastImage
                  source={require('../assets/next.webp')}
                  style={{
                    width: isTablet ? 40 : 30,
                    height: isTablet ? 40 : 30,
                  }}
                />
              </TouchableOpacity>
            </View>
          );

        default:
          return null;
      }
    },
    [handleItemPress, onUpdateMoodCb],
  );

  const keyExtractor = useCallback((item: any) => item.id, []);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.primary,
    },
    skeletonContainer: {
      width: WIDTH - 64,
      height: 520,
      alignSelf: 'center',
      borderRadius: 50,
      // marginBottom: spacing.xl,
      marginTop: spacing.xxl,
    },
    heading: {
      position: 'relative',
      // marginBottom: -50,
    },
    gradient: {
      position: 'absolute',
      left: 0,
      bottom: 0,
      height: 80,
      width: '100%',
      zIndex: 0,
    },
    headingText: {
      fontSize: WIDTH / 8,
      color: colors.text.tertiary,
      marginVertical: spacing.md,
      textAlign: 'center',
      opacity: 0.5,
      zIndex: -1,
      fontFamily: 'Inter_28pt-ExtraBold',
    },
  });

  const moodSetupStyles = StyleSheet.create({
    container: {
      marginHorizontal: spacing.lg,
      marginTop: spacing.xl,
      marginBottom: spacing.lg,
    },
    content: {
      backgroundColor: colors.background.secondary,
      borderRadius: 20,
      padding: spacing.lg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    icon: {
      width: 60,
      height: 60,
      marginRight: spacing.md,
    },
    title: {
      fontSize: 14,
      fontWeight: '400',
      color: 'rgb(255, 240, 253)',
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 12,
      fontWeight: '400',
      color: 'rgba(198, 150, 215, 0.87)',
      flexShrink: 1,
    },
    buttonContainer: {
      alignSelf: 'flex-end',
    },
    button: {
      padding: 10,
      paddingHorizontal: 25,
      borderRadius: 50,
      alignItems: 'center',
    },
    buttonText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text.primary,
    },
  });

  const modalStyles = StyleSheet.create({
    container: {
      flex: 1,
    },
  });

  useEffect(() => {
    const handleSettingsChange = () => {
      queryClient.invalidateQueries({queryKey: ['movies']});
      queryClient.invalidateQueries({queryKey: ['tvshows']});
      queryClient.invalidateQueries({queryKey: ['discover_movies']});
      queryClient.invalidateQueries({queryKey: ['discover_tv']});
      queryClient.invalidateQueries({
        queryKey: ['top_10_movies_today_by_region'],
      });
      queryClient.invalidateQueries({
        queryKey: ['top_10_shows_today_by_region'],
      });
    };
    SettingsManager.addChangeListener(handleSettingsChange);
    return () => {
      SettingsManager.removeChangeListener(handleSettingsChange);
    };
  }, [queryClient]);

  const isFullScreenLoading =
    !featuredItems.length ||
    !recentMovies?.pages?.[0]?.results?.length ||
    !recentTVShows?.pages?.[0]?.results?.length;

  if (isFullScreenLoading) {
    return (
      <View style={styles.container}>
        <View style={{marginTop: 24, marginBottom: 5}}>
          <BannerHomeSkeleton />
        </View>
        {[...Array(3)].map((_, i) => (
          <View key={i} style={{marginBottom: spacing.md}}>
            <HeadingSkeleton />
            <HorizontalListSkeleton />
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* <PerformanceMonitor screenName="Home" /> */}
      <FlatList
        data={sections}
        renderItem={renderSection}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingBottom: 100}}
        ListFooterComponent={<View style={{height: 100}} />}
        // Keep mounted to preserve scroll; hide when not focused
        // style={{display: isFocused ? ('flex' as const) : ('none' as const)}}
        // pointerEvents={isFocused ? 'auto' : 'none'}
      />

      {/* Mood Questionnaire Modal */}
      <Modal
        visible={showMoodModal}
        animationType="slide"
        navigationBarTranslucent
        statusBarTranslucent
        backdropColor={colors.modal.blurDark}
        onRequestClose={() => setShowMoodModal(false)}>
        <View
          style={{
            flex: 1,
            padding: isTablet ? spacing.xl : spacing.md,
            borderRadius: borderRadius.xl,
            backgroundColor: 'transparent',
          }}>
          <MoodQuestionnaire
            onComplete={answers => {
              // Use the centralized handler that persists, invalidates queries,
              // refreshes MyNextWatch and closes the modal.
              handleMoodComplete(answers);
            }}
            onCancel={() => setShowMoodModal(false)}
          />
        </View>
      </Modal>
    </View>
  );
});
