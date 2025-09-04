import {useInfiniteQuery, useQuery} from '@tanstack/react-query';
import {SettingsManager} from '../store/settings';
import {
  discoverMovies,
  discoverTVShows,
  getTrending,
  searchFilterContent,
} from '../services/tmdbWithCache';
import {SavedFilter} from '../types/filters';
import {useDiscoverMovies, useMoviesList} from './useMovies';
import {useDiscoverTVShows, useTVShowsList} from './useTVShows';
import {FiltersManager} from '../store/filters';
import {MovieCategoryType, TVShowCategoryType} from '../types/navigation';
import {useState, useEffect} from 'react';

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

// Dynamically select the correct data source for content lists
export function useDynamicContentSource({
  categoryType,
  contentType,
  filter,
}: {
  categoryType?: string;
  contentType: 'movie' | 'tv';
  filter?: any;
}) {
  // If filter is a SavedFilter, use saved filter logic
  if (filter && filter.type && filter.params) {
    return useSavedFilterContent(filter);
  }
  // If filter is a plain filter params object, use discover logic
  if (filter && !filter.type) {
    console.log('filter is a plain filter params object', filter);

    if (contentType === 'movie') {
      return useDiscoverMovies(filter);
    } else if (contentType === 'tv') {
      return useDiscoverTVShows(filter);
    }
  }
  // If categoryType is present, use category logic
  if (categoryType) {
    if (contentType === 'movie') {
      return useMoviesList(categoryType as MovieCategoryType);
    } else if (contentType === 'tv') {
      return useTVShowsList(categoryType as TVShowCategoryType);
    }
  }
  // Fallback: popular movies or shows
  if (contentType === 'movie') {
    const result = useMoviesList('popular');
    return {
      ...result,
      fetchNextPage: result.fetchNextPage,
      hasNextPage: result.hasNextPage,
      isFetchingNextPage: result.isFetchingNextPage,
    };
  } else if (contentType === 'tv') {
    const result = useTVShowsList('popular');
    return {
      ...result,
      fetchNextPage: result.fetchNextPage,
      hasNextPage: result.hasNextPage,
      isFetchingNextPage: result.isFetchingNextPage,
    };
  }
  // Default: return empty
  return {
    data: {pages: []},
    isLoading: false,
    fetchNextPage: undefined,
    hasNextPage: false,
    isFetchingNextPage: false,
  };
}

export function useSavedFilters() {
  return (
    useQuery({
      queryKey: ['savedFilters'],
      queryFn: () => FiltersManager.getSavedFilters(),
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }).data || []
  );
}
