import {queryClient} from '../services/queryClient';
import {ContentItem} from '../components/MovieList';
import {Movie} from '../types/movie';
import {TVShow} from '../types/tvshow';
import {getRealm} from '../database/realm';
import Realm from 'realm';

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
      const realm = getRealm();
      const watchlists = realm.objects('Watchlist').sorted('createdAt', true);
      return Array.from(watchlists).map(wl => ({
        id: wl._id as string,
        name: wl.name as string,
        createdAt: (wl.createdAt as Date).toISOString(),
        updatedAt: (wl.updatedAt as Date).toISOString(),
        itemCount: wl.itemCount as number,
      }));
    } catch (error) {
      return [];
    }
  }

  async createWatchlist(name: string): Promise<Watchlist> {
    try {
      const realm = getRealm();
      const id = `watchlist_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      const now = new Date();

      let newWatchlist: any;
      realm.write(() => {
        newWatchlist = realm.create('Watchlist', {
          _id: id,
          name,
          createdAt: now,
          updatedAt: now,
          itemCount: 0,
        });
      });

      // Invalidate queries
      queryClient.invalidateQueries({queryKey: ['watchlists']});
      this.notifyListeners();

      return {
        id,
        name,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        itemCount: 0,
      };
    } catch (error) {
      throw error;
    }
  }

  async updateWatchlist(id: string, name: string): Promise<void> {
    try {
      const realm = getRealm();
      const watchlist = realm.objectForPrimaryKey('Watchlist', id);

      if (watchlist) {
        realm.write(() => {
          watchlist.name = name;
          watchlist.updatedAt = new Date();
        });

        // Invalidate queries
        queryClient.invalidateQueries({queryKey: ['watchlists']});
        queryClient.invalidateQueries({queryKey: ['watchlist', id]});
        this.notifyListeners();
      }
    } catch (error) {
      throw error;
    }
  }

  async deleteWatchlist(id: string): Promise<void> {
    try {
      const realm = getRealm();
      const watchlist = realm.objectForPrimaryKey('Watchlist', id);

      if (!watchlist) {
        return;
      }

      realm.write(() => {
        // Remove all items from this watchlist
        const items = realm
          .objects('WatchlistItem')
          .filtered('watchlistId == $0', id);
        realm.delete(items);

        // Remove the watchlist itself
        realm.delete(watchlist);
      });

      // Invalidate queries
      queryClient.invalidateQueries({queryKey: ['watchlists']});
      queryClient.invalidateQueries({queryKey: ['watchlist', id]});
      this.notifyListeners();
    } catch (error) {
      throw error;
    }
  }

  async getWatchlistItems(watchlistId: string): Promise<WatchlistItem[]> {
    try {
      const realm = getRealm();
      const items = realm
        .objects('WatchlistItem')
        .filtered('watchlistId == $0', watchlistId)
        .sorted('addedAt', true);

      return Array.from(items).map(item => {
        // Get full content data from Movie/TVShow table
        const content =
          item.type === 'movie'
            ? realm.objectForPrimaryKey('Movie', item.contentId)
            : realm.objectForPrimaryKey('TVShow', item.contentId);

        if (content) {
          // Return full data from Movie/TVShow table
          return {
            id: item.contentId as number,
            title: content.title as string | undefined,
            name: content.name as string | undefined,
            originalTitle: (content.original_title || content.original_name) as
              | string
              | undefined,
            overview: content.overview as string,
            poster_path: content.poster_path as string,
            backdrop_path: content.backdrop_path as string,
            vote_average: content.vote_average as number,
            release_date: content.release_date as string | undefined,
            first_air_date: content.first_air_date as string | undefined,
            genre_ids: content.genre_ids
              ? Array.isArray(content.genre_ids)
                ? Array.from(content.genre_ids)
                : []
              : [],
            origin_country: content.origin_country
              ? Array.isArray(content.origin_country)
                ? Array.from(content.origin_country)
                : []
              : undefined,
            popularity: content.popularity as number,
            original_language: content.original_language as string,
            type: item.type as 'movie' | 'tv',
            addedAt: (item.addedAt as Date).toISOString(),
          };
        }

        // Fallback if content not in database yet
        return {
          id: item.contentId as number,
          overview: '',
          poster_path: '',
          backdrop_path: '',
          vote_average: 0,
          genre_ids: [],
          popularity: 0,
          original_language: '',
          type: item.type as 'movie' | 'tv',
          addedAt: (item.addedAt as Date).toISOString(),
        };
      });
    } catch (error) {
      return [];
    }
  }

  async addItemToWatchlist(
    watchlistId: string,
    item: Movie | TVShow,
    itemType: 'movie' | 'tv',
  ): Promise<boolean> {
    try {
      const realm = getRealm();

      realm.write(() => {
        // Add item to WatchlistItem table (just reference)
        realm.create('WatchlistItem', {
          _id: new Realm.BSON.ObjectId(),
          watchlistId,
          contentId: item.id,
          type: itemType,
          addedAt: new Date(),
        });

        // Update watchlist count
        const watchlist = realm.objectForPrimaryKey('Watchlist', watchlistId);
        if (watchlist) {
          watchlist.itemCount = (watchlist.itemCount as number) + 1;
          watchlist.updatedAt = new Date();
        }

        // Store full content in Movie/TVShow table if not exists
        const existingContent = realm.objectForPrimaryKey(
          itemType === 'movie' ? 'Movie' : 'TVShow',
          item.id,
        );

        if (!existingContent) {
          if (itemType === 'movie') {
            const movie = item as Movie;
            realm.create(
              'Movie',
              {
                _id: movie.id,
                title: movie.title || '',
                original_title: movie.title || '',
                overview: movie.overview || '',
                poster_path: movie.poster_path,
                backdrop_path: movie.backdrop_path,
                vote_average: movie.vote_average || 0,
                vote_count: 0,
                release_date: movie.release_date,
                runtime: 0,
                genres: [],
                genre_ids: movie.genre_ids || [],
                original_language: movie.original_language || '',
                popularity: movie.popularity || 0,
                adult: false,
                cached_at: new Date(),
                has_full_details: false,
              },
              Realm.UpdateMode.Modified,
            );
          } else {
            const tvShow = item as TVShow;
            realm.create(
              'TVShow',
              {
                _id: tvShow.id,
                name: tvShow.name || '',
                original_name: tvShow.name || '',
                overview: tvShow.overview || '',
                poster_path: tvShow.poster_path,
                backdrop_path: tvShow.backdrop_path,
                vote_average: tvShow.vote_average || 0,
                vote_count: 0,
                first_air_date: tvShow.first_air_date,
                genres: [],
                genre_ids: tvShow.genre_ids || [],
                original_language: tvShow.original_language || '',
                popularity: tvShow.popularity || 0,
                origin_country: tvShow.origin_country || [],
                cached_at: new Date(),
                has_full_details: false,
              },
              Realm.UpdateMode.Modified,
            );
          }
        }
      });

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
      return false;
    }
  }

  async removeItemFromWatchlist(
    watchlistId: string,
    itemId: number,
  ): Promise<void> {
    try {
      const realm = getRealm();

      realm.write(() => {
        // Find and remove the item
        const items = realm
          .objects('WatchlistItem')
          .filtered(
            'watchlistId == $0 AND contentId == $1',
            watchlistId,
            itemId,
          );

        if (items.length > 0) {
          realm.delete(items[0]);

          // Update watchlist count
          const watchlist = realm.objectForPrimaryKey('Watchlist', watchlistId);
          if (watchlist) {
            watchlist.itemCount = Math.max(
              0,
              (watchlist.itemCount as number) - 1,
            );
            watchlist.updatedAt = new Date();
          }
        }
      });

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
    } catch (error) {}
  }

  async isItemInWatchlist(
    watchlistId: string,
    itemId: number,
  ): Promise<boolean> {
    try {
      const realm = getRealm();
      const items = realm
        .objects('WatchlistItem')
        .filtered('watchlistId == $0 AND contentId == $1', watchlistId, itemId);
      return items.length > 0;
    } catch (error) {
      return false;
    }
  }

  async isItemInAnyWatchlist(itemId: number): Promise<boolean> {
    try {
      const realm = getRealm();
      const items = realm
        .objects('WatchlistItem')
        .filtered('contentId == $0', itemId);
      return items.length > 0;
    } catch (error) {
      return false;
    }
  }

  async getWatchlistContainingItem(itemId: number): Promise<string | null> {
    try {
      const realm = getRealm();
      const items = realm
        .objects('WatchlistItem')
        .filtered('contentId == $0', itemId);

      if (items.length > 0) {
        return items[0].watchlistId as string;
      }
      return null;
    } catch (error) {
      return null;
    }
  }
  async reorderWatchlists(ids: string[]): Promise<void> {
    try {
      const realm = getRealm();
      const now = Date.now();
      realm.write(() => {
        ids.forEach((id, index) => {
          const watchlist = realm.objectForPrimaryKey('Watchlist', id);
          if (watchlist) {
            // Update createdAt to reflect new order
            // Sorting is descending, so earlier items in list (smaller index)
            // should have later timestamps (larger value)
            watchlist.createdAt = new Date(now - index * 1000);
          }
        });
      });
      queryClient.invalidateQueries({queryKey: ['watchlists']});
      this.notifyListeners();
    } catch (error) {
      console.error('[WatchlistManager] Error reordering watchlists:', error);
      throw error;
    }
  }

  async deleteAllWatchlists(): Promise<void> {
    try {
      const realm = getRealm();
      realm.write(() => {
        const allWatchlists = realm.objects('Watchlist');
        const allItems = realm.objects('WatchlistItem');
        realm.delete(allItems);
        realm.delete(allWatchlists);
      });
      queryClient.invalidateQueries({queryKey: ['watchlists']});
      this.notifyListeners();
    } catch (error) {
      console.error('[WatchlistManager] Error deleting all watchlists:', error);
      throw error;
    }
  }

  async getAllWatchlistsExportData(): Promise<
    Array<{name: string; items: {id: number; type: 'movie' | 'tv'}[]}>
  > {
    try {
      const realm = getRealm();
      // Get all watchlists
      const watchlists = realm.objects('Watchlist').sorted('createdAt', true);
      const allData: Array<{
        name: string;
        items: {id: number; type: 'movie' | 'tv'}[];
      }> = [];

      for (const wl of watchlists) {
        const wId = wl._id as string;
        const items = realm
          .objects('WatchlistItem')
          .filtered('watchlistId == $0', wId);
        allData.push({
          name: wl.name as string,
          items: Array.from(items).map(i => ({
            id: i.contentId as number,
            type: i.type as 'movie' | 'tv',
          })),
        });
      }
      return allData;
    } catch (error) {
      console.error('[WatchlistManager] Export error', error);
      return [];
    }
  }
}

export const watchlistManager = new WatchlistManager();
