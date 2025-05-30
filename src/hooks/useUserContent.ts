import {useState, useEffect, useCallback} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Movie} from '../types/movie';
import {TVShow} from '../types/tvshow';
import {ContentItem} from '../components/MovieList';
import {useQuery, useQueryClient} from '@tanstack/react-query';

const STORAGE_KEYS = {
  WATCHLIST: '@user_watchlist',
} as const;

type ContentType = keyof typeof STORAGE_KEYS;

const loadContent = async (storageKey: string): Promise<ContentItem[]> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const watchlistKeys = keys.filter(key => key.startsWith(storageKey));
    const items = await Promise.all(
      watchlistKeys.map(async key => {
        const data = await AsyncStorage.getItem(key);
        try {
          return data ? JSON.parse(data) : null;
        } catch (e) {
          return null;
        }
      }),
    );
    return items.filter(
      (item): item is ContentItem =>
        item !== null &&
        typeof item === 'object' &&
        'id' in item &&
        typeof item.id === 'number',
    );
  } catch (error) {
    console.error('Error loading content:', error);
    return [];
  }
};

const validateContentItem = (item: ContentItem): boolean => {
  return (
    item !== null &&
    typeof item === 'object' &&
    'id' in item &&
    typeof item.id === 'number' &&
    item.id > 0 &&
    'type' in item &&
    (item.type === 'movie' || item.type === 'tv')
  );
};

export const useUserContent = (type: ContentType) => {
  const queryClient = useQueryClient();
  const storageKey = STORAGE_KEYS[type];

  // Use React Query to manage content state
  const {data: content = [], isLoading} = useQuery({
    queryKey: [type],
    queryFn: () => loadContent(storageKey),
    staleTime: 0, // Always consider data stale to ensure fresh data
  });

  const addItem = useCallback(
    async (item: Movie | TVShow, itemType: 'movie' | 'tv') => {
      try {
        if (!item?.id) {
          console.error('Invalid item provided to addItem');
          return false;
        }

        // Create a minimal content item
        const contentItem: ContentItem =
          itemType === 'movie'
            ? {
                id: item.id,
                title: String((item as Movie).title || ''),
                originalTitle: String((item as Movie).title || ''),
                overview: String(item.overview || ''),
                poster_path: String(item.poster_path || ''),
                backdrop_path: String(item.backdrop_path || ''),
                vote_average: Number(item.vote_average || 0),
                release_date: String((item as Movie).release_date || ''),
                genre_ids: Array.isArray(item.genre_ids) ? item.genre_ids : [],
                popularity: Number(item.popularity || 0),
                original_language: String(item.original_language || ''),
                type: 'movie' as const,
              }
            : {
                id: item.id,
                name: String((item as TVShow).name || ''),
                overview: String(item.overview || ''),
                poster_path: String(item.poster_path || ''),
                backdrop_path: String(item.backdrop_path || ''),
                vote_average: Number(item.vote_average || 0),
                first_air_date: String((item as TVShow).first_air_date || ''),
                genre_ids: Array.isArray(item.genre_ids) ? item.genre_ids : [],
                origin_country: Array.isArray((item as TVShow).origin_country)
                  ? (item as TVShow).origin_country
                  : [],
                popularity: Number(item.popularity || 0),
                original_language: String(item.original_language || ''),
                type: 'tv' as const,
              };

        if (!validateContentItem(contentItem)) {
          console.error('Invalid content item structure');
          return false;
        }

        // Store each item individually with its ID in the key
        const itemKey = `${storageKey}_${item.id}`;
        const contentToStore = JSON.stringify(contentItem);

        await AsyncStorage.setItem(itemKey, contentToStore);

        // Update React Query cache
        const currentContent = await loadContent(storageKey);
        queryClient.setQueryData([type], currentContent);
        return true;
      } catch (error) {
        console.error(`Error adding item to ${type}:`, error);
        return false;
      }
    },
    [storageKey, type, queryClient],
  );

  const removeItem = useCallback(
    async (itemId: number) => {
      try {
        if (!itemId || typeof itemId !== 'number') {
          console.error('Invalid itemId provided to removeItem');
          return;
        }

        // Remove the specific item key
        const itemKey = `${storageKey}_${itemId}`;
        await AsyncStorage.removeItem(itemKey);

        // Update React Query cache
        const currentContent = await loadContent(storageKey);
        queryClient.setQueryData([type], currentContent);
      } catch (error) {
        console.error(`Error removing item from ${type}:`, error);
      }
    },
    [storageKey, type, queryClient],
  );

  const clearContent = useCallback(async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const watchlistKeys = keys.filter(key => key.startsWith(storageKey));
      await AsyncStorage.multiRemove(watchlistKeys);
      queryClient.setQueryData([type], []);
    } catch (error) {
      console.error(`Error clearing ${type}:`, error);
    }
  }, [storageKey, type, queryClient]);

  const isItemInContent = useCallback(
    (itemId: number) => {
      if (!itemId || typeof itemId !== 'number') {
        return false;
      }
      return content.some(item => item && item.id === itemId);
    },
    [content],
  );

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({queryKey: [type]});
  }, [type, queryClient]);

  return {
    content,
    isLoading,
    addItem,
    removeItem,
    clearContent,
    isItemInContent,
    refresh,
  };
};
