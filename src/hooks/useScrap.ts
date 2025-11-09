import {useQuery} from '@tanstack/react-query';
import {getIMDBRating, getIMDBSeriesRating} from '../services/scrap';

const CACHE_TIME = 1000 * 60 * 60 * 24 * 180; // 6 months (matches Realm cache)
const STALE_TIME = 1000 * 60 * 60 * 24 * 180; // 6 months

export const useIMDBRating = (id: string, movieId?: number) => {
  return useQuery({
    queryKey: ['imdb_rating', id, movieId],
    queryFn: () => getIMDBRating(id, movieId),
    gcTime: CACHE_TIME,
    staleTime: STALE_TIME,
    enabled: !!id, // Only run if ID is provided
  });
};

export const useIMDBSeriesRating = (title: string, year: string) => {
  return useQuery({
    queryKey: ['imdb_rating', title, year],
    queryFn: () => getIMDBSeriesRating(title, year),
    gcTime: CACHE_TIME,
    staleTime: STALE_TIME,
    retry: 1,
    subscribed: true,
  });
};
