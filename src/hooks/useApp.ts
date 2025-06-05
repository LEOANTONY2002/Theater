import {useInfiniteQuery, useQuery} from '@tanstack/react-query';
import {SettingsManager} from '../store/settings';
import {getTrending} from '../services/tmdb';

const CACHE_TIME = 1000 * 60 * 60; // 1 hour
const STALE_TIME = 1000 * 60 * 5; // 5 minutes

export const useRegion = () => {
  return useQuery({
    queryKey: ['region'],
    queryFn: () => SettingsManager.getRegion(),
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
};

export const useTrending = (timeWindow: 'day' | 'week' = 'day') => {
  return useInfiniteQuery({
    queryKey: ['trending', timeWindow],
    queryFn: ({pageParam = 1}) => getTrending(timeWindow, pageParam as number),
    getNextPageParam: (lastPage: any) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    gcTime: CACHE_TIME,
    staleTime: STALE_TIME,
  });
};
