import {useQuery, useInfiniteQuery} from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getMovies,
  getMovieDetails,
  searchMovies,
  getSimilarMovies,
  getMovieRecommendations,
  getTrendingMovies,
  getTop10MoviesTodayByRegion,
  discoverMovies,
  fetchContentFromAI,
} from '../services/tmdbWithCache';
import {Movie, MovieDetails, MoviesResponse} from '../types/movie';
import {FilterParams} from '../types/filters';
import {SettingsManager} from '../store/settings';
import {getSimilarByStory} from '../services/gemini';
import {Genre} from '../types/movie';
import {batchCacheMovies, cacheMovieDetails} from '../database/contentCache';
import {filterTMDBResponse} from '../utils/adultContentFilter';

// Cache times
const TMDB_LIST_STALE = 1000 * 60 * 60 * 24; // 1 day for trending/popular/latest
const TMDB_LIST_GC = 1000 * 60 * 60 * 24 * 2; // 2 days GC
const TMDB_DETAILS_STALE = 0; // Don't cache - Realm is the source of truth
const TMDB_DETAILS_GC = 0; // No memory cache - always use Realm
const AI_STALE = 0; // Don't cache - Realm is the source of truth
const AI_GC = 1000 * 60 * 5; // 5 min memory cache for active session

export const useMoviesList = (
  type:
    | 'latest'
    | 'popular'
    | 'top_rated'
    | 'upcoming'
    | 'now_playing'
    | 'latest_by_region'
    | 'upcoming_by_region',
) => {
  return useInfiniteQuery({
    queryKey: ['movies', type],
    queryFn: async ({pageParam = 1}) => {
      const result = await getMovies(type, pageParam as number);
      // Filter adult content and cache movies in Realm
      if (result?.results) {
        result.results = filterTMDBResponse(result.results, 'movie');
        batchCacheMovies(result.results);
      }
      return result;
    },
    getNextPageParam: (lastPage: MoviesResponse) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    gcTime: TMDB_LIST_GC,
    staleTime: TMDB_LIST_STALE,
  });
};

export const useMovieDetails = (movieId: number) => {
  return useQuery({
    queryKey: ['movie', movieId],
    queryFn: async () => {
      const details = await getMovieDetails(movieId);
      // Only cache if this came from API (not from Realm cache)
      if (details && details._fromAPI) {
        delete details._fromAPI; // Remove marker
        cacheMovieDetails(
          details,
          details.credits?.cast,
          details.credits?.crew,
          details.videos?.results,
        );
      }
      return details;
    },
    gcTime: TMDB_DETAILS_GC,
    staleTime: TMDB_DETAILS_STALE,
  });
};

export const useMovieSearch = (query: string, filters: FilterParams = {}) => {
  return useInfiniteQuery({
    queryKey: ['search', query, filters],
    queryFn: async ({pageParam = 1}) => {
      const result = await searchMovies(query, pageParam as number, filters);
      if (result?.results) {
        result.results = filterTMDBResponse(result.results, 'movie');
        batchCacheMovies(result.results);
      }
      return result;
    },
    getNextPageParam: (lastPage: MoviesResponse) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    gcTime: TMDB_LIST_GC,
    staleTime: TMDB_LIST_STALE,
  });
};

export const useSimilarMovies = (movieId: number) => {
  return useInfiniteQuery({
    queryKey: ['movie', movieId, 'similar'],
    queryFn: async ({pageParam = 1}) => {
      const result = await getSimilarMovies(movieId, pageParam as number);
      if (result?.results) {
        result.results = filterTMDBResponse(result.results, 'movie');
        batchCacheMovies(result.results);
      }
      return result;
    },
    getNextPageParam: (lastPage: MoviesResponse) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    gcTime: TMDB_DETAILS_GC,
    staleTime: TMDB_DETAILS_STALE,
  });
};

export const useMovieRecommendations = (movieId: number) => {
  return useInfiniteQuery({
    queryKey: ['movie', movieId, 'recommendations'],
    queryFn: async ({pageParam = 1}) => {
      const result = await getMovieRecommendations(
        movieId,
        pageParam as number,
      );
      if (result?.results) {
        result.results = filterTMDBResponse(result.results, 'movie');
        batchCacheMovies(result.results);
      }
      return result;
    },
    getNextPageParam: (lastPage: MoviesResponse) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    gcTime: TMDB_DETAILS_GC,
    staleTime: TMDB_DETAILS_STALE,
  });
};

