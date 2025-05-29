import {useState, useEffect, useCallback} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Movie} from '../types/movie';
import {TVShow} from '../types/tvshow';
import {ContentItem} from '../components/MovieList';

const STORAGE_KEYS = {
  WATCHLIST: '@user_watchlist',
};

type ContentType = 'watchlist';

// Global state to sync across hook instances
const globalState: Record<string, {content: ContentItem[]}> = {
  [STORAGE_KEYS.WATCHLIST]: {content: []},
};

// Listeners for state changes
const listeners: Record<string, Set<() => void>> = {
  [STORAGE_KEYS.WATCHLIST]: new Set(),
};

export const useUserContent = (type: ContentType) => {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const storageKey = STORAGE_KEYS[type.toUpperCase()];

  const notifyListeners = useCallback(() => {
    listeners[storageKey].forEach(listener => listener());
  }, [storageKey]);

  const loadContent = useCallback(async () => {
    try {
      setIsLoading(true);
      const savedContent = await AsyncStorage.getItem(storageKey);
      const parsedContent: ContentItem[] = savedContent
        ? JSON.parse(savedContent)
        : [];

      // Update global state
      globalState[storageKey].content = parsedContent;
      setContent(parsedContent);
    } catch (error) {
      console.error(`Error loading ${type}:`, error);
    } finally {
      setIsLoading(false);
    }
  }, [storageKey, type]);

  const addItem = useCallback(
    async (item: Movie | TVShow, itemType: 'movie' | 'tv') => {
      try {
        const contentItem: ContentItem = {
          ...item,
          type: itemType,
        } as ContentItem;

        const currentContent = globalState[storageKey].content;

        if (!currentContent.some(existingItem => existingItem.id === item.id)) {
          const newContent = [...currentContent, contentItem];

          // Update global state and notify listeners
          globalState[storageKey].content = newContent;
          notifyListeners();

          // Update storage
          await AsyncStorage.setItem(storageKey, JSON.stringify(newContent));
          return true;
        }
        return false;
      } catch (error) {
        console.error(`Error adding item to ${type}:`, error);
        await loadContent();
        return false;
      }
    },
    [storageKey, type, loadContent, notifyListeners],
  );

  const removeItem = useCallback(
    async (itemId: number) => {
      try {
        const newContent = globalState[storageKey].content.filter(
          item => item.id !== itemId,
        );

        // Update global state and notify listeners
        globalState[storageKey].content = newContent;
        notifyListeners();

        // Update storage
        await AsyncStorage.setItem(storageKey, JSON.stringify(newContent));
      } catch (error) {
        console.error(`Error removing item from ${type}:`, error);
        await loadContent();
      }
    },
    [storageKey, type, loadContent, notifyListeners],
  );

  const clearContent = useCallback(async () => {
    try {
      // Update global state and notify listeners
      globalState[storageKey].content = [];
      notifyListeners();

      // Update storage
      await AsyncStorage.removeItem(storageKey);
    } catch (error) {
      console.error(`Error clearing ${type}:`, error);
      await loadContent();
    }
  }, [storageKey, type, loadContent, notifyListeners]);

  const isItemInContent = useCallback(
    (itemId: number) => {
      return globalState[storageKey].content.some(item => item.id === itemId);
    },
    [storageKey],
  );

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  return {
    content,
    isLoading,
    addItem,
    removeItem,
    clearContent,
    isItemInContent,
    refresh: loadContent,
  };
};
