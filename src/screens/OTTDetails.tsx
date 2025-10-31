import React, {useCallback, useMemo, useState, useRef, useEffect} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Image, FlatList} from 'react-native';
import {colors, spacing, borderRadius, typography} from '../styles/theme';
import {useNavigationState} from '../hooks/useNavigationState';
import {useRegion} from '../hooks/useApp';
import {
  useMoviesByProvider,
  useTVByProvider,
  useMyLanguage,
} from '../hooks/usePersonalization';
import {useDiscoverMovies} from '../hooks/useMovies';
import {useDiscoverTVShows} from '../hooks/useTVShows';
import {HorizontalList} from '../components/HorizontalList';
import {Movie} from '../types/movie';
import {TVShow} from '../types/tvshow';
import {ContentItem} from '../components/MovieList';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import {HeadingSkeleton, HorizontalListSkeleton, BannerSkeleton} from '../components/LoadingSkeleton';
import {FeaturedBanner} from '../components/FeaturedBanner';
import {offlineCache} from '../services/offlineCache';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Props {
  route: {
    params: {
      ottId: number;
      ottName: string;
      ottLogo?: string;
    };
  };
  navigation: any;
}

export const OTTDetailsScreen: React.FC<Props> = ({route, navigation}) => {
  const {ottId, ottName, ottLogo} = route.params;
  const {navigateWithLimit} = useNavigationState();
  const {data: region} = useRegion();
  const [isBannerVisible, setIsBannerVisible] = useState(true);

  // ========== DEBUG: Check cache stats on mount ==========
  useEffect(() => {
    const checkCacheStats = async () => {
      try {
        const stats = await offlineCache.getStats();
        console.log('=== OFFLINE CACHE STATS ===');
        console.log('Total Items:', stats.totalItems);
        console.log('Total Size (MB):', (stats.totalSize / 1024 / 1024).toFixed(2));
        console.log('Total Size (bytes):', stats.totalSize);
        console.log('Oldest Item:', new Date(stats.oldestItem).toLocaleString());
        console.log('Newest Item:', new Date(stats.newestItem).toLocaleString());
        console.log('Items by Type:', stats.itemsByType);
        console.log('========================');
        
        // Check ALL AsyncStorage usage
        console.log('\n=== ALL ASYNCSTORAGE USAGE ===');
        const allKeys = await AsyncStorage.getAllKeys();
        console.log('Total AsyncStorage keys:', allKeys.length);
        
        let totalSize = 0;
        const largeSizes: {key: string; sizeKB: number}[] = [];
        
        for (const key of allKeys) {
          const value = await AsyncStorage.getItem(key);
          if (value) {
            const sizeKB = value.length / 1024;
            totalSize += sizeKB;
            
            // Track items larger than 10KB
            if (sizeKB > 10) {
              largeSizes.push({key, sizeKB});
            }
          }
        }
        
        // Sort by size descending
        largeSizes.sort((a, b) => b.sizeKB - a.sizeKB);
        
        console.log('Total AsyncStorage Size (MB):', (totalSize / 1024).toFixed(2));
        console.log('\nLargest items (>10KB):');
        largeSizes.forEach(item => {
          console.log(`  ${item.key}: ${item.sizeKB.toFixed(2)} KB`);
        });
        
        // Check specific categories
        const watchlistKeys = allKeys.filter(k => k.includes('watchlist'));
        const filterKeys = allKeys.filter(k => k.includes('filter'));
        const historyKeys = allKeys.filter(k => k.includes('history'));
        
        console.log('\nKeys by category:');
        console.log('  Watchlists:', watchlistKeys.length);
        console.log('  Filters:', filterKeys.length);
        console.log('  History:', historyKeys.length);
        const cacheKeys = allKeys.filter(k => k.includes('@theater_offline_cache_'));
        console.log('  Cache:', cacheKeys.length);
        
        // Find the "Other" keys
        const otherKeys = allKeys.filter(k => 
          !k.includes('watchlist') && 
          !k.includes('filter') && 
          !k.includes('history') && 
          !k.includes('@theater_offline_cache_')
        );
        console.log('  Other:', otherKeys.length);
        
        // Show sample of "Other" keys
        console.log('\nSample of "Other" keys (first 20):');
        otherKeys.slice(0, 20).forEach(key => console.log(`    ${key}`));
        
        console.log('========================\n');
      } catch (error) {
        console.error('Failed to get cache stats:', error);
      }
    };
    
    checkCacheStats();
  }, []);

  // ========== STEP 1: FETCH ALL DATA FIRST ==========
  
  // Fetch popular content
  const {
    data: popularMoviesData,
    hasNextPage: hasNextPopularMovies,
    fetchNextPage: fetchNextPopularMovies,
    isLoading: isLoadingPopularMovies,
    isFetching: isFetchingPopularMovies,
  } = useMoviesByProvider(ottId, 'popular', region?.iso_3166_1);

  const {
    data: popularTVData,
    hasNextPage: hasNextPopularTV,
    fetchNextPage: fetchNextPopularTV,
    isLoading: isLoadingPopularTV,
    isFetching: isFetchingPopularTV,
  } = useTVByProvider(ottId, 'popular', region?.iso_3166_1);

  // Fetch latest content
  const {
    data: latestMoviesData,
    hasNextPage: hasNextLatestMovies,
    fetchNextPage: fetchNextLatestMovies,
    isLoading: isLoadingLatestMovies,
    isFetching: isFetchingLatestMovies,
  } = useMoviesByProvider(ottId, 'latest', region?.iso_3166_1);

  const {
    data: latestTVData,
    hasNextPage: hasNextLatestTV,
    fetchNextPage: fetchNextLatestTV,
    isLoading: isLoadingLatestTV,
    isFetching: isFetchingLatestTV,
  } = useTVByProvider(ottId, 'latest', region?.iso_3166_1);

  // Fetch user's language preference
  const {data: myLanguage} = useMyLanguage();
  
  // Fetch language-specific content on this OTT (if user has language set)
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  
  const {
    data: myLanguageMoviesOnOTTData,
    hasNextPage: hasNextMyLanguageMovies,
    fetchNextPage: fetchNextMyLanguageMovies,
    isLoading: isLoadingMyLanguageMovies,
  } = useDiscoverMovies(
    myLanguage?.iso_639_1
      ? {
          with_original_language: myLanguage.iso_639_1,
          with_watch_providers: String(ottId),
          watch_region: region?.iso_3166_1 || 'US',
          sort_by: 'release_date.desc',
          'release_date.lte': todayStr,
        }
      : ({} as any),
  );

  const {
    data: myLanguageTVOnOTTData,
    hasNextPage: hasNextMyLanguageTV,
    fetchNextPage: fetchNextMyLanguageTV,
    isLoading: isLoadingMyLanguageTV,
  } = useDiscoverTVShows(
    myLanguage?.iso_639_1
      ? {
          with_original_language: myLanguage.iso_639_1,
          with_watch_providers: String(ottId),
          watch_region: region?.iso_3166_1 || 'US',
          sort_by: 'first_air_date.desc',
          'first_air_date.lte': todayStr,
        }
      : ({} as any),
  );

  // Fetch top-rated content on this OTT
  const {
    data: topRatedMoviesData,
    hasNextPage: hasNextTopRatedMovies,
    fetchNextPage: fetchNextTopRatedMovies,
    isLoading: isLoadingTopRatedMovies,
  } = useDiscoverMovies({
    with_watch_providers: String(ottId),
    watch_region: region?.iso_3166_1 || 'US',
    sort_by: 'vote_average.desc',
    'vote_count.gte': 100,
  } as any);

  const {
    data: topRatedTVData,
    hasNextPage: hasNextTopRatedTV,
    fetchNextPage: fetchNextTopRatedTV,
    isLoading: isLoadingTopRatedTV,
  } = useDiscoverTVShows({
    with_watch_providers: String(ottId),
    watch_region: region?.iso_3166_1 || 'US',
    sort_by: 'vote_average.desc',
    'vote_count.gte': 100,
  } as any);

  // Fetch binge-worthy shows (multiple seasons)
  const {
    data: bingeWorthyTVData,
    hasNextPage: hasNextBingeWorthyTV,
    fetchNextPage: fetchNextBingeWorthyTV,
    isLoading: isLoadingBingeWorthyTV,
  } = useDiscoverTVShows({
    with_watch_providers: String(ottId),
    watch_region: region?.iso_3166_1 || 'US',
    sort_by: 'popularity.desc',
    'vote_average.gte': 6.5,
  } as any);

  // Fetch critically acclaimed (awards-worthy)
  const {
    data: criticallyAcclaimedMoviesData,
    hasNextPage: hasNextCriticallyAcclaimedMovies,
    fetchNextPage: fetchNextCriticallyAcclaimedMovies,
    isLoading: isLoadingCriticallyAcclaimedMovies,
  } = useDiscoverMovies({
    with_watch_providers: String(ottId),
    watch_region: region?.iso_3166_1 || 'US',
    sort_by: 'vote_average.desc',
    'vote_count.gte': 1000,
    'vote_average.gte': 7.5,
  } as any);

  // Fetch family-friendly content
  const {
    data: familyFriendlyMoviesData,
    hasNextPage: hasNextFamilyFriendlyMovies,
    fetchNextPage: fetchNextFamilyFriendlyMovies,
    isLoading: isLoadingFamilyFriendlyMovies,
  } = useDiscoverMovies({
    with_watch_providers: String(ottId),
    watch_region: region?.iso_3166_1 || 'US',
    with_genres: '16,10751', // Animation, Family
    sort_by: 'popularity.desc',
  } as any);

  const {
    data: familyFriendlyTVData,
    hasNextPage: hasNextFamilyFriendlyTV,
    fetchNextPage: fetchNextFamilyFriendlyTV,
    isLoading: isLoadingFamilyFriendlyTV,
  } = useDiscoverTVShows({
    with_watch_providers: String(ottId),
    watch_region: region?.iso_3166_1 || 'US',
    with_genres: '16,10751', // Animation, Family
    sort_by: 'popularity.desc',
  } as any);

  // Fetch action & thriller content
  const {
    data: actionMoviesData,
    hasNextPage: hasNextActionMovies,
    fetchNextPage: fetchNextActionMovies,
    isLoading: isLoadingActionMovies,
  } = useDiscoverMovies({
    with_watch_providers: String(ottId),
    watch_region: region?.iso_3166_1 || 'US',
    with_genres: '28,53', // Action, Thriller
    sort_by: 'popularity.desc',
  } as any);

  const {
    data: actionTVData,
    hasNextPage: hasNextActionTV,
    fetchNextPage: fetchNextActionTV,
    isLoading: isLoadingActionTV,
  } = useDiscoverTVShows({
    with_watch_providers: String(ottId),
    watch_region: region?.iso_3166_1 || 'US',
    with_genres: '10759,80', // Action & Adventure, Crime
    sort_by: 'popularity.desc',
  } as any);

  // Fetch comedy content
  const {
    data: comedyMoviesData,
    hasNextPage: hasNextComedyMovies,
    fetchNextPage: fetchNextComedyMovies,
    isLoading: isLoadingComedyMovies,
  } = useDiscoverMovies({
    with_watch_providers: String(ottId),
    watch_region: region?.iso_3166_1 || 'US',
    with_genres: '35', // Comedy
    sort_by: 'popularity.desc',
  } as any);

  const {
    data: comedyTVData,
    hasNextPage: hasNextComedyTV,
    fetchNextPage: fetchNextComedyTV,
    isLoading: isLoadingComedyTV,
  } = useDiscoverTVShows({
    with_watch_providers: String(ottId),
    watch_region: region?.iso_3166_1 || 'US',
    with_genres: '35', // Comedy
    sort_by: 'popularity.desc',
  } as any);

  // Fetch drama content
  const {
    data: dramaMoviesData,
    hasNextPage: hasNextDramaMovies,
    fetchNextPage: fetchNextDramaMovies,
    isLoading: isLoadingDramaMovies,
  } = useDiscoverMovies({
    with_watch_providers: String(ottId),
    watch_region: region?.iso_3166_1 || 'US',
    with_genres: '18', // Drama
    sort_by: 'vote_average.desc',
    'vote_count.gte': 100,
  } as any);

  const {
    data: dramaTVData,
    hasNextPage: hasNextDramaTV,
    fetchNextPage: fetchNextDramaTV,
    isLoading: isLoadingDramaTV,
  } = useDiscoverTVShows({
    with_watch_providers: String(ottId),
    watch_region: region?.iso_3166_1 || 'US',
    with_genres: '18', // Drama
    sort_by: 'vote_average.desc',
    'vote_count.gte': 100,
  } as any);

  // Fetch sci-fi & fantasy content
  const {
    data: sciFiMoviesData,
    hasNextPage: hasNextSciFiMovies,
    fetchNextPage: fetchNextSciFiMovies,
    isLoading: isLoadingSciFiMovies,
  } = useDiscoverMovies({
    with_watch_providers: String(ottId),
    watch_region: region?.iso_3166_1 || 'US',
    with_genres: '878,14', // Sci-Fi, Fantasy
    sort_by: 'popularity.desc',
  } as any);

  const {
    data: sciFiTVData,
    hasNextPage: hasNextSciFiTV,
    fetchNextPage: fetchNextSciFiTV,
    isLoading: isLoadingSciFiTV,
  } = useDiscoverTVShows({
    with_watch_providers: String(ottId),
    watch_region: region?.iso_3166_1 || 'US',
    with_genres: '10765', // Sci-Fi & Fantasy
    sort_by: 'popularity.desc',
  } as any);

  // Fetch horror content
  const {
    data: horrorMoviesData,
    hasNextPage: hasNextHorrorMovies,
    fetchNextPage: fetchNextHorrorMovies,
    isLoading: isLoadingHorrorMovies,
  } = useDiscoverMovies({
    with_watch_providers: String(ottId),
    watch_region: region?.iso_3166_1 || 'US',
    with_genres: '27', // Horror
    sort_by: 'popularity.desc',
  } as any);

  // Fetch documentary content
  const {
    data: documentaryMoviesData,
    hasNextPage: hasNextDocumentaryMovies,
    fetchNextPage: fetchNextDocumentaryMovies,
    isLoading: isLoadingDocumentaryMovies,
  } = useDiscoverMovies({
    with_watch_providers: String(ottId),
    watch_region: region?.iso_3166_1 || 'US',
    with_genres: '99', // Documentary
    sort_by: 'vote_average.desc',
    'vote_count.gte': 50,
  } as any);

  const {
    data: documentaryTVData,
    hasNextPage: hasNextDocumentaryTV,
    fetchNextPage: fetchNextDocumentaryTV,
    isLoading: isLoadingDocumentaryTV,
  } = useDiscoverTVShows({
    with_watch_providers: String(ottId),
    watch_region: region?.iso_3166_1 || 'US',
    with_genres: '99', // Documentary
    sort_by: 'vote_average.desc',
    'vote_count.gte': 50,
  } as any);

  // ========== STEP 2: TRANSFORM DATA (ALWAYS - before any conditional returns) ==========

  // Transform popular data
  const popularMovies = useMemo(
    () =>
      popularMoviesData?.pages?.flatMap(page =>
        page.results
          .filter((m: any) => m.title && m.id)
          .map((m: any) => ({...m, type: 'movie' as const})),
      ) || [],
    [popularMoviesData],
  );

  const latestMovies = useMemo(
    () =>
      latestMoviesData?.pages?.flatMap(page =>
        page.results
          .filter((m: any) => m.title && m.id)
          .map((m: any) => ({...m, type: 'movie' as const})),
      ) || [],
    [latestMoviesData],
  );

  const popularTV = useMemo(
    () =>
      popularTVData?.pages?.flatMap(page =>
        page.results
          .filter((s: any) => s.name && s.id)
          .map((s: any) => ({
            ...s,
            type: 'tv' as const,
            title: s.name,
          })),
      ) || [],
    [popularTVData],
  );

  const latestTV = useMemo(
    () =>
      latestTVData?.pages?.flatMap(page =>
        page.results
          .filter((s: any) => s.name && s.id)
          .map((s: any) => ({
            ...s,
            type: 'tv' as const,
            title: s.name,
          })),
      ) || [],
    [latestTVData],
  );

  // Transform language-specific content
  const myLanguageMoviesOnOTT = useMemo(
    () =>
      myLanguageMoviesOnOTTData?.pages?.flatMap(page =>
        page.results
          .filter((m: any) => m.title && m.id)
          .map((m: any) => ({...m, type: 'movie' as const})),
      ) || [],
    [myLanguageMoviesOnOTTData],
  );

  const myLanguageTVOnOTT = useMemo(
    () =>
      myLanguageTVOnOTTData?.pages?.flatMap(page =>
        page.results
          .filter((s: any) => s.name && s.id)
          .map((s: any) => ({
            ...s,
            type: 'tv' as const,
            title: s.name,
          })),
      ) || [],
    [myLanguageTVOnOTTData],
  );

  // Transform top-rated content
  const topRatedMovies = useMemo(
    () =>
      topRatedMoviesData?.pages?.flatMap(page =>
        page.results
          .filter((m: any) => m.title && m.id)
          .map((m: any) => ({...m, type: 'movie' as const})),
      ) || [],
    [topRatedMoviesData],
  );

  const topRatedTV = useMemo(
    () =>
      topRatedTVData?.pages?.flatMap(page =>
        page.results
          .filter((s: any) => s.name && s.id)
          .map((s: any) => ({
            ...s,
            type: 'tv' as const,
            title: s.name,
          })),
      ) || [],
    [topRatedTVData],
  );

  // Transform binge-worthy shows
  const bingeWorthyTV = useMemo(
    () =>
      bingeWorthyTVData?.pages?.flatMap(page =>
        page.results
          .filter((s: any) => s.name && s.id)
          .map((s: any) => ({
            ...s,
            type: 'tv' as const,
            title: s.name,
          })),
      ) || [],
    [bingeWorthyTVData],
  );

  // Transform critically acclaimed
  const criticallyAcclaimedMovies = useMemo(
    () =>
      criticallyAcclaimedMoviesData?.pages?.flatMap(page =>
        page.results
          .filter((m: any) => m.title && m.id)
          .map((m: any) => ({...m, type: 'movie' as const})),
      ) || [],
    [criticallyAcclaimedMoviesData],
  );

  // Transform family-friendly content
  const familyFriendlyMovies = useMemo(
    () =>
      familyFriendlyMoviesData?.pages?.flatMap(page =>
        page.results
          .filter((m: any) => m.title && m.id)
          .map((m: any) => ({...m, type: 'movie' as const})),
      ) || [],
    [familyFriendlyMoviesData],
  );

  const familyFriendlyTV = useMemo(
    () =>
      familyFriendlyTVData?.pages?.flatMap(page =>
        page.results
          .filter((s: any) => s.name && s.id)
          .map((s: any) => ({
            ...s,
            type: 'tv' as const,
            title: s.name,
          })),
      ) || [],
    [familyFriendlyTVData],
  );

  // Transform action & thriller content
  const actionMovies = useMemo(
    () =>
      actionMoviesData?.pages?.flatMap(page =>
        page.results
          .filter((m: any) => m.title && m.id)
          .map((m: any) => ({...m, type: 'movie' as const})),
      ) || [],
    [actionMoviesData],
  );

  const actionTV = useMemo(
    () =>
      actionTVData?.pages?.flatMap(page =>
        page.results
          .filter((s: any) => s.name && s.id)
          .map((s: any) => ({
            ...s,
            type: 'tv' as const,
            title: s.name,
          })),
      ) || [],
    [actionTVData],
  );

  // Transform comedy content
  const comedyMovies = useMemo(
    () =>
      comedyMoviesData?.pages?.flatMap(page =>
        page.results
          .filter((m: any) => m.title && m.id)
          .map((m: any) => ({...m, type: 'movie' as const})),
      ) || [],
    [comedyMoviesData],
  );

  const comedyTV = useMemo(
    () =>
      comedyTVData?.pages?.flatMap(page =>
        page.results
          .filter((s: any) => s.name && s.id)
          .map((s: any) => ({
            ...s,
            type: 'tv' as const,
            title: s.name,
          })),
      ) || [],
    [comedyTVData],
  );

  // Transform drama content
  const dramaMovies = useMemo(
    () =>
      dramaMoviesData?.pages?.flatMap(page =>
        page.results
          .filter((m: any) => m.title && m.id)
          .map((m: any) => ({...m, type: 'movie' as const})),
      ) || [],
    [dramaMoviesData],
  );

  const dramaTV = useMemo(
    () =>
      dramaTVData?.pages?.flatMap(page =>
        page.results
          .filter((s: any) => s.name && s.id)
          .map((s: any) => ({
            ...s,
            type: 'tv' as const,
            title: s.name,
          })),
      ) || [],
    [dramaTVData],
  );

  // Transform sci-fi & fantasy content
  const sciFiMovies = useMemo(
    () =>
      sciFiMoviesData?.pages?.flatMap(page =>
        page.results
          .filter((m: any) => m.title && m.id)
          .map((m: any) => ({...m, type: 'movie' as const})),
      ) || [],
    [sciFiMoviesData],
  );

  const sciFiTV = useMemo(
    () =>
      sciFiTVData?.pages?.flatMap(page =>
        page.results
          .filter((s: any) => s.name && s.id)
          .map((s: any) => ({
            ...s,
            type: 'tv' as const,
            title: s.name,
          })),
      ) || [],
    [sciFiTVData],
  );

  // Transform horror content
  const horrorMovies = useMemo(
    () =>
      horrorMoviesData?.pages?.flatMap(page =>
        page.results
          .filter((m: any) => m.title && m.id)
          .map((m: any) => ({...m, type: 'movie' as const})),
      ) || [],
    [horrorMoviesData],
  );

  // Transform documentary content
  const documentaryMovies = useMemo(
    () =>
      documentaryMoviesData?.pages?.flatMap(page =>
        page.results
          .filter((m: any) => m.title && m.id)
          .map((m: any) => ({...m, type: 'movie' as const})),
      ) || [],
    [documentaryMoviesData],
  );

  const documentaryTV = useMemo(
    () =>
      documentaryTVData?.pages?.flatMap(page =>
        page.results
          .filter((s: any) => s.name && s.id)
          .map((s: any) => ({
            ...s,
            type: 'tv' as const,
            title: s.name,
          })),
      ) || [],
    [documentaryTVData],
  );

  // ========== STEP 3: REFS FOR BANNER CACHING ==========
  
  // Store featured items in ref to prevent re-shuffling after initial load
  const featuredItemsRef = useRef<any[]>([]);
  const hasInitializedRef = useRef(false);

  // ========== STEP 4: CALLBACKS ==========

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

  const handleSeeAllPress = useCallback(
    (title: string, contentType: 'movie' | 'tv', kind: 'latest' | 'popular') => {
      const {buildOTTFilters} = require('../services/tmdbWithCache');
      const filter = buildOTTFilters(ottId, kind, contentType, region?.iso_3166_1);
      
      navigateWithLimit('Category', {
        title,
        contentType,
        filter,
      });
    },
    [navigateWithLimit, ottId, region?.iso_3166_1],
  );

  // ========== STEP 5: CONSTRUCT BANNER DATA (BEFORE ANY RETURNS) ==========
  
  // Get featured items for banner - use popular + latest (reliable and fast)
  const featuredItems = useMemo(() => {
    // If already initialized and we have items, use cached version
    if (hasInitializedRef.current && featuredItemsRef.current.length > 0) {
      return featuredItemsRef.current;
    }
    
    // Use popular + latest content for banner
    const bannerMovies = [
      ...popularMovies.slice(0, 3),
      ...latestMovies.slice(0, 2),
    ];
    const bannerTV = [
      ...popularTV.slice(0, 3),
      ...latestTV.slice(0, 2),
    ];
    
    const allBannerContent = [...bannerMovies, ...bannerTV];
    const items = allBannerContent
      .filter(item => item.backdrop_path)
      .sort(() => Math.random() - 0.5)
      .slice(0, 5);
    
    // Cache the items once we have them
    if (items.length > 0 && !hasInitializedRef.current) {
      featuredItemsRef.current = items;
      hasInitializedRef.current = true;
    }
    
    return items;
  }, [popularMovies, latestMovies, popularTV, latestTV]);

  // Build sections for FlatList
  const sections = useMemo(() => {
    const sectionsList = [];

    // Banner section
    if (featuredItems.length > 0) {
      sectionsList.push({
        id: 'banner',
        type: 'banner',
        data: featuredItems,
      });
    } else {
      sectionsList.push({
        id: 'header',
        type: 'header',
      });
    }

    // Popular Movies
    if (popularMovies.length > 0) {
      sectionsList.push({
        id: 'popularMovies',
        type: 'horizontalList',
        title: `Popular Movies on ${ottName}`,
        data: popularMovies,
        onEndReached: hasNextPopularMovies ? fetchNextPopularMovies : undefined,
        onSeeAllPress: () => handleSeeAllPress(`Popular Movies on ${ottName}`, 'movie', 'popular'),
      });
    }

    // Latest Movies
    if (latestMovies.length > 0) {
      sectionsList.push({
        id: 'latestMovies',
        type: 'horizontalList',
        title: `Latest Movies on ${ottName}`,
        data: latestMovies,
        onEndReached: hasNextLatestMovies ? fetchNextLatestMovies : undefined,
        onSeeAllPress: () => handleSeeAllPress(`Latest Movies on ${ottName}`, 'movie', 'latest'),
      });
    }

    // Popular TV
    if (popularTV.length > 0) {
      sectionsList.push({
        id: 'popularTV',
        type: 'horizontalList',
        title: `Popular Shows on ${ottName}`,
        data: popularTV,
        onEndReached: hasNextPopularTV ? fetchNextPopularTV : undefined,
        onSeeAllPress: () => handleSeeAllPress(`Popular Shows on ${ottName}`, 'tv', 'popular'),
      });
    }

    // Latest TV
    if (latestTV.length > 0) {
      sectionsList.push({
        id: 'latestTV',
        type: 'horizontalList',
        title: `Latest Shows on ${ottName}`,
        data: latestTV,
        onEndReached: hasNextLatestTV ? fetchNextLatestTV : undefined,
        onSeeAllPress: () => handleSeeAllPress(`Latest Shows on ${ottName}`, 'tv', 'latest'),
      });
    }

    // Language-specific content
    if (myLanguage && myLanguageMoviesOnOTT.length > 0) {
      sectionsList.push({
        id: 'myLanguageMovies',
        type: 'horizontalList',
        title: `${myLanguage.english_name} Movies on ${ottName}`,
        data: myLanguageMoviesOnOTT,
        onEndReached: hasNextMyLanguageMovies ? fetchNextMyLanguageMovies : undefined,
      });
    }

    if (myLanguage && myLanguageTVOnOTT.length > 0) {
      sectionsList.push({
        id: 'myLanguageTV',
        type: 'horizontalList',
        title: `${myLanguage.english_name} Shows on ${ottName}`,
        data: myLanguageTVOnOTT,
        onEndReached: hasNextMyLanguageTV ? fetchNextMyLanguageTV : undefined,
      });
    }

    // Top-rated content
    if (topRatedMovies.length > 0) {
      sectionsList.push({
        id: 'topRatedMovies',
        type: 'horizontalList',
        title: `Top Rated Movies on ${ottName}`,
        data: topRatedMovies,
        onEndReached: hasNextTopRatedMovies ? fetchNextTopRatedMovies : undefined,
      });
    }

    if (topRatedTV.length > 0) {
      sectionsList.push({
        id: 'topRatedTV',
        type: 'horizontalList',
        title: `Top Rated Shows on ${ottName}`,
        data: topRatedTV,
        onEndReached: hasNextTopRatedTV ? fetchNextTopRatedTV : undefined,
      });
    }

    // Binge-Worthy Shows
    if (bingeWorthyTV.length > 0) {
      sectionsList.push({
        id: 'bingeWorthyTV',
        type: 'horizontalList',
        title: `Binge-Worthy Shows on ${ottName}`,
        data: bingeWorthyTV,
        onEndReached: hasNextBingeWorthyTV ? fetchNextBingeWorthyTV : undefined,
      });
    }

    // Critically Acclaimed
    if (criticallyAcclaimedMovies.length > 0) {
      sectionsList.push({
        id: 'criticallyAcclaimed',
        type: 'horizontalList',
        title: `Critically Acclaimed on ${ottName}`,
        data: criticallyAcclaimedMovies,
        onEndReached: hasNextCriticallyAcclaimedMovies ? fetchNextCriticallyAcclaimedMovies : undefined,
      });
    }

    // Family-Friendly
    if (familyFriendlyMovies.length > 0) {
      sectionsList.push({
        id: 'familyFriendlyMovies',
        type: 'horizontalList',
        title: `Family-Friendly Movies on ${ottName}`,
        data: familyFriendlyMovies,
        onEndReached: hasNextFamilyFriendlyMovies ? fetchNextFamilyFriendlyMovies : undefined,
      });
    }

    if (familyFriendlyTV.length > 0) {
      sectionsList.push({
        id: 'familyFriendlyTV',
        type: 'horizontalList',
        title: `Family-Friendly Shows on ${ottName}`,
        data: familyFriendlyTV,
        onEndReached: hasNextFamilyFriendlyTV ? fetchNextFamilyFriendlyTV : undefined,
      });
    }

    // Genre-Based Collections
    if (actionMovies.length > 0) {
      sectionsList.push({
        id: 'actionMovies',
        type: 'horizontalList',
        title: `Action & Thriller Movies on ${ottName}`,
        data: actionMovies,
        onEndReached: hasNextActionMovies ? fetchNextActionMovies : undefined,
      });
    }

    if (actionTV.length > 0) {
      sectionsList.push({
        id: 'actionTV',
        type: 'horizontalList',
        title: `Action & Adventure Shows on ${ottName}`,
        data: actionTV,
        onEndReached: hasNextActionTV ? fetchNextActionTV : undefined,
      });
    }

    if (comedyMovies.length > 0) {
      sectionsList.push({
        id: 'comedyMovies',
        type: 'horizontalList',
        title: `Comedy Movies on ${ottName}`,
        data: comedyMovies,
        onEndReached: hasNextComedyMovies ? fetchNextComedyMovies : undefined,
      });
    }

    if (comedyTV.length > 0) {
      sectionsList.push({
        id: 'comedyTV',
        type: 'horizontalList',
        title: `Comedy Shows on ${ottName}`,
        data: comedyTV,
        onEndReached: hasNextComedyTV ? fetchNextComedyTV : undefined,
      });
    }

    if (dramaMovies.length > 0) {
      sectionsList.push({
        id: 'dramaMovies',
        type: 'horizontalList',
        title: `Drama Movies on ${ottName}`,
        data: dramaMovies,
        onEndReached: hasNextDramaMovies ? fetchNextDramaMovies : undefined,
      });
    }

    if (dramaTV.length > 0) {
      sectionsList.push({
        id: 'dramaTV',
        type: 'horizontalList',
        title: `Drama Shows on ${ottName}`,
        data: dramaTV,
        onEndReached: hasNextDramaTV ? fetchNextDramaTV : undefined,
      });
    }

    if (sciFiMovies.length > 0) {
      sectionsList.push({
        id: 'sciFiMovies',
        type: 'horizontalList',
        title: `Sci-Fi & Fantasy Movies on ${ottName}`,
        data: sciFiMovies,
        onEndReached: hasNextSciFiMovies ? fetchNextSciFiMovies : undefined,
      });
    }

    if (sciFiTV.length > 0) {
      sectionsList.push({
        id: 'sciFiTV',
        type: 'horizontalList',
        title: `Sci-Fi & Fantasy Shows on ${ottName}`,
        data: sciFiTV,
        onEndReached: hasNextSciFiTV ? fetchNextSciFiTV : undefined,
      });
    }

    if (horrorMovies.length > 0) {
      sectionsList.push({
        id: 'horrorMovies',
        type: 'horizontalList',
        title: `Horror Movies on ${ottName}`,
        data: horrorMovies,
        onEndReached: hasNextHorrorMovies ? fetchNextHorrorMovies : undefined,
      });
    }

    if (documentaryMovies.length > 0) {
      sectionsList.push({
        id: 'documentaryMovies',
        type: 'horizontalList',
        title: `Documentary Movies on ${ottName}`,
        data: documentaryMovies,
        onEndReached: hasNextDocumentaryMovies ? fetchNextDocumentaryMovies : undefined,
      });
    }

    if (documentaryTV.length > 0) {
      sectionsList.push({
        id: 'documentaryTV',
        type: 'horizontalList',
        title: `Documentary Shows on ${ottName}`,
        data: documentaryTV,
        onEndReached: hasNextDocumentaryTV ? fetchNextDocumentaryTV : undefined,
      });
    }

    return sectionsList;
  }, [
    featuredItems,
    popularMovies,
    latestMovies,
    popularTV,
    latestTV,
    myLanguage,
    myLanguageMoviesOnOTT,
    myLanguageTVOnOTT,
    topRatedMovies,
    topRatedTV,
    bingeWorthyTV,
    criticallyAcclaimedMovies,
    familyFriendlyMovies,
    familyFriendlyTV,
    actionMovies,
    actionTV,
    comedyMovies,
    comedyTV,
    dramaMovies,
    dramaTV,
    sciFiMovies,
    sciFiTV,
    horrorMovies,
    documentaryMovies,
    documentaryTV,
    ottName,
  ]);

  const renderSection = useCallback(({item}: {item: any}) => {
    switch (item.type) {
      case 'banner':
        return (
          <View style={styles.bannerContainer}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}>
              <Icon name="chevron-back" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <FeaturedBanner
              item={item.data[0]}
              type={item.data[0].type}
              slides={item.data}
              autoplayEnabled={isBannerVisible}
            />
            {ottLogo && (
              <View style={styles.ottInfoOverlay}>
                <Image
                  source={{uri: `https://image.tmdb.org/t/p/w154${ottLogo}`}}
                  style={styles.ottLogoSmall}
                  resizeMode="contain"
                />
                <Text style={styles.ottNameOverlay}>{ottName}</Text>
              </View>
            )}
          </View>
        );
      
      case 'header':
        return (
          <LinearGradient
            colors={[colors.background.secondary, colors.background.primary]}
            style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}>
              <Icon name="chevron-back" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            
            <View style={styles.headerContent}>
              {ottLogo ? (
                <Image
                  source={{uri: `https://image.tmdb.org/t/p/w154${ottLogo}`}}
                  style={styles.logo}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <Text style={styles.logoPlaceholderText}>{ottName.charAt(0)}</Text>
                </View>
              )}
              <Text style={styles.title}>{ottName}</Text>
              <Text style={styles.subtitle}>Discover content on {ottName}</Text>
            </View>
          </LinearGradient>
        );

      case 'horizontalList':
        return (
          <HorizontalList
            title={item.title}
            data={item.data}
            onItemPress={handleItemPress}
            onEndReached={item.onEndReached}
            onSeeAllPress={item.onSeeAllPress}
            isSeeAll={!!item.onSeeAllPress}
          />
        );

      default:
        return null;
    }
  }, [handleItemPress, navigation, ottLogo, ottName, isBannerVisible]);

  const keyExtractor = useCallback((item: any) => item.id, []);

  const getItemLayout = useCallback(
    (_: any, index: number) => {
      const item = sections[index];
      let height = 320; // default for horizontalList
      if (item?.type === 'banner') height = 500;
      if (item?.type === 'header') height = 280;
      
      return {
        length: height,
        offset: height * index,
        index,
      };
    },
    [sections],
  );

  const viewabilityConfig = useMemo(
    () => ({
      minimumViewTime: 80,
      viewAreaCoveragePercentThreshold: 25,
    }),
    [],
  );

  const onViewableItemsChanged = useCallback(({viewableItems}: any) => {
    const visible = viewableItems?.some(
      (vi: any) => vi?.item?.type === 'banner',
    );
    setIsBannerVisible(!!visible);
  }, []);

  // ========== CHECK LOADING STATE (AFTER ALL HOOKS) ==========
  
  // Only wait for core data (popular/latest) - show content progressively
  const isInitialLoading =
    isLoadingPopularMovies ||
    isLoadingPopularTV ||
    isLoadingLatestMovies ||
    isLoadingLatestTV;

  // Show skeleton while loading
  if (isInitialLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <BannerSkeleton />
          <HeadingSkeleton />
          <HorizontalListSkeleton />
          <HeadingSkeleton />
          <HorizontalListSkeleton />
          <HeadingSkeleton />
          <HorizontalListSkeleton />
          <HeadingSkeleton />
          <HorizontalListSkeleton />
          <HeadingSkeleton />
          <HorizontalListSkeleton />
        </View>
      </View>
    );
  }

  // Render main content
  return (
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
        removeClippedSubviews={true}
        maxToRenderPerBatch={3}
        windowSize={5}
        initialNumToRender={3}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  loadingContainer: {
    backgroundColor: colors.background.primary,
    paddingBottom: 100,
  },
  bannerContainer: {
    marginBottom: spacing.md,
    position: 'relative',
  },
  ottInfoOverlay: {
    position: 'absolute',
    top: 60,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    zIndex: 100,
  },
  ottLogoSmall: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
  },
  ottNameOverlay: {
    ...typography.body2,
    color: colors.text.primary,
    fontWeight: '600',
    fontFamily: 'Inter_18pt-SemiBold',
  },
  header: {
    paddingTop: 60,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: spacing.lg,
    padding: spacing.sm,
    backgroundColor: colors.modal.blur,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.modal.border,
    zIndex: 100,
  },
  headerContent: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.modal.blur,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logoPlaceholderText: {
    fontSize: 40,
    color: colors.text.secondary,
    fontWeight: 'bold',
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
    fontFamily: 'Inter_18pt-Bold',
  },
  subtitle: {
    ...typography.body1,
    color: colors.text.secondary,
    textAlign: 'center',
    fontFamily: 'Inter_18pt-Regular',
  },
  content: {
    paddingBottom: 100,
  },
});
