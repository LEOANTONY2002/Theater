import {useInfiniteQuery, useQuery} from '@tanstack/react-query';
import {SettingsManager} from '../store/settings';
import {
  searchMovies,
  searchTVShows,
  getMoviesByOTT,
  getShowsByOTT,
  getMoviesByLanguageSimple,
  getShowsByLanguageSimple,
  buildOTTFilters,
  discoverMovies,
  discoverTVShows,
  getAvailableWatchProviders,
  getTrendingMoviesByOTT,
  getTrendingTVByOTT,
} from '../services/tmdbWithCache';

const CACHE_TIME = 1000 * 60 * 60; // 1 hour
const STALE_TIME = 1000 * 60 * 15; // 15 minutes

type Language = {
  iso_639_1: string;
  name: string;
  english_name: string;
};

export function useMyLanguage() {
  return useQuery<Language | null>({
    queryKey: ['my_language'],
    queryFn: SettingsManager.getMyLanguage,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}

export type OTTProvider = {id: number; provider_name: string; logo_path?: string};

export function useMyOTTs() {
  return useQuery<OTTProvider[]>({
    queryKey: ['my_otts'],
    queryFn: SettingsManager.getMyOTTs,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}

export function useAvailableProviders(region?: string) {
  return useQuery({
    queryKey: ['available_watch_providers', region || 'movie'],
    queryFn: () => getAvailableWatchProviders(region),
    staleTime: 1000 * 60 * 60,
  });
}

export function useMoviesByLanguage(
  kind: 'latest' | 'popular' | 'top_rated' | 'trending',
  iso?: string,
) {
  return useInfiniteQuery({
    queryKey: ['my_language_movies', kind, iso],
    enabled: !!iso,
    queryFn: ({pageParam = 1}) => {
      const today = new Date().toISOString().split('T')[0];
      const sortBy =
        kind === 'latest'
          ? 'release_date.desc'
          : kind === 'top_rated'
          ? 'vote_average.desc'
          : 'popularity.desc';
      
      return searchMovies('', pageParam as number, {
        with_original_language: iso,
        sort_by: sortBy,
        ...(kind === 'top_rated' && {'vote_count.gte': 100}),
        ...(kind === 'latest' && {'release_date.lte': today}),
      } as any);
    },
    getNextPageParam: (last: any) =>
      last?.page < last?.total_pages ? last.page + 1 : undefined,
    initialPageParam: 1,
    gcTime: CACHE_TIME,
    staleTime: STALE_TIME,
  });
}

export function useTVByLanguage(
  kind: 'latest' | 'popular' | 'top_rated' | 'trending',
  iso?: string,
) {
  return useInfiniteQuery({
    queryKey: ['my_language_tv', kind, iso],
    enabled: !!iso,
    queryFn: ({pageParam = 1}) => {
      const today = new Date().toISOString().split('T')[0];
      const sortBy =
        kind === 'latest'
          ? 'first_air_date.desc'
          : kind === 'top_rated'
          ? 'vote_average.desc'
          : 'popularity.desc';
      
      return searchTVShows('', pageParam as number, {
        with_original_language: iso,
        sort_by: sortBy,
        ...(kind === 'top_rated' && {'vote_count.gte': 100}),
        ...(kind === 'latest' && {'first_air_date.lte': today}),
      } as any);
    },
    getNextPageParam: (last: any) =>
      last?.page < last?.total_pages ? last.page + 1 : undefined,
    initialPageParam: 1,
    gcTime: CACHE_TIME,
    staleTime: STALE_TIME,
  });
}

export function useMoviesByProvider(
  providerId?: number,
  kind: 'latest' | 'popular' = 'popular',
  watchRegion?: string,
) {
  return useInfiniteQuery({
    queryKey: ['my_otts_movies', providerId, kind, watchRegion],
    enabled: !!providerId,
    queryFn: async ({pageParam = 1}) => {
      // Use centralized filter builder
      const filters = buildOTTFilters(providerId!, kind, 'movie', watchRegion);
      const response = await discoverMovies(filters, pageParam as number);
      return response;
    },
    getNextPageParam: (last: any) =>
      last?.page < last?.total_pages ? last.page + 1 : undefined,
    initialPageParam: 1,
    gcTime: CACHE_TIME,
    staleTime: STALE_TIME,
  });
}

export function useTVByProvider(
  providerId?: number,
  kind: 'latest' | 'popular' = 'popular',
  watchRegion?: string,
) {
  return useInfiniteQuery({
    queryKey: ['my_otts_tv', providerId, kind, watchRegion],
    enabled: !!providerId,
    queryFn: async ({pageParam = 1}) => {
      // Use centralized filter builder
      const filters = buildOTTFilters(providerId!, kind, 'tv', watchRegion);
      const response = await discoverTVShows(filters, pageParam as number);
      return response;
    },
    getNextPageParam: (last: any) =>
      last?.page < last?.total_pages ? last.page + 1 : undefined,
    initialPageParam: 1,
    gcTime: CACHE_TIME,
    staleTime: STALE_TIME,
  });
}

// New simple hooks per instruction (popularity desc, vote_count.gte 10)
export function useMoviesByOTTSimple(providerId?: number) {
  return useInfiniteQuery({
    queryKey: ['ott_movies_simple', providerId],
    enabled: !!providerId,
    queryFn: ({pageParam = 1}) => getMoviesByOTT(providerId as number, pageParam as number),
    getNextPageParam: (last: any) =>
      last?.page < last?.total_pages ? last.page + 1 : undefined,
    initialPageParam: 1,
    gcTime: CACHE_TIME,
    staleTime: STALE_TIME,
  });
}

export function useTVByOTTSimple(providerId?: number) {
  return useInfiniteQuery({
    queryKey: ['ott_tv_simple', providerId],
    enabled: !!providerId,
    queryFn: ({pageParam = 1}) => getShowsByOTT(providerId as number, pageParam as number),
    getNextPageParam: (last: any) =>
      last?.page < last?.total_pages ? last.page + 1 : undefined,
    initialPageParam: 1,
    gcTime: CACHE_TIME,
    staleTime: STALE_TIME,
  });
}

export function useMoviesByLanguageSimpleHook(iso?: string) {
  return useInfiniteQuery({
    queryKey: ['language_movies_simple', iso],
    enabled: !!iso,
    queryFn: ({pageParam = 1}) => getMoviesByLanguageSimple(iso as string, pageParam as number),
    getNextPageParam: (last: any) =>
      last?.page < last?.total_pages ? last.page + 1 : undefined,
    initialPageParam: 1,
    gcTime: CACHE_TIME,
    staleTime: STALE_TIME,
  });
}

export function useTVByLanguageSimpleHook(iso?: string) {
  return useInfiniteQuery({
    queryKey: ['language_tv_simple', iso],
    enabled: !!iso,
    queryFn: ({pageParam = 1}) => getShowsByLanguageSimple(iso as string, pageParam as number),
    getNextPageParam: (last: any) =>
      last?.page < last?.total_pages ? last.page + 1 : undefined,
    initialPageParam: 1,
    gcTime: CACHE_TIME,
    staleTime: STALE_TIME,
  });
}

export function useTrendingMoviesByOTT(providerId?: number) {
  return useInfiniteQuery({
    queryKey: ['trending_movies_by_ott', providerId],
    enabled: !!providerId,
    queryFn: ({pageParam = 1}) => getTrendingMoviesByOTT(providerId as number, pageParam as number),
    getNextPageParam: (last: any) =>
      last?.page < last?.total_pages ? last.page + 1 : undefined,
    initialPageParam: 1,
    gcTime: CACHE_TIME,
    staleTime: STALE_TIME,
  });
}

export function useTrendingTVByOTT(providerId?: number) {
  return useInfiniteQuery({
    queryKey: ['trending_tv_by_ott', providerId],
    enabled: !!providerId,
    queryFn: ({pageParam = 1}) => getTrendingTVByOTT(providerId as number, pageParam as number),
    getNextPageParam: (last: any) =>
      last?.page < last?.total_pages ? last.page + 1 : undefined,
    initialPageParam: 1,
    gcTime: CACHE_TIME,
    staleTime: STALE_TIME,
  });
}

// MyLanguage + MyOTTs combined hooks
export function useMoviesByLanguageAndOTTs(
  languageIso?: string,
  ottProviderIds?: number[],
  watchRegion?: string,
) {
  return useInfiniteQuery({
    queryKey: ['my_language_otts_movies', languageIso, ottProviderIds, watchRegion],
    enabled: !!languageIso && !!ottProviderIds && ottProviderIds.length > 0,
    queryFn: ({pageParam = 1}) => {
      const today = new Date().toISOString().split('T')[0];
      return searchMovies('', pageParam as number, {
        with_original_language: languageIso,
        with_watch_providers: ottProviderIds?.join('|'),
        watch_region: watchRegion || 'US',
        sort_by: 'release_date.desc',
        'release_date.lte': today,
      } as any);
    },
    getNextPageParam: (last: any) =>
      last?.page < last?.total_pages ? last.page + 1 : undefined,
    initialPageParam: 1,
    gcTime: CACHE_TIME,
    staleTime: STALE_TIME,
  });
}

export function useTVByLanguageAndOTTs(
  languageIso?: string,
  ottProviderIds?: number[],
  watchRegion?: string,
) {
  return useInfiniteQuery({
    queryKey: ['my_language_otts_tv', languageIso, ottProviderIds, watchRegion],
    enabled: !!languageIso && !!ottProviderIds && ottProviderIds.length > 0,
    queryFn: ({pageParam = 1}) => {
      const today = new Date().toISOString().split('T')[0];
      return searchTVShows('', pageParam as number, {
        with_original_language: languageIso,
        with_watch_providers: ottProviderIds?.join('|'),
        watch_region: watchRegion || 'US',
        sort_by: 'first_air_date.desc',
        'first_air_date.lte': today,
      } as any);
    },
    getNextPageParam: (last: any) =>
      last?.page < last?.total_pages ? last.page + 1 : undefined,
    initialPageParam: 1,
    gcTime: CACHE_TIME,
    staleTime: STALE_TIME,
  });
}
