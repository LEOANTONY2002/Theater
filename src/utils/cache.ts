import { Platform } from 'react-native';
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
  private readonly MEMORY_CACHE_LIMIT = 50; // Max items in memory cache

  private constructor() {
    this.memoryCache = new Map();
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
    ttl: number = 24 * 60 * 60 * 1000
  ): Promise<void> {
    const cacheKey = this.getKey(prefix, key);
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };

    // Update memory cache
    this.memoryCache.set(cacheKey, entry);

    // Enforce memory limit
    if (this.memoryCache.size > this.MEMORY_CACHE_LIMIT) {
      // Remove oldest entry
      const oldestKey = this.memoryCache.keys().next().value;
      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
      }
    }

    // Persist to storage
    try {
      await AsyncStorage.setItem(cacheKey, JSON.stringify(entry));
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  }

  async get<T>(prefix: string, key: string): Promise<T | null> {
    const cacheKey = this.getKey(prefix, key);
    const now = Date.now();

    // Check memory cache first
    const memoryEntry = this.memoryCache.get(cacheKey);
    if (memoryEntry) {
      if (now - memoryEntry.timestamp < memoryEntry.ttl) {
        return memoryEntry.data as T;
      }
      this.memoryCache.delete(cacheKey);
    }

    // Check persistent storage
    try {
      const stored = await AsyncStorage.getItem(cacheKey);
      if (!stored) return null;

      const entry = JSON.parse(stored) as CacheEntry<T>;
      if (now - entry.timestamp < entry.ttl) {
        // Update memory cache
        this.memoryCache.set(cacheKey, entry);
        return entry.data;
      } else {
        // Remove expired entry
        await AsyncStorage.removeItem(cacheKey);
      }
    } catch (error) {
      console.error('Error reading from cache:', error);
    }

    return null;
  }

  async clear(prefix?: string): Promise<void> {
    try {
      if (prefix) {
        // Clear specific prefix
        const keys = await AsyncStorage.getAllKeys();
        const keysToRemove = keys.filter(key => key.startsWith(`${this.PREFIX}${prefix}_`));
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
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }
}

export const cache = CacheManager.getInstance();

export const CACHE_KEYS = {
  AI_SIMILAR: 'ai_similar',
  AI_TRIVIA: 'ai_trivia',
  AI_CHAT: 'ai_chat',
  AI_RECOMMENDATION: 'ai_recommendation',
} as const;
