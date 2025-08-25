import {useQuery} from '@tanstack/react-query';
import {getIMDBRating, getIMDBSeriesRating} from '../services/scrap';

const CACHE_TIME = 1000 * 60 * 60; // 1 hour
const STALE_TIME = 1000 * 60 * 5; // 5 minutes

export const useIMDBRating = (id: string) => {
  return useQuery({
    queryKey: ['imdb_rating', id],
    queryFn: () => getIMDBRating(id),
    gcTime: CACHE_TIME,
    staleTime: STALE_TIME,
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
