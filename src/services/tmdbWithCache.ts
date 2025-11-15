/**
 * TMDB service wrapper - TanStack Query handles all caching automatically
 * This file exists for backward compatibility but no longer implements AsyncStorage caching
 * Realm database caches movies/TV shows, TanStack Query caches API responses in memory
 */

// Simply re-export all TMDB functions - TanStack Query handles caching
export * from './tmdb';
