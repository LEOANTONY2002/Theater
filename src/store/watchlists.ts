import AsyncStorage from '@react-native-async-storage/async-storage';
import {queryClient} from '../services/queryClient';
import {ContentItem} from '../components/MovieList';
import {Movie} from '../types/movie';
import {TVShow} from '../types/tvshow';

export interface Watchlist {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
}

export interface WatchlistItem {
  id: number;
  title?: string;
  name?: string;
  originalTitle?: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids: number[];
  origin_country?: string[];
  popularity: number;
  original_language: string;
  type: 'movie' | 'tv';
  addedAt: string;
}

const STORAGE_KEYS = {
  WATCHLISTS: '@user_watchlists',
  WATCHLIST_ITEMS: '@user_watchlist_items',
} as const;

class WatchlistManager {
  private listeners: (() => void)[] = [];

  addChangeListener(listener: () => void) {
    this.listeners.push(listener);
  }

  removeChangeListener(listener: () => void) {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  async getWatchlists(): Promise<Watchlist[]> {
    try {
      const watchlistsJson = await AsyncStorage.getItem(
        STORAGE_KEYS.WATCHLISTS,
      );
      if (!watchlistsJson) {
        // Create default watchlist if none exist
        const defaultWatchlist: Watchlist = {
          id: 'default',
          name: 'My Watchlist',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          itemCount: 0,
        };
        await this.saveWatchlists([defaultWatchlist]);
        return [defaultWatchlist];
      }
      return JSON.parse(watchlistsJson);
    } catch (error) {
      console.error('Error loading watchlists:', error);
      return [];
    }
  }

  private async saveWatchlists(watchlists: Watchlist[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.WATCHLISTS,
        JSON.stringify(watchlists),
      );
    } catch (error) {
      console.error('Error saving watchlists:', error);
    }
  }

