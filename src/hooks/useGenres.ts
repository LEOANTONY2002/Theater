import {useQuery} from '@tanstack/react-query';
import {getGenres} from '../services/tmdb';
import {Genre} from '../types/movie';

export const useGenres = (type: 'movie' | 'tv') => {
  return useQuery<Genre[]>({
    queryKey: ['genres', type],
    queryFn: () => getGenres(type),
    staleTime: 1000 * 60 * 60 * 24, // 24 hours - genres rarely change
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days cache
  });
};
