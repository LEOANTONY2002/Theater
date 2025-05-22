import {useState, useEffect, useCallback} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Movie} from '../types/movie';
import {TVShow} from '../types/tvshow';
import {ContentItem} from '../components/MovieList';

const STORAGE_KEYS = {
  WATCHLIST: '@user_watchlist',
  HISTORY: '@user_history',
};

type ContentType = 'watchlist' | 'history';

// Create a global state object to share between hook instances
const globalState: {
  [key: string]: {
    content: ContentItem[];
    listeners: Set<() => void>;
  };
} = {};

export const useUserContent = (type: ContentType) => {
  const storageKey =
    STORAGE_KEYS[type.toUpperCase() as keyof typeof STORAGE_KEYS];

  // Initialize global state for this content type if it doesn't exist
  if (!globalState[storageKey]) {
    globalState[storageKey] = {
      content: [],
      listeners: new Set(),
    };
  }

  const [content, setContent] = useState<ContentItem[]>(
    globalState[storageKey].content,
  );
  const [isLoading, setIsLoading] = useState(true);

  // Add this instance's setContent to listeners
  useEffect(() => {
    const updateContent = () => setContent(globalState[storageKey].content);
    globalState[storageKey].listeners.add(updateContent);
    return () => {
      globalState[storageKey].listeners.delete(updateContent);
    };
  }, [storageKey]);

  // Notify all listeners of content changes
  const notifyListeners = useCallback(() => {
    globalState[storageKey].listeners.forEach(listener => listener());
  }, [storageKey]);

  const loadContent = useCallback(async () => {
    try {
      setIsLoading(true);
      const storedContent = await AsyncStorage.getItem(storageKey);
      const newContent = storedContent ? JSON.parse(storedContent) : [];
      globalState[storageKey].content = newContent;
      notifyListeners();
    } catch (error) {
      console.error(`Error loading ${type}:`, error);
    } finally {
      setIsLoading(false);
    }
  }, [storageKey, type, notifyListeners]);

  const addItem = useCallback(
    async (item: Movie | TVShow, itemType: 'movie' | 'tv') => {
      try {
        const contentItem: ContentItem = {
          ...item,
          type: itemType,
        } as ContentItem;

        const currentContent = globalState[storageKey].content;
        let newContent: ContentItem[];

        if (type === 'history') {
          newContent = [
            contentItem,
            ...currentContent.filter(
              existingItem => existingItem.id !== item.id,
            ),
          ];
        } else {
          if (
            !currentContent.some(existingItem => existingItem.id === item.id)
          ) {
            newContent = [...currentContent, contentItem];
          } else {
            return false;
          }
        }

        // Update global state and notify listeners
        globalState[storageKey].content = newContent;
        notifyListeners();

        // Update storage
        await AsyncStorage.setItem(storageKey, JSON.stringify(newContent));
        return true;
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
