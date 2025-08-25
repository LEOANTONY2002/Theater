import {useQuery} from '@tanstack/react-query';
import {getWatchProviders} from '../services/tmdb';

const CACHE_TIME = 1000 * 60 * 60; // 1 hour
const STALE_TIME = 1000 * 60 * 5; // 5 minutes

export interface WatchProvider {
  logo_path: string;
  provider_id: number;
  provider_name: string;
  display_priority: number;
}

export interface WatchProviders {
  link: string;
  ads?: WatchProvider[];
  flatrate?: WatchProvider[];
  rent?: WatchProvider[];
  buy?: WatchProvider[];
  free?: WatchProvider[];
}

export const useWatchProviders = (
  contentId: number,
  contentType: 'movie' | 'tv',
) => {
  return useQuery({
    queryKey: ['watch_providers', contentType, contentId],
    queryFn: () => getWatchProviders(contentId, contentType),
    gcTime: CACHE_TIME,
    staleTime: STALE_TIME,
  });
};
