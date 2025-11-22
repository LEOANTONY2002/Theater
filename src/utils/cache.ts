import {Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type CacheEntry<T> = {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
};

class CacheManager {
  private static instance: CacheManager;
  private memoryCache: Map<string, CacheEntry<any>>;
  private readonly PREFIX = '@cache_';
  private readonly MEMORY_CACHE_LIMIT = 100; // Max items in memory cache (increased from 50)
  private readonly STORAGE_CACHE_LIMIT = 500; // Max items in AsyncStorage (increased from 200 to allow more AI caches)
  private cleanupScheduled = false;

  private constructor() {
    this.memoryCache = new Map();
    // Schedule cleanup on initialization
    this.scheduleCleanup();
  }

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  private getKey(prefix: string, key: string): string {
    return `${this.PREFIX}${prefix}_${key}`;
  }

  async set<T>(
    prefix: string,
    key: string,
    data: T,
    ttl: number = 24 * 60 * 60 * 1000,
  ): Promise<void> {
    const cacheKey = this.getKey(prefix, key);
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };

    // Update memory cache
    this.memoryCache.set(cacheKey, entry);

    // Enforce memory limit using LRU
    if (this.memoryCache.size > this.MEMORY_CACHE_LIMIT) {
      // Remove oldest entry (LRU)
      const oldestKey = this.memoryCache.keys().next().value;
      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
      }
    }

    // NOTE: We no longer persist AI caches to AsyncStorage
    // TanStack Query already handles in-memory caching with proper TTL
    // AsyncStorage should only be used for user data (watchlists, preferences, etc.)
  }

  async get<T>(prefix: string, key: string): Promise<T | null> {
    const cacheKey = this.getKey(prefix, key);
    const now = Date.now();

    // Check memory cache only (no AsyncStorage lookup)
    const memoryEntry = this.memoryCache.get(cacheKey);
    if (memoryEntry) {
      if (now - memoryEntry.timestamp < memoryEntry.ttl) {
        return memoryEntry.data as T;
      }
      // Expired, remove from memory
      this.memoryCache.delete(cacheKey);
    }

    return null;
  }

  async clear(prefix?: string): Promise<void> {
    try {
      if (prefix) {
        // Clear specific prefix
        const keys = await AsyncStorage.getAllKeys();
        const keysToRemove = keys.filter(key =>
          key.startsWith(`${this.PREFIX}${prefix}_`),
        );
        await AsyncStorage.multiRemove(keysToRemove);

        // Clear from memory cache
        keysToRemove.forEach(key => this.memoryCache.delete(key));
      } else {
        // Clear all caches
        const keys = await AsyncStorage.getAllKeys();
        const cacheKeys = keys.filter(key => key.startsWith(this.PREFIX));
        await AsyncStorage.multiRemove(cacheKeys);
        this.memoryCache.clear();
      }
    } catch (error) {}
  }

  private async cleanupOldAsyncStorageEntries(): Promise<void> {
    // One-time cleanup of old @cache_ entries from AsyncStorage
    // This removes legacy AI cache entries that were persisted before this fix
    try {
      const keys = await AsyncStorage.getAllKeys();
      const oldCacheKeys = keys.filter(key => key.startsWith(this.PREFIX));

      if (oldCacheKeys.length > 0) {
        await AsyncStorage.multiRemove(oldCacheKeys);
      }
    } catch (error) {}
  }

  private scheduleCleanup(): void {
    if (this.cleanupScheduled) return;
    this.cleanupScheduled = true;

    // Run one-time cleanup of old AsyncStorage entries
    this.cleanupOldAsyncStorageEntries();
  }
}

export const cache = CacheManager.getInstance();

export const CACHE_KEYS = {
  AI_SIMILAR: 'ai_similar',
  AI_TRIVIA: 'ai_trivia',
  AI_CHAT: 'ai_chat',
  AI_RECOMMENDATION: 'ai_recommendation',
} as const;
