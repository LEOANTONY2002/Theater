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
  getAiringTodayTVShows,
  fetchContentFromAI,
} from '../services/tmdbWithCache';
import {TVShow, TVShowDetails, TVShowsResponse} from '../types/tvshow';
import {FilterParams} from '../types/filters';
import {SettingsManager} from '../store/settings';
import {getSimilarByStory} from '../services/groq';
import {Genre} from '../types/movie';
import {batchCacheTVShows, cacheTVShowDetails} from '../database/contentCache';
import {filterTMDBResponse} from '../utils/adultContentFilter';

// Cache times
const TMDB_LIST_STALE = 1000 * 60 * 60 * 24; // 1 day for trending/popular/latest
const TMDB_LIST_GC = 1000 * 60 * 60 * 24 * 2; // 2 days GC
const TMDB_DETAILS_STALE = 0; // Don't cache - Realm is the source of truth
const TMDB_DETAILS_GC = 1000 * 60 * 5; // 5 min memory cache for active session
const AI_STALE = 0; // Don't cache - Realm is the source of truth
const AI_GC = 1000 * 60 * 5; // 5 min memory cache for active session

export const useTVShowsList = (type: 'popular' | 'top_rated' | 'latest') => {
  return useInfiniteQuery({
    queryKey: ['tvshows', type],
    queryFn: async ({pageParam = 1}) => {
      const result = await getTVShows(type, pageParam as number);
      // Filter adult content and cache TV shows in Realm
      if (result?.results) {
        result.results = filterTMDBResponse(result.results, 'tv');
        batchCacheTVShows(result.results);
      }
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

export const useAiringTodayTVShows = () => {
  return useInfiniteQuery({
    queryKey: ['tvshows', 'airing_today'],
    queryFn: async ({pageParam = 1}) => {
      const result = await getAiringTodayTVShows(pageParam as number);
      if (result?.results) {
        result.results = filterTMDBResponse(result.results, 'tv');
        batchCacheTVShows(result.results);
      }
      return result;
    },
    getNextPageParam: (lastPage: TVShowsResponse) => {
      if (lastPage.page < lastPage.total_pages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    gcTime: TMDB_LIST_GC,
    staleTime: TMDB_LIST_STALE,
  });
};

export const useTVShowDetails = (tvShowId: number) => {
  return useQuery({
    queryKey: ['tvshow', tvShowId],
    queryFn: async () => {
      const details = await getTVShowDetails(tvShowId);
      // Preserve episode data before caching
      const nextEpisode = details?.next_episode_to_air;
      const lastEpisode = details?.last_episode_to_air;

      // Cache full details in Realm
      if (details) {
        cacheTVShowDetails(
          details,
          details.credits?.cast,
          details.credits?.crew,
          details.videos?.results,
        );
      }

      // Return details with episode data preserved
      return {
        ...details,
        next_episode_to_air: nextEpisode,
        last_episode_to_air: lastEpisode,
      };
    },
    gcTime: TMDB_DETAILS_GC,
    staleTime: TMDB_DETAILS_STALE,
  });
};

export const useTVShowSearch = (query: string, filters: FilterParams = {}) => {
  return useInfiniteQuery({
    queryKey: ['search_tv', query, filters],
    queryFn: async ({pageParam = 1}) => {
      const result = await searchTVShows(query, pageParam as number, filters);
      if (result?.results) {
        result.results = filterTMDBResponse(result.results, 'tv');
        batchCacheTVShows(result.results);
      }
      return result;
    },
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
    queryFn: async ({pageParam = 1}) => {
      const result = await discoverTVShows(params, pageParam as number);
      if (result?.results) {
        result.results = filterTMDBResponse(result.results, 'tv');
        batchCacheTVShows(result.results);
      }
      return result;
    },
    getNextPageParam: (lastPage: TVShowsResponse) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    enabled: params !== undefined,
    gcTime: TMDB_LIST_GC,
    staleTime: TMDB_LIST_STALE,
  });
};

export const useSimilarTVShows = (tvId: number, enabled: boolean = true) => {
  return useInfiniteQuery({
    queryKey: ['tv', tvId, 'similar'],
    queryFn: async ({pageParam = 1}) => {
      const result = await getSimilarTVShows(tvId, pageParam as number);
      if (result?.results) {
        result.results = filterTMDBResponse(result.results, 'tv');
        batchCacheTVShows(result.results);
      }
      return result;
    },
    getNextPageParam: (lastPage: TVShowsResponse) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    gcTime: TMDB_DETAILS_GC,
    staleTime: TMDB_DETAILS_STALE,
    enabled,
  });
};

export const useTVShowRecommendations = (tvId: number) => {
  return useInfiniteQuery({
    queryKey: ['tv', tvId, 'recommendations'],
    queryFn: async ({pageParam = 1}) => {
      const result = await getTVShowRecommendations(tvId, pageParam as number);
      if (result?.results) {
        result.results = filterTMDBResponse(result.results, 'tv');
        batchCacheTVShows(result.results);
      }
      return result;
    },
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
    queryFn: async ({pageParam = 1}) => {
      const result = await getTrendingTVShows(timeWindow, pageParam as number);
      if (result?.results) {
        result.results = filterTMDBResponse(result.results, 'tv');
        batchCacheTVShows(result.results);
      }
      return result;
    },
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

export const useTVShowReviews = (tvId: number, enabled: boolean = true) => {
  return useInfiniteQuery({
    queryKey: ['tv', tvId, 'reviews'],
    queryFn: async ({pageParam = 1}) => {
      const {getTVShowReviews} = await import('../services/tmdb');
      return await getTVShowReviews(tvId, pageParam as number);
    },
    getNextPageParam: (lastPage: any) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    enabled: enabled,
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
    queryFn: async () => {
      let result = await getTop10TVShowsTodayByRegion();
      if (result && Array.isArray(result)) {
        result = filterTMDBResponse(result, 'tv');
        batchCacheTVShows(result);
      }
      return result;
    },
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
  candidates?: Array<{title: string; year: string}>,
) => {
  return useQuery({
    queryKey: [
      'ai_similar_tvshows',
      tvShowId,
      candidates ? 'resolved' : 'fetch',
    ],
    queryFn: async () => {
      // If we already have candidates (from useContentAnalysis), just resolve them
      if (candidates && candidates.length > 0) {
        const shows = await fetchContentFromAI(candidates, 'tv');
        return shows;
      }

      if (!title || !overview) return [];

      // Import here to avoid circular dependency
      const {getTVShow} = await import('../database/contentCache');

      // Check if TV show is in Realm and has AI similar data
      const cached = getTVShow(tvShowId);
      if (cached?.ai_similar) {
        try {
          const parsed = JSON.parse(cached.ai_similar as string);
          if (Array.isArray(parsed) && parsed.length > 0) {
            console.log(
              '[useAISimilarTVShows] Using cached AI similar from Realm',
            );
            const shows = await fetchContentFromAI(parsed, 'tv');
            return shows;
          }
        } catch (e) {
          console.warn('[useAISimilarTVShows] Failed to parse cached similar');
        }
      }

      try {
        const aiResponse = await getSimilarByStory({
          title,
          overview,
          genres: genres?.map((g: Genre) => g?.name).join(', ') || '',
          type: 'tv',
          contentId: tvShowId,
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
