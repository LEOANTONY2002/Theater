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
  fetchContentFromAI,
} from '../services/tmdbWithCache';
import {TVShow, TVShowDetails, TVShowsResponse} from '../types/tvshow';
import {FilterParams} from '../types/filters';
import {SettingsManager} from '../store/settings';
import {getSimilarByStory} from '../services/gemini';
import {Genre} from '../types/movie';

// Cache times
const TMDB_LIST_STALE = 1000 * 60 * 60 * 24; // 1 day for trending/popular/latest
const TMDB_LIST_GC = 1000 * 60 * 60 * 24 * 2; // 2 days GC
const TMDB_DETAILS_STALE = 1000 * 60 * 60 * 24 * 180; // 6 months for details
const TMDB_DETAILS_GC = 1000 * 60 * 60 * 24 * 180; // 6 months GC
const AI_STALE = 1000 * 60 * 60 * 24 * 180; // 6 months for AI
const AI_GC = 1000 * 60 * 60 * 24 * 180; // 6 months GC

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
    gcTime: TMDB_DETAILS_GC,
    staleTime: TMDB_DETAILS_STALE,
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
    gcTime: TMDB_LIST_GC,
    staleTime: TMDB_LIST_STALE,
  });
};

export const useDiscoverTVShows = (params: FilterParams) => {
  return useInfiniteQuery({
    queryKey: ['discover_tv', params],
    queryFn: ({pageParam = 1}) => discoverTVShows(params, pageParam as number),
    getNextPageParam: (lastPage: TVShowsResponse) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    enabled: params !== undefined,
    gcTime: TMDB_LIST_GC,
    staleTime: TMDB_LIST_STALE,
  });
};

export const useSimilarTVShows = (tvId: number) => {
  return useInfiniteQuery({
    queryKey: ['tv', tvId, 'similar'],
    queryFn: ({pageParam = 1}) => getSimilarTVShows(tvId, pageParam as number),
    getNextPageParam: (lastPage: TVShowsResponse) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    gcTime: TMDB_DETAILS_GC,
    staleTime: TMDB_DETAILS_STALE,
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
    gcTime: TMDB_DETAILS_GC,
    staleTime: TMDB_DETAILS_STALE,
  });
};

export const useTrendingTVShows = (timeWindow: 'day' | 'week' = 'day') => {
  const {data: contentLanguages} = useQuery({
    queryKey: ['content_languages'],
    queryFn: SettingsManager.getContentLanguages,
    staleTime: TMDB_LIST_STALE,
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
    gcTime: TMDB_LIST_GC,
    staleTime: TMDB_LIST_STALE,
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
    gcTime: TMDB_DETAILS_GC,
    staleTime: TMDB_DETAILS_STALE,
  });
};

export const useTop10ShowsTodayByRegion = () => {
  const {data: region} = useQuery<{iso_3166_1: string; english_name: string}>({
    queryKey: ['region'],
    queryFn: SettingsManager.getRegion,
    staleTime: TMDB_LIST_STALE,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  return useQuery({
    queryKey: ['top_10_shows_today_by_region', region?.iso_3166_1],
    queryFn: () => getTop10TVShowsTodayByRegion(),
    gcTime: TMDB_LIST_GC,
    staleTime: TMDB_LIST_STALE,
    enabled: !!region?.iso_3166_1,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
};

export const useAISimilarTVShows = (
  tvShowId: number,
  title?: string,
  overview?: string,
  genres?: Genre[],
) => {
  return useQuery({
    queryKey: ['ai_similar_tvshows', tvShowId, title, overview],
    queryFn: async () => {
      if (!title || !overview) return [];

      try {
        const aiResponse = await getSimilarByStory({
          title,
          overview,
          genres: genres?.map((g: Genre) => g?.name).join(', ') || '',
          type: 'tv',
        });

        if (Array.isArray(aiResponse) && aiResponse.length > 0) {
          const shows = await fetchContentFromAI(aiResponse, 'tv');
          return shows;
        }
        return [];
      } catch (error) {
        console.error('Error fetching AI similar TV shows:', error);
        return [];
      }
    },
    gcTime: AI_GC,
    staleTime: AI_STALE,
    enabled: !!title && !!overview,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
};
