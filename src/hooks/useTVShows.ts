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
} from '../services/tmdb';
import {TVShow, TVShowDetails, TVShowsResponse} from '../types/tvshow';
import {FilterParams} from '../types/filters';

const CACHE_TIME = 1000 * 60 * 60; // 1 hour
const STALE_TIME = 1000 * 60 * 5; // 5 minutes

interface TVShowsResponse {
  page: number;
  results: any[];
  total_pages: number;
  total_results: number;
}

export const useTVShowsList = (type: 'popular' | 'top_rated' | 'latest') => {
  return useInfiniteQuery({
    queryKey: ['tvshows', type],
    queryFn: ({pageParam = 1}) => getTVShows(type, pageParam as number),
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

export const useTVShowSearch = (query: string) => {
  return useInfiniteQuery({
    queryKey: ['search_tv', query],
    queryFn: ({pageParam = 1}) => searchTVShows(query, pageParam as number),
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
      discoverTVShows({...params, page: pageParam as number}),
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
  return useInfiniteQuery({
    queryKey: ['trending_tv', timeWindow],
    queryFn: ({pageParam = 1}) =>
      getTrendingTVShows(timeWindow, pageParam as number),
    getNextPageParam: (lastPage: TVShowsResponse) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    gcTime: CACHE_TIME * 2,
    staleTime: STALE_TIME * 2,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
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
