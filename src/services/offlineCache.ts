import AsyncStorage from '@react-native-async-storage/async-storage';
import {queryClient} from './queryClient';
import {Movie} from '../types/movie';
import {TVShow} from '../types/tvshow';
import FastImage from 'react-native-fast-image';
import {getImageUrl} from './tmdb';

export interface CachedContent {
  id: string;
  data: any;
  timestamp: number;
  type: 'movie' | 'tv' | 'person' | 'search' | 'discover';
  expiresAt: number;
}

export interface OfflineCacheStats {
  totalItems: number;
  totalSize: number;
  oldestItem: number;
  newestItem: number;
  itemsByType: Record<string, number>;
}

class OfflineCacheService {
  private readonly CACHE_PREFIX = '@theater_offline_cache_';
  private readonly CACHE_INDEX_KEY = '@theater_cache_index';
  private readonly MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly MAX_ITEMS = 1000;
  private readonly DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

  // Different TTL for different content types
  private readonly TTL_CONFIG = {
    movie: 7 * 24 * 60 * 60 * 1000, // 7 days
    tv: 7 * 24 * 60 * 60 * 1000, // 7 days
    person: 30 * 24 * 60 * 60 * 1000, // 30 days (person data changes less)
    search: 24 * 60 * 60 * 1000, // 1 day
    discover: 6 * 60 * 60 * 1000, // 6 hours
    trending: 2 * 60 * 60 * 1000, // 2 hours
    popular: 12 * 60 * 60 * 1000, // 12 hours
    top_rated: 24 * 60 * 60 * 1000, // 1 day
    upcoming: 6 * 60 * 60 * 1000, // 6 hours
  };

  private cacheIndex: Set<string> = new Set();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const indexData = await AsyncStorage.getItem(this.CACHE_INDEX_KEY);
      if (indexData) {
        const index = JSON.parse(indexData);
        this.cacheIndex = new Set(index);
      }
      this.initialized = true;

