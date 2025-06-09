import {useInfiniteQuery, useQuery} from '@tanstack/react-query';
import {
  getPersonMovieCredits,
  getPersonTVCredits,
  getPersonDetails,
} from '../services/tmdb';
import {MoviesResponse} from '../types/movie';
import {TVShowsResponse} from '../types/tvshow';

const CACHE_TIME = 1000 * 60 * 60; // 1 hour
const STALE_TIME = 1000 * 60 * 5; // 5 minutes

export const usePersonDetails = (personId: number) => {
  return useQuery({
    queryKey: ['person', personId],
    queryFn: () => getPersonDetails(personId),
    gcTime: CACHE_TIME,
    staleTime: STALE_TIME,
  });
};

export const usePersonMovieCredits = (personId: number) => {
  return useInfiniteQuery({
    queryKey: ['person', personId, 'movie_credits'],
    queryFn: ({pageParam = 1}) =>
      getPersonMovieCredits(personId, pageParam as number),
    getNextPageParam: (lastPage: MoviesResponse) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    gcTime: CACHE_TIME,
    staleTime: STALE_TIME,
  });
};

export const usePersonTVCredits = (personId: number) => {
  return useInfiniteQuery({
    queryKey: ['person', personId, 'tv_credits'],
    queryFn: ({pageParam = 1}) =>
      getPersonTVCredits(personId, pageParam as number),
    getNextPageParam: (lastPage: TVShowsResponse) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    gcTime: CACHE_TIME,
    staleTime: STALE_TIME,
  });
};
