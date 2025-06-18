import {useInfiniteQuery, useQuery} from '@tanstack/react-query';
import {SettingsManager} from '../store/settings';
import {
  discoverContent,
  discoverMovies,
  discoverTVShows,
  getTrending,
  searchFilterContent,
} from '../services/tmdb';
import {SavedFilter} from '../types/filters';
import {useDiscoverMovies} from './useMovies';
import {useDiscoverTVShows} from './useTVShows';
import {FiltersManager} from '../store/filters';

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

export const useSelectedLanguages = () => {
  return useQuery({
    queryKey: ['selectedLanguages'],
    queryFn: () => SettingsManager.getContentLanguages(),
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    enabled: true,
    staleTime: 0,
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

export const useSavedFilterContent = (savedFilters: any = []) => {
  return useQuery({
    queryKey: ['savedFilterContent', savedFilters],
    queryFn: () => searchFilterContent(savedFilters),
    gcTime: CACHE_TIME,
    staleTime: STALE_TIME,
  });
};
