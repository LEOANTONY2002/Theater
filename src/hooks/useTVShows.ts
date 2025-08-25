import {useQuery, useInfiniteQuery} from '@tanstack/react-query';
import {
  getTVShows,
  getTVShowDetails,
  searchTVShows,
  discoverTVShows,
  getSimilarTVShows,
  getTVShowRecommendations,
  getTrendingTVShows,
  getSeasonDetails,
  getTop10TVShowsTodayByRegion,
  getContentByGenre,
} from '../services/tmdb';
import {TVShow, TVShowDetails, TVShowsResponse} from '../types/tvshow';
import {FilterParams} from '../types/filters';
import {SettingsManager} from '../store/settings';

const CACHE_TIME = 1000 * 60 * 60; // 1 hour
const STALE_TIME = 1000 * 60 * 30; // 30 minutes

export const useTVShowsList = (type: 'popular' | 'top_rated' | 'latest') => {
  return useInfiniteQuery({
    queryKey: ['tvshows', type],
    queryFn: async ({pageParam = 1}) => {
      const result = await getTVShows(type, pageParam as number);
      return result;
    },
    getNextPageParam: (lastPage: TVShowsResponse) => {
      if (lastPage.page < lastPage.total_pages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });
};

export const useTVShowDetails = (tvShowId: number) => {
  return useQuery({
    queryKey: ['tvshow', tvShowId],
    queryFn: () => getTVShowDetails(tvShowId),
    gcTime: CACHE_TIME,
    staleTime: STALE_TIME,
  });
};

export const useTVShowSearch = (query: string, filters: FilterParams = {}) => {
  return useInfiniteQuery({
    queryKey: ['search_tv', query, filters],
    queryFn: ({pageParam = 1}) =>
      searchTVShows(query, pageParam as number, filters),
    getNextPageParam: (lastPage: TVShowsResponse) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    gcTime: CACHE_TIME,
    staleTime: STALE_TIME,
  });
};

export const useDiscoverTVShows = (params: FilterParams) => {
  return useInfiniteQuery({
    queryKey: ['discover_tv', params],
    queryFn: ({pageParam = 1}) =>
      getContentByGenre(params?.with_genres, 'tv', pageParam),
    getNextPageParam: (lastPage: TVShowsResponse) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    enabled: params !== undefined,
    gcTime: CACHE_TIME,
    staleTime: STALE_TIME,
  });
};

export const useSimilarTVShows = (tvId: number) => {
  return useInfiniteQuery({
    queryKey: ['tv', tvId, 'similar'],
    queryFn: ({pageParam = 1}) => getSimilarTVShows(tvId, pageParam as number),
    getNextPageParam: (lastPage: TVShowsResponse) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    gcTime: CACHE_TIME,
    staleTime: STALE_TIME,
  });
};

export const useTVShowRecommendations = (tvId: number) => {
  return useInfiniteQuery({
    queryKey: ['tv', tvId, 'recommendations'],
    queryFn: ({pageParam = 1}) =>
      getTVShowRecommendations(tvId, pageParam as number),
    getNextPageParam: (lastPage: TVShowsResponse) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    gcTime: CACHE_TIME,
    staleTime: STALE_TIME,
  });
};

export const useTrendingTVShows = (timeWindow: 'day' | 'week' = 'day') => {
  const {data: contentLanguages} = useQuery({
    queryKey: ['content_languages'],
    queryFn: SettingsManager.getContentLanguages,
    staleTime: STALE_TIME,
  });

  return useInfiniteQuery({
    queryKey: [
      'trending_tv',
      timeWindow,
      contentLanguages?.map(lang => lang.iso_639_1).join('|'),
    ],
    queryFn: ({pageParam = 1}) =>
      getTrendingTVShows(timeWindow, pageParam as number),
    getNextPageParam: (lastPage: TVShowsResponse) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    gcTime: CACHE_TIME,
    staleTime: STALE_TIME,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
};

export const useSeasonDetails = (tvId: number, seasonNumber?: number) => {
  return useQuery({
    queryKey: ['tv', tvId, 'season', seasonNumber],
    queryFn: () => {
      // Ensure we pass 0 for specials season
      const season = seasonNumber === 0 ? 0 : seasonNumber;
      return getSeasonDetails(tvId, season!);
    },
    enabled: seasonNumber !== undefined,
    gcTime: CACHE_TIME,
    staleTime: STALE_TIME,
  });
};

export const useTop10ShowsTodayByRegion = () => {
  const {data: region} = useQuery<{iso_3166_1: string; english_name: string}>({
    queryKey: ['region'],
    queryFn: SettingsManager.getRegion,
    staleTime: STALE_TIME,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  return useQuery({
    queryKey: ['top_10_shows_today_by_region', region?.iso_3166_1],
    queryFn: () => getTop10TVShowsTodayByRegion(),
    gcTime: CACHE_TIME,
    staleTime: STALE_TIME,
    enabled: !!region?.iso_3166_1,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
};
