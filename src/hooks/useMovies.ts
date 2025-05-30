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
} from '../services/tmdb';
import {Movie, MovieDetails, MoviesResponse} from '../types/movie';
import {FilterParams} from '../types/filters';

const CACHE_TIME = 1000 * 60 * 60; // 1 hour
const STALE_TIME = 1000 * 60 * 5; // 5 minutes

export const useMoviesList = (
  type: 'latest' | 'popular' | 'top_rated' | 'upcoming' | 'now_playing',
) => {
  return useInfiniteQuery({
    queryKey: ['movies', type],
    queryFn: ({pageParam = 1}) => getMovies(type, pageParam as number),
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
  return useInfiniteQuery({
    queryKey: ['trending_movies', timeWindow],
    queryFn: ({pageParam = 1}) =>
      getTrendingMovies(timeWindow, pageParam as number),
    getNextPageParam: (lastPage: MoviesResponse) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    gcTime: CACHE_TIME,
    staleTime: STALE_TIME,
  });
};

export const useDiscoverMovies = (params: FilterParams) => {
  return useInfiniteQuery({
    queryKey: ['discover_movies', params],
    queryFn: ({pageParam = 1}) =>
      discoverMovies({...params, page: pageParam as number}),
    getNextPageParam: (lastPage: MoviesResponse) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    enabled: params !== undefined,
    gcTime: CACHE_TIME,
    staleTime: STALE_TIME,
  });
};