export const useTrendingMovies = (timeWindow: 'day' | 'week' = 'day') => {
  const {data: contentLanguages} = useQuery({
    queryKey: ['content_languages'],
    queryFn: SettingsManager.getContentLanguages,
    staleTime: TMDB_LIST_STALE,
  });

  return useInfiniteQuery({
    queryKey: [
      'trending_movies',
      timeWindow,
      contentLanguages?.map(lang => lang.iso_639_1).join('|'),
    ],
    queryFn: async ({pageParam = 1}) => {
      const result = await getTrendingMovies(timeWindow, pageParam as number);
      if (result?.results) {
        result.results = filterTMDBResponse(result.results, 'movie');
        batchCacheMovies(result.results);
      }
      return result;
    },
    getNextPageParam: (lastPage: MoviesResponse) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    gcTime: TMDB_LIST_GC,
    staleTime: TMDB_LIST_STALE,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
};

export const useDiscoverMovies = (params: FilterParams) => {
  return useInfiniteQuery({
    queryKey: ['discover_movies', params],
    queryFn: async ({pageParam = 1}) => {
      const result = await discoverMovies(params, pageParam as number);
      if (result?.results) {
        result.results = filterTMDBResponse(result.results, 'movie');
        batchCacheMovies(result.results);
      }
      return result;
    },
    getNextPageParam: (lastPage: MoviesResponse) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    enabled: params !== undefined,
    gcTime: TMDB_LIST_GC,
    staleTime: TMDB_LIST_STALE,
  });
};

export const useTop10MoviesTodayByRegion = () => {
  const {data: region} = useQuery<{iso_3166_1: string; english_name: string}>({
    queryKey: ['region'],
    queryFn: SettingsManager.getRegion,
    staleTime: TMDB_LIST_STALE,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  return useQuery({
    queryKey: ['top_10_movies_today_by_region', region?.iso_3166_1],
    queryFn: async () => {
      let result = await getTop10MoviesTodayByRegion();
      if (result && Array.isArray(result)) {
        result = filterTMDBResponse(result, 'movie');
        batchCacheMovies(result);
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

export const useMovieReviews = (movieId: number, enabled: boolean = true) => {
  return useInfiniteQuery({
    queryKey: ['movie', movieId, 'reviews'],
    queryFn: async ({pageParam = 1}) => {
      const {getMovieReviews} = await import('../services/tmdb');
      return await getMovieReviews(movieId, pageParam as number);
    },
    getNextPageParam: (lastPage: any) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    enabled: enabled,
    gcTime: TMDB_DETAILS_GC,
    staleTime: TMDB_DETAILS_STALE,
  });
};

export const useAISimilarMovies = (
  movieId: number,
  title?: string,
  overview?: string,
  genres?: Genre[],
) => {
  return useQuery({
    queryKey: ['ai_similar_movies', movieId],
    queryFn: async () => {
      if (!title || !overview) {
        return [];
      }

      // Import here to avoid circular dependency
      const {getMovie} = await import('../database/contentCache');

      // Check if movie is in Realm and has AI similar data
      const cached = getMovie(movieId);
      if (cached?.ai_similar) {
        try {
          const parsed = JSON.parse(cached.ai_similar as string);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const tmdbMovies = await fetchContentFromAI(parsed, 'movie');
            return tmdbMovies
              .filter((m: any) => m && m.poster_path)
              .map((m: any) => ({
                ...m,
                type: 'movie' as const,
              }));
          }
        } catch (e) {
          console.warn('[useAISimilarMovies] Failed to parse cached similar');
        }
      }

      try {
        const aiResponse = await getSimilarByStory({
          title,
          overview,
          genres: genres?.map((g: Genre) => g?.name).join(', ') || '',
          type: 'movie',
          contentId: movieId,
        });

        if (Array.isArray(aiResponse) && aiResponse.length > 0) {
          const tmdbMovies = await fetchContentFromAI(aiResponse, 'movie');
          return tmdbMovies
            .filter((m: any) => m && m.poster_path)
            .map((m: any) => ({
              ...m,
              type: 'movie' as const,
            }));
        }
        return [];
      } catch (error) {
        console.error('Error fetching AI similar movies:', error);
        return [];
      }
    },
    enabled: !!title && !!overview,
    gcTime: AI_GC,
    staleTime: AI_STALE,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};
