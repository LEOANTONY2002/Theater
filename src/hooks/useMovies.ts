import {useQuery, useInfiniteQuery} from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getMovies,
  getMovieDetails,
  searchMovies,
  getSimilarMovies,
  getMovieRecommendations,
  getTrendingMovies,
  discoverMovies,
  getTop10MoviesTodayByRegion,
  getContentByGenre,
} from '../services/tmdb';
import {Movie, MovieDetails, MoviesResponse} from '../types/movie';
import {FilterParams} from '../types/filters';
import {SettingsManager} from '../store/settings';

const CACHE_TIME = 1000 * 60 * 60; // 1 hour
const STALE_TIME = 1000 * 60 * 30; // 30 minutes

export const useMoviesList = (
  type:
    | 'latest'
    | 'popular'
    | 'top_rated'
    | 'upcoming'
    | 'now_playing'
    | 'latest_by_region',
) => {
  return useInfiniteQuery({
    queryKey: ['movies', type],
    queryFn: async ({pageParam = 1}) => {
      const result = await getMovies(type, pageParam as number);
      return result;
    },
    getNextPageParam: (lastPage: MoviesResponse) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    gcTime: CACHE_TIME,
    staleTime: STALE_TIME,
  });
};

export const useMovieDetails = (movieId: number) => {
  return useQuery({
    queryKey: ['movie', movieId],
    queryFn: () => getMovieDetails(movieId),
    gcTime: CACHE_TIME,
    staleTime: STALE_TIME,
  });
};

export const useMovieSearch = (query: string, filters: FilterParams = {}) => {
  return useInfiniteQuery({
    queryKey: ['search', query, filters],
    queryFn: ({pageParam = 1}) =>
      searchMovies(query, pageParam as number, filters),
    getNextPageParam: (lastPage: MoviesResponse) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    gcTime: CACHE_TIME,
    staleTime: STALE_TIME,
  });
};

export const useSimilarMovies = (movieId: number) => {
  return useInfiniteQuery({
    queryKey: ['movie', movieId, 'similar'],
    queryFn: ({pageParam = 1}) =>
      getSimilarMovies(movieId, pageParam as number),
    getNextPageParam: (lastPage: MoviesResponse) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    gcTime: CACHE_TIME,
    staleTime: STALE_TIME,
  });
};

export const useMovieRecommendations = (movieId: number) => {
  return useInfiniteQuery({
    queryKey: ['movie', movieId, 'recommendations'],
    queryFn: ({pageParam = 1}) =>
      getMovieRecommendations(movieId, pageParam as number),
    getNextPageParam: (lastPage: MoviesResponse) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    gcTime: CACHE_TIME,
    staleTime: STALE_TIME,
  });
};

export const useTrendingMovies = (timeWindow: 'day' | 'week' = 'day') => {
  const {data: contentLanguages} = useQuery({
    queryKey: ['content_languages'],
    queryFn: SettingsManager.getContentLanguages,
    staleTime: STALE_TIME,
  });

  return useInfiniteQuery({
    queryKey: [
      'trending_movies',
      timeWindow,
      contentLanguages?.map(lang => lang.iso_639_1).join('|'),
    ],
    queryFn: ({pageParam = 1}) =>
      getTrendingMovies(timeWindow, pageParam as number),
    getNextPageParam: (lastPage: MoviesResponse) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    gcTime: CACHE_TIME,
    staleTime: STALE_TIME,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
};

export const useDiscoverMovies = (params: FilterParams) => {
  return useInfiniteQuery({
    queryKey: ['discover_movies', params],
    queryFn: ({pageParam = 1}) =>
      getContentByGenre(params.with_genres, 'movie', pageParam as number),
    getNextPageParam: (lastPage: MoviesResponse) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    enabled: params !== undefined,
    gcTime: CACHE_TIME,
    staleTime: STALE_TIME,
  });
};

export const useTop10MoviesTodayByRegion = () => {
  const {data: region} = useQuery<{iso_3166_1: string; english_name: string}>({
    queryKey: ['region'],
    queryFn: SettingsManager.getRegion,
    staleTime: STALE_TIME,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  return useQuery({
    queryKey: ['top_10_movies_today_by_region', region?.iso_3166_1],
    queryFn: () => getTop10MoviesTodayByRegion(),
    gcTime: CACHE_TIME,
    staleTime: STALE_TIME,
    enabled: !!region?.iso_3166_1,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
};