  async createWatchlist(name: string): Promise<Watchlist> {
    try {
      const watchlists = await this.getWatchlists();
      const newWatchlist: Watchlist = {
        id: `watchlist_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        itemCount: 0,
      };

      watchlists.push(newWatchlist);
      await this.saveWatchlists(watchlists);

      // Invalidate queries
      queryClient.invalidateQueries({queryKey: ['watchlists']});
      this.notifyListeners();

      return newWatchlist;
    } catch (error) {
      console.error('Error creating watchlist:', error);
      throw error;
    }
  }

  async updateWatchlist(id: string, name: string): Promise<void> {
    try {
      const watchlists = await this.getWatchlists();
      const index = watchlists.findIndex(w => w.id === id);
      if (index !== -1) {
        watchlists[index].name = name;
        watchlists[index].updatedAt = new Date().toISOString();
        await this.saveWatchlists(watchlists);

        // Invalidate queries
        queryClient.invalidateQueries({queryKey: ['watchlists']});
        queryClient.invalidateQueries({queryKey: ['watchlist', id]});
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Error updating watchlist:', error);
      throw error;
    }
  }

  async deleteWatchlist(id: string): Promise<void> {
    try {
      console.log('Attempting to delete watchlist:', id);

      const watchlists = await this.getWatchlists();
      console.log('Current watchlists:', watchlists.length);

      // Check if watchlist exists
      const watchlistExists = watchlists.find(w => w.id === id);
      if (!watchlistExists) {
        console.log('Watchlist not found:', id);
        return;
      }

      console.log(
        'Found watchlist to delete:',
        watchlistExists.name,
        'with',
        watchlistExists.itemCount,
        'items',
      );

      // Remove all items from this watchlist first
      const keys = await AsyncStorage.getAllKeys();
      const watchlistItemKeys = keys.filter(key =>
        key.startsWith(`${STORAGE_KEYS.WATCHLIST_ITEMS}_${id}_`),
      );
      console.log('Found', watchlistItemKeys.length, 'items to remove');

      if (watchlistItemKeys.length > 0) {
        await AsyncStorage.multiRemove(watchlistItemKeys);
        console.log('Removed all items from watchlist');
      }

      // Remove the watchlist itself
      const filteredWatchlists = watchlists.filter(w => w.id !== id);
      await this.saveWatchlists(filteredWatchlists);
      console.log('Removed watchlist from list');

      // Invalidate queries
      queryClient.invalidateQueries({queryKey: ['watchlists']});
      queryClient.invalidateQueries({queryKey: ['watchlist', id]});
      this.notifyListeners();

      console.log('Watchlist deletion completed successfully');
    } catch (error) {
      console.error('Error deleting watchlist:', error);
      throw error;
    }
  }

  async getWatchlistItems(watchlistId: string): Promise<WatchlistItem[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const watchlistItemKeys = keys.filter(key =>
        key.startsWith(`${STORAGE_KEYS.WATCHLIST_ITEMS}_${watchlistId}_`),
      );

      if (watchlistItemKeys.length === 0) {
        return [];
      }

      const items = await AsyncStorage.multiGet(watchlistItemKeys);
      return items
        .map(([_, value]) => (value ? JSON.parse(value) : null))
        .filter(item => item !== null)
        .sort(
          (a, b) =>
            new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime(),
        );
    } catch (error) {
      console.error('Error loading watchlist items:', error);
      return [];
    }
  }

  async addItemToWatchlist(
    watchlistId: string,
    item: Movie | TVShow,
    itemType: 'movie' | 'tv',
  ): Promise<boolean> {
    try {
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

      const watchlistItem: WatchlistItem = {
        ...contentItem,
        addedAt: new Date().toISOString(),
      };

      // Store the item
      const itemKey = `${STORAGE_KEYS.WATCHLIST_ITEMS}_${watchlistId}_${item.id}`;
      await AsyncStorage.setItem(itemKey, JSON.stringify(watchlistItem));

      // Update watchlist count and timestamp
      const watchlists = await this.getWatchlists();
      const watchlistIndex = watchlists.findIndex(w => w.id === watchlistId);
      if (watchlistIndex !== -1) {
        watchlists[watchlistIndex].itemCount += 1;
        watchlists[watchlistIndex].updatedAt = new Date().toISOString();
        await this.saveWatchlists(watchlists);
      }

      // Invalidate queries
      queryClient.invalidateQueries({queryKey: ['watchlists']});
      queryClient.invalidateQueries({queryKey: ['watchlist', watchlistId]});
      queryClient.invalidateQueries({
        queryKey: ['isItemInAnyWatchlist', item.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['watchlistContainingItem', item.id],
      });
      this.notifyListeners();

      return true;
    } catch (error) {
      console.error('Error adding item to watchlist:', error);
      return false;
    }
  }

  async removeItemFromWatchlist(
    watchlistId: string,
    itemId: number,
  ): Promise<void> {
    try {
      const itemKey = `${STORAGE_KEYS.WATCHLIST_ITEMS}_${watchlistId}_${itemId}`;
      await AsyncStorage.removeItem(itemKey);

      // Update watchlist count and timestamp
      const watchlists = await this.getWatchlists();
      const watchlistIndex = watchlists.findIndex(w => w.id === watchlistId);
      if (watchlistIndex !== -1) {
        watchlists[watchlistIndex].itemCount = Math.max(
          0,
          watchlists[watchlistIndex].itemCount - 1,
        );
        watchlists[watchlistIndex].updatedAt = new Date().toISOString();
        await this.saveWatchlists(watchlists);
      }

      // Invalidate queries
      queryClient.invalidateQueries({queryKey: ['watchlists']});
      queryClient.invalidateQueries({queryKey: ['watchlist', watchlistId]});
      queryClient.invalidateQueries({
        queryKey: ['isItemInAnyWatchlist', itemId],
      });
      queryClient.invalidateQueries({
        queryKey: ['watchlistContainingItem', itemId],
      });
      this.notifyListeners();
    } catch (error) {
      console.error('Error removing item from watchlist:', error);
    }
  }

  async isItemInWatchlist(
    watchlistId: string,
    itemId: number,
  ): Promise<boolean> {
    try {
      const itemKey = `${STORAGE_KEYS.WATCHLIST_ITEMS}_${watchlistId}_${itemId}`;
      const item = await AsyncStorage.getItem(itemKey);
      return item !== null;
    } catch (error) {
      console.error('Error checking if item is in watchlist:', error);
      return false;
    }
  }

  async isItemInAnyWatchlist(itemId: number): Promise<boolean> {
    try {
      const watchlists = await this.getWatchlists();
      for (const watchlist of watchlists) {
        const isInWatchlist = await this.isItemInWatchlist(
          watchlist.id,
          itemId,
        );
        if (isInWatchlist) {
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error checking if item is in any watchlist:', error);
      return false;
    }
  }

  async getWatchlistContainingItem(itemId: number): Promise<string | null> {
    try {
      const watchlists = await this.getWatchlists();
      for (const watchlist of watchlists) {
        const isInWatchlist = await this.isItemInWatchlist(
          watchlist.id,
          itemId,
        );
        if (isInWatchlist) {
          return watchlist.id;
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting watchlist containing item:', error);
      return null;
    }
  }
}

export const watchlistManager = new WatchlistManager();
