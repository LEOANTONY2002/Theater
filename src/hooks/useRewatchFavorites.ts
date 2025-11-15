import {useQuery} from '@tanstack/react-query';
import {RealmHistoryManager} from '../database/managers';

const CACHE_TIME = 1000 * 60 * 60; // 1 hour
const STALE_TIME = 1000 * 60 * 5; // 5 minutes

/**
 * Hook to get content user has watched multiple times (rewatch favorites)
 */
export const useRewatchFavorites = () => {
  return useQuery({
    queryKey: ['rewatchFavorites'],
    queryFn: async () => {
      try {
        const allHistory = await RealmHistoryManager.getAll();
        
        // Filter items with viewCount >= 2
        const rewatched = allHistory
          .filter(item => (item.viewCount || 1) >= 2)
          .sort((a, b) => (b.viewCount || 1) - (a.viewCount || 1)) // Sort by most rewatched
          .slice(0, 10); // Limit to top 10 most revisited

        // Convert to content format
        return rewatched.map(item => ({
          id: item.contentId,
          title: item.title,
          name: item.name,
          overview: item.overview,
          poster_path: item.poster_path,
          backdrop_path: item.backdrop_path,
          vote_average: item.vote_average,
          release_date: item.release_date,
          first_air_date: item.first_air_date,
          type: item.type as 'movie' | 'tv',
          viewCount: item.viewCount || 1,
        }));
      } catch (error) {
        console.error('[useRewatchFavorites] Error fetching rewatch favorites:', error);
        return [];
      }
    },
    gcTime: CACHE_TIME,
    staleTime: STALE_TIME,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
};

/**
 * Hook to get recently watched content (last 20 items)
 */
export const useRecentlyWatched = () => {
  return useQuery({
    queryKey: ['recentlyWatched'],
    queryFn: async () => {
      try {
        const allHistory = await RealmHistoryManager.getAll();
        
        // Sort by most recent and take top 20
        const recent = allHistory
          .sort((a, b) => b.viewedAt.getTime() - a.viewedAt.getTime())
          .slice(0, 20);

        // Convert to content format
        return recent.map(item => ({
          id: item.contentId,
          title: item.title,
          name: item.name,
          overview: item.overview,
          poster_path: item.poster_path,
          backdrop_path: item.backdrop_path,
          vote_average: item.vote_average,
          release_date: item.release_date,
          first_air_date: item.first_air_date,
          type: item.type as 'movie' | 'tv',
          viewedAt: item.viewedAt,
        }));
      } catch (error) {
        console.error('[useRecentlyWatched] Error fetching recently watched:', error);
        return [];
      }
    },
    gcTime: CACHE_TIME,
    staleTime: STALE_TIME,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
};