      // Clean up expired items on initialization
      await this.cleanupExpiredItems();
    } catch (error) {
      console.error('Failed to initialize offline cache:', error);
      this.cacheIndex = new Set();
      this.initialized = true;
    }
  }

  private generateCacheKey(type: string, identifier: string): string {
    return `${this.CACHE_PREFIX}${type}_${identifier}`;
  }

  private getTTL(type: string): number {
    return (
      this.TTL_CONFIG[type as keyof typeof this.TTL_CONFIG] || this.DEFAULT_TTL
    );
  }

  async set(
    type: string,
    identifier: string,
    data: any,
    customTTL?: number,
  ): Promise<void> {
    await this.initialize();

    const key = this.generateCacheKey(type, identifier);
    const ttl = customTTL || this.getTTL(type);
    const now = Date.now();

    const cachedItem: CachedContent = {
      id: identifier,
      data,
      timestamp: now,
      type: type as any,
      expiresAt: now + ttl,
    };

    try {
      // Check cache size before adding
      await this.ensureCacheSize();

      await AsyncStorage.setItem(key, JSON.stringify(cachedItem));
      this.cacheIndex.add(key);
      await this.updateCacheIndex();

      console.log(
        `Cached ${type}:${identifier} (expires in ${Math.round(
          ttl / (60 * 1000),
        )} minutes)`,
      );
    } catch (error) {
      console.error('Failed to cache item:', error);
    }
  }

  async get(type: string, identifier: string): Promise<any | null> {
    await this.initialize();

    const key = this.generateCacheKey(type, identifier);

    try {
      const cachedData = await AsyncStorage.getItem(key);
      if (!cachedData) return null;

      const cachedItem: CachedContent = JSON.parse(cachedData);

      // Check if expired
      if (Date.now() > cachedItem.expiresAt) {
        await this.remove(type, identifier);
        return null;
      }

      console.log(`Cache hit for ${type}:${identifier}`);
      return cachedItem.data;
    } catch (error) {
      console.error('Failed to get cached item:', error);
      return null;
    }
  }

  async remove(type: string, identifier: string): Promise<void> {
    await this.initialize();

    const key = this.generateCacheKey(type, identifier);

    try {
      await AsyncStorage.removeItem(key);
      this.cacheIndex.delete(key);
      await this.updateCacheIndex();
    } catch (error) {
      console.error('Failed to remove cached item:', error);
    }
  }

  async has(type: string, identifier: string): Promise<boolean> {
    await this.initialize();

    const key = this.generateCacheKey(type, identifier);
    return this.cacheIndex.has(key);
  }

  async hasCachedContent(): Promise<boolean> {
    await this.initialize();
    return this.cacheIndex.size > 0;
  }

  async clear(): Promise<void> {
    await this.initialize();

    try {
      const keys = Array.from(this.cacheIndex);
      await AsyncStorage.multiRemove(keys);
      await AsyncStorage.removeItem(this.CACHE_INDEX_KEY);
      this.cacheIndex.clear();
      console.log('Offline cache cleared');
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  async getStats(): Promise<OfflineCacheStats> {
    await this.initialize();

    const stats: OfflineCacheStats = {
      totalItems: 0,
      totalSize: 0,
      oldestItem: Date.now(),
      newestItem: 0,
      itemsByType: {},
    };

    try {
      const keys = Array.from(this.cacheIndex);
      const items = await AsyncStorage.multiGet(keys);

      for (const [key, value] of items) {
        if (value) {
          try {
            const cachedItem: CachedContent = JSON.parse(value);
            stats.totalItems++;
            stats.totalSize += value.length;
            stats.oldestItem = Math.min(stats.oldestItem, cachedItem.timestamp);
            stats.newestItem = Math.max(stats.newestItem, cachedItem.timestamp);
            stats.itemsByType[cachedItem.type] =
              (stats.itemsByType[cachedItem.type] || 0) + 1;
          } catch (error) {
            // Invalid cached item, remove it
            await AsyncStorage.removeItem(key);
            this.cacheIndex.delete(key);
          }
        }
      }

      await this.updateCacheIndex();
    } catch (error) {
      console.error('Failed to get cache stats:', error);
    }

    return stats;
  }

  private async updateCacheIndex(): Promise<void> {
    try {
      const indexArray = Array.from(this.cacheIndex);
      await AsyncStorage.setItem(
        this.CACHE_INDEX_KEY,
        JSON.stringify(indexArray),
      );
    } catch (error) {
      console.error('Failed to update cache index:', error);
    }
  }

  private async ensureCacheSize(): Promise<void> {
    const stats = await this.getStats();

    if (
      stats.totalItems >= this.MAX_ITEMS ||
      stats.totalSize >= this.MAX_CACHE_SIZE
    ) {
      console.log('Cache size limit reached, cleaning up...');
      await this.cleanupOldestItems(Math.floor(this.MAX_ITEMS * 0.3)); // Remove 30% of items
    }
  }

  private async cleanupExpiredItems(): Promise<void> {
    const now = Date.now();
    const keys = Array.from(this.cacheIndex);
    const expiredKeys: string[] = [];

    try {
      const items = await AsyncStorage.multiGet(keys);

      for (const [key, value] of items) {
        if (value) {
          try {
            const cachedItem: CachedContent = JSON.parse(value);
            if (now > cachedItem.expiresAt) {
              expiredKeys.push(key);
            }
          } catch (error) {
            // Invalid item, mark for removal
            expiredKeys.push(key);
          }
        }
      }

      if (expiredKeys.length > 0) {
        await AsyncStorage.multiRemove(expiredKeys);
        expiredKeys.forEach(key => this.cacheIndex.delete(key));
        await this.updateCacheIndex();
        console.log(`Cleaned up ${expiredKeys.length} expired cache items`);
      }
    } catch (error) {
      console.error('Failed to cleanup expired items:', error);
    }
  }

  private async cleanupOldestItems(count: number): Promise<void> {
    try {
      const keys = Array.from(this.cacheIndex);
      const items = await AsyncStorage.multiGet(keys);

      // Sort by timestamp (oldest first)
      const sortedItems = items
        .filter(([_, value]) => value)
        .map(([key, value]) => {
          try {
            const cachedItem: CachedContent = JSON.parse(value!);
            return {key, timestamp: cachedItem.timestamp};
          } catch {
            return {key, timestamp: 0};
          }
        })
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(0, count);

      const keysToRemove = sortedItems.map(item => item.key);

      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
        keysToRemove.forEach(key => this.cacheIndex.delete(key));
        await this.updateCacheIndex();
        console.log(`Cleaned up ${keysToRemove.length} oldest cache items`);
      }
    } catch (error) {
      console.error('Failed to cleanup oldest items:', error);
    }
  }

  // Utility methods for specific content types
  async cacheImage(url: string): Promise<void> {
    try {
      await FastImage.preload([{uri: url}]);
    } catch (error) {
      console.error('Failed to cache image:', error);
    }
  }

  async cacheMovie(movie: Movie): Promise<void> {
    await this.set('movie', movie.id.toString(), movie);
    if (movie.poster_path) {
      const imageUrl = getImageUrl(movie.poster_path, 'w500');
      await this.cacheImage(imageUrl);
    }
    if (movie.backdrop_path) {
      const imageUrl = getImageUrl(movie.backdrop_path, 'w500');
      await this.cacheImage(imageUrl);
    }
  }

  async getCachedMovie(movieId: number): Promise<Movie | null> {
    return await this.get('movie', movieId.toString());
  }

  async cacheTVShow(show: TVShow): Promise<void> {
    await this.set('tv', show.id.toString(), show);
    if (show.poster_path) {
      const imageUrl = getImageUrl(show.poster_path, 'w500');
      await this.cacheImage(imageUrl);
    }
    if (show.backdrop_path) {
      const imageUrl = getImageUrl(show.backdrop_path, 'w500');
      await this.cacheImage(imageUrl);
    }
  }

  async getCachedTVShow(showId: number): Promise<TVShow | null> {
    return await this.get('tv', showId.toString());
  }

  async cacheSearchResults(
    query: string,
    type: string,
    results: any,
  ): Promise<void> {
    const identifier = `${type}_${query}`;
    await this.set('search', identifier, results, this.TTL_CONFIG.search);
  }

  async getCachedSearchResults(
    query: string,
    type: string,
  ): Promise<any | null> {
    const identifier = `${type}_${query}`;
    return await this.get('search', identifier);
  }

  async cacheDiscoverResults(
    filters: any,
    type: string,
    results: any,
  ): Promise<void> {
    const identifier = `${type}_${JSON.stringify(filters)}`;
    await this.set('discover', identifier, results, this.TTL_CONFIG.discover);
  }

  async getCachedDiscoverResults(
    filters: any,
    type: string,
  ): Promise<any | null> {
    const identifier = `${type}_${JSON.stringify(filters)}`;
    return await this.get('discover', identifier);
  }

  // Batch operations for better performance
  async cacheMovieList(movies: Movie[], listType: string): Promise<void> {
    const promises = movies.map(movie => this.cacheMovie(movie));
    await Promise.all(promises);

    // Also cache the list itself
    await this.set(listType, 'list', movies, this.getTTL(listType));
  }

  async cacheTVShowList(shows: TVShow[], listType: string): Promise<void> {
    const promises = shows.map(show => this.cacheTVShow(show));
    await Promise.all(promises);

    // Also cache the list itself
    await this.set(listType, 'list', shows, this.getTTL(listType));
  }

  async getCachedMovieList(listType: string): Promise<Movie[] | null> {
    return await this.get(listType, 'list');
  }

  async getCachedTVShowList(listType: string): Promise<TVShow[] | null> {
    return await this.get(listType, 'list');
  }
}

export const offlineCache = new OfflineCacheService();

// Auto-cleanup on app start
offlineCache.initialize();
