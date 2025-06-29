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
    staleTime: 1000 * 60 * 30, // 30 minutes - region doesn't change often
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
};

export const useSelectedLanguages = () => {
  return useQuery({
    queryKey: ['selectedLanguages'],
    queryFn: () => SettingsManager.getContentLanguages(),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    enabled: true,
    staleTime: 1000 * 60 * 5, // 5 minutes
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

export const useSavedFilterContent = (savedFilter: SavedFilter) => {
  return useInfiniteQuery({
    queryKey: ['savedFilterContent', savedFilter],
    queryFn: ({pageParam = 1}) =>
      searchFilterContent(savedFilter, pageParam as number),
    getNextPageParam: (lastPage: any) => {
      if (!lastPage) return undefined;
      return lastPage.page < lastPage.total_pages
        ? lastPage.page + 1
        : undefined;
    },
    initialPageParam: 1,
    gcTime: CACHE_TIME,
    staleTime: STALE_TIME,
  });
};
