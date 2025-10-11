import {offlineCache} from './offlineCache';
import * as tmdbService from './tmdb';
import {checkInternet} from './connectivity';
import {Movie} from '../types/movie';
import {TVShow} from '../types/tvshow';
import {FilterParams, SavedFilter} from '../types/filters';

/**
 * Enhanced TMDB service with offline caching capabilities
 * This service acts as a wrapper around the original TMDB service,
 * providing automatic caching and offline fallback functionality
 */

interface CacheableResponse {
  results: any[];
  page: number;
  total_pages: number;
  total_results: number;
}

class TMDBWithCacheService {
  private isOnline = true;

  constructor() {
    this.checkConnectivity();
    // Check connectivity every 30 seconds
    setInterval(() => this.checkConnectivity(), 30000);
  }

  // Simple helpers per instruction
  async getMoviesByOTT(providerId: number, page = 1): Promise<CacheableResponse> {
    const cacheKey = {
      type: 'movies_by_ott',
      identifier: `${providerId}_${page}`,
    };
    return this.tryOnlineFirst(
      () => tmdbService.getMoviesByOTT(providerId, page) as any,
      cacheKey,
      offlineCache['TTL_CONFIG'].discover,
    );
  }

  async getShowsByOTT(providerId: number, page = 1): Promise<CacheableResponse> {
    const cacheKey = {
      type: 'shows_by_ott',
      identifier: `${providerId}_${page}`,
    };
    return this.tryOnlineFirst(
      () => tmdbService.getShowsByOTT(providerId, page) as any,
      cacheKey,
      offlineCache['TTL_CONFIG'].discover,
    );
  }

  async getMoviesByLanguageSimple(iso6391: string, page = 1): Promise<CacheableResponse> {
    const cacheKey = {
      type: 'movies_by_language_simple',
      identifier: `${iso6391}_${page}`,
    };
    return this.tryOnlineFirst(
      () => tmdbService.getMoviesByLanguageSimple(iso6391, page) as any,
      cacheKey,
      offlineCache['TTL_CONFIG'].discover,
    );
  }

  async getShowsByLanguageSimple(iso6391: string, page = 1): Promise<CacheableResponse> {
    const cacheKey = {
      type: 'shows_by_language_simple',
      identifier: `${iso6391}_${page}`,
    };
    return this.tryOnlineFirst(
      () => tmdbService.getShowsByLanguageSimple(iso6391, page) as any,
      cacheKey,
      offlineCache['TTL_CONFIG'].discover,
    );
  }

  private async checkConnectivity(): Promise<void> {
    this.isOnline = await checkInternet();
  }

  private async tryOnlineFirst<T>(
    onlineOperation: () => Promise<T>,
    cacheKey: {type: string; identifier: string},
    cacheTTL?: number,
  ): Promise<T> {
    try {
      if (this.isOnline) {
        const result = await onlineOperation();
        // Cache the successful result
        await offlineCache.set(
          cacheKey.type,
          cacheKey.identifier,
          result,
          cacheTTL,
        );
        return result;
      }
    } catch (error) {
      console.warn('Online operation failed, trying cache:', error);
    }

    // Try cache as fallback
    const cachedResult = await offlineCache.get(
      cacheKey.type,
      cacheKey.identifier,
    );
    if (cachedResult) {
      return cachedResult;
    }

    // If no cache available, re-throw the error
    throw new Error('No internet connection and no cached data available');
  }

  // Movies
  async getMovies(
    type:
      | 'latest'
      | 'popular'
      | 'top_rated'
      | 'upcoming'
      | 'now_playing'
      | 'latest_by_region'
      | 'upcoming_by_region',
    page = 1,
  ): Promise<CacheableResponse> {
    const cacheKey = {
      type: `movies_${type}`,
      identifier: `page_${page}`,
    };

    return this.tryOnlineFirst(
      () => tmdbService.getMovies(type, page),
      cacheKey,
    );
  }

  async getTVShows(
    type: 'latest' | 'popular' | 'top_rated',
    page = 1,
  ): Promise<CacheableResponse> {
    const cacheKey = {
      type: `tvshows_${type}`,
      identifier: `page_${page}`,
    };

    return this.tryOnlineFirst(
      () => tmdbService.getTVShows(type, page),
      cacheKey,
    );
  }

  async searchMovies(
    query: string,
    page = 1,
    filters: FilterParams = {},
  ): Promise<CacheableResponse> {
    const cacheKey = {
      type: 'search_movies',
      identifier: `${query}_${page}_${JSON.stringify(filters)}`,
    };

    return this.tryOnlineFirst(
      () => tmdbService.searchMovies(query, page, filters),
      cacheKey,
      offlineCache['TTL_CONFIG'].search,
    );
  }

  async searchTVShows(
    query: string,
    page = 1,
    filters: FilterParams = {},
  ): Promise<CacheableResponse> {
    const cacheKey = {
      type: 'search_tv',
      identifier: `${query}_${page}_${JSON.stringify(filters)}`,
    };

    return this.tryOnlineFirst(
      () => tmdbService.searchTVShows(query, page, filters),
      cacheKey,
      offlineCache['TTL_CONFIG'].search,
    );
  }

  async getMovieDetails(movieId: number): Promise<any> {
    const cacheKey = {
      type: 'movie_details',
      identifier: movieId.toString(),
    };

    return this.tryOnlineFirst(
      () => tmdbService.getMovieDetails(movieId),
      cacheKey,
    );
  }

  async getTVShowDetails(tvId: number): Promise<any> {
    const cacheKey = {
      type: 'tv_details',
      identifier: tvId.toString(),
    };

    return this.tryOnlineFirst(
      () => tmdbService.getTVShowDetails(tvId),
      cacheKey,
    );
  }

  async getGenres(type: 'movie' | 'tv' = 'movie'): Promise<any[]> {
    const cacheKey = {
      type: 'genres',
      identifier: type,
    };

    return this.tryOnlineFirst(
      () => tmdbService.getGenres(type),
      cacheKey,
      30 * 24 * 60 * 60 * 1000, // 30 days - genres don't change often
    );
  }

  async getSimilarMovies(
    movieId: number,
    page = 1,
  ): Promise<CacheableResponse> {
    const cacheKey = {
      type: 'similar_movies',
      identifier: `${movieId}_${page}`,
    };

    return this.tryOnlineFirst(
      () => tmdbService.getSimilarMovies(movieId, page),
      cacheKey,
    );
  }

  async getSimilarTVShows(tvId: number, page = 1): Promise<CacheableResponse> {
    const cacheKey = {
      type: 'similar_tv',
      identifier: `${tvId}_${page}`,
    };

    return this.tryOnlineFirst(
      () => tmdbService.getSimilarTVShows(tvId, page),
      cacheKey,
    );
  }

  async getMovieRecommendations(
    movieId: number,
    page = 1,
  ): Promise<CacheableResponse> {
    const cacheKey = {
      type: 'movie_recommendations',
      identifier: `${movieId}_${page}`,
    };

    return this.tryOnlineFirst(
      () => tmdbService.getMovieRecommendations(movieId, page),
      cacheKey,
    );
  }

  async getTVShowRecommendations(
    tvId: number,
    page = 1,
  ): Promise<CacheableResponse> {
    const cacheKey = {
      type: 'tv_recommendations',
      identifier: `${tvId}_${page}`,
    };

    return this.tryOnlineFirst(
      () => tmdbService.getTVShowRecommendations(tvId, page),
      cacheKey,
    );
  }

  async getTrending(
    timeWindow: 'day' | 'week' = 'day',
    page = 1,
  ): Promise<CacheableResponse> {
    const cacheKey = {
      type: 'trending',
      identifier: `${timeWindow}_${page}`,
    };

    return this.tryOnlineFirst(
      () => tmdbService.getTrending(timeWindow, page),
      cacheKey,
      offlineCache['TTL_CONFIG'].trending,
    );
  }

  async discoverMovies(
    filters: any = {},
    page = 1,
  ): Promise<CacheableResponse> {
    const cacheKey = {
      type: 'discover_movies',
      identifier: `${JSON.stringify(filters)}_${page}`,
    };

    return this.tryOnlineFirst(
      () => tmdbService.discoverMovies(filters, page),
      cacheKey,
      offlineCache['TTL_CONFIG'].discover,
    );
  }

  async discoverTVShows(
    filters: any = {},
    page = 1,
  ): Promise<CacheableResponse> {
    const cacheKey = {
      type: 'discover_tv',
      identifier: `${JSON.stringify(filters)}_${page}`,
    };

    return this.tryOnlineFirst(
      () => tmdbService.discoverTVShows(filters, page),
      cacheKey,
      offlineCache['TTL_CONFIG'].discover,
    );
  }

  async getContentByGenre(
    genreId: any,
    contentType: 'movie' | 'tv',
    page = 1,
    sortBy:
      | 'popularity.desc'
      | 'release_date.desc'
      | 'vote_average.desc' = 'popularity.desc',
  ): Promise<CacheableResponse> {
    const cacheKey = {
      type: `genre_${contentType}`,
      identifier: `${genreId}_${sortBy}_${page}`,
    };

    return this.tryOnlineFirst(
      () => tmdbService.getContentByGenre(genreId, contentType, page, sortBy),
      cacheKey,
    );
  }

  async getTop10MoviesTodayByRegion(): Promise<Movie[]> {
    const cacheKey = {
      type: 'top10_movies_region',
      identifier: 'today',
    };

    return this.tryOnlineFirst(
      () => tmdbService.getTop10MoviesTodayByRegion(),
      cacheKey,
      offlineCache['TTL_CONFIG'].trending,
    );
  }

  async getTop10TVShowsTodayByRegion(): Promise<TVShow[]> {
    const cacheKey = {
      type: 'top10_tv_region',
      identifier: 'today',
    };

    return this.tryOnlineFirst(
      () => tmdbService.getTop10TVShowsTodayByRegion(),
      cacheKey,
      offlineCache['TTL_CONFIG'].trending,
    );
  }

  async getWatchProviders(
    contentId: number,
    contentType: 'movie' | 'tv',
  ): Promise<any> {
    const cacheKey = {
      type: 'watch_providers',
      identifier: `${contentType}_${contentId}`,
    };

    return this.tryOnlineFirst(
      () => tmdbService.getWatchProviders(contentId, contentType),
      cacheKey,
      7 * 24 * 60 * 60 * 1000, // 7 days - watch providers don't change often
    );
  }

  async getAvailableWatchProviders(region = 'US'): Promise<any[]> {
    const cacheKey = {
      type: 'available_watch_providers',
      identifier: region,
    };

    return this.tryOnlineFirst(
      () => tmdbService.getAvailableWatchProviders(region),
      cacheKey,
      30 * 24 * 60 * 60 * 1000, // 30 days - available providers don't change often
    );
  }

  async getPersonDetails(personId: number): Promise<any> {
    const cacheKey = {
      type: 'person_details',
      identifier: personId.toString(),
    };

    return this.tryOnlineFirst(
      () => tmdbService.getPersonDetails(personId),
      cacheKey,
      offlineCache['TTL_CONFIG'].person,
    );
  }

  async getPersonMovieCredits(
    personId: number,
    page = 1,
  ): Promise<CacheableResponse> {
    const cacheKey = {
      type: 'person_movie_credits',
      identifier: `${personId}_${page}`,
    };

    return this.tryOnlineFirst(
      () => tmdbService.getPersonMovieCredits(personId, page),
      cacheKey,
      offlineCache['TTL_CONFIG'].person,
    );
  }

  async getPersonTVCredits(
    personId: number,
    page = 1,
  ): Promise<CacheableResponse> {
    const cacheKey = {
      type: 'person_tv_credits',
      identifier: `${personId}_${page}`,
    };

    return this.tryOnlineFirst(
      () => tmdbService.getPersonTVCredits(personId, page),
      cacheKey,
      offlineCache['TTL_CONFIG'].person,
    );
  }

  async searchFilterContent(savedFilter: SavedFilter, page = 1): Promise<any> {
    const cacheKey = {
      type: 'filter_content',
      identifier: `${savedFilter.id}_${page}`,
    };

    return this.tryOnlineFirst(
      () => tmdbService.searchFilterContent(savedFilter, page),
      cacheKey,
      offlineCache['TTL_CONFIG'].discover,
    );
  }

  async fetchContentFromAI(
    aiResponse: {title: string; year: string}[],
    type: 'movie' | 'tv',
  ): Promise<any[]> {
    const cacheKey = {
      type: 'ai_content',
      identifier: `${type}_${JSON.stringify(aiResponse)}`,
    };

    return this.tryOnlineFirst(
      () => tmdbService.fetchContentFromAI(aiResponse, type),
      cacheKey,
      24 * 60 * 60 * 1000, // 1 day
    );
  }

  // Utility methods that don't need caching
  getImageUrl = tmdbService.getImageUrl;
  getOptimizedImageUrl = tmdbService.getOptimizedImageUrl;
  getLanguages = tmdbService.getLanguages;
  getLanguage = tmdbService.getLanguage;
  getRegions = tmdbService.getRegions;
  checkTMDB = tmdbService.checkTMDB;
  async getSeasonDetails(tvId: number, seasonNumber: number): Promise<any> {
    const cacheKey = {
      type: 'season_details',
      identifier: `${tvId}_${seasonNumber}`,
    };

    return this.tryOnlineFirst(
      () => tmdbService.getSeasonDetails(tvId, seasonNumber),
      cacheKey,
    );
  }

  // Cache management methods
  async getCacheStats() {
    return await offlineCache.getStats();
  }

  async clearCache() {
    return await offlineCache.clear();
  }

  async preloadEssentialContent(): Promise<void> {
    try {
      // Preload popular movies and TV shows
      const popularMoviesPromise = this.getMovies('popular', 1);
      const popularTVPromise = this.getTVShows('popular', 1);
      const topRatedMoviesPromise = this.getMovies('top_rated', 1);
      const topRatedTVPromise = this.getTVShows('top_rated', 1);

      // Preload genres
      const movieGenresPromise = this.getGenres('movie');
      const tvGenresPromise = this.getGenres('tv');

      // Wait for all essential content to load
      await Promise.allSettled([
        popularMoviesPromise,
        popularTVPromise,
        topRatedMoviesPromise,
        topRatedTVPromise,
        movieGenresPromise,
        tvGenresPromise,
      ]);
    } catch (error) {
      console.error('Failed to preload essential content:', error);
    }
  }

  // Check if we have sufficient offline content
  async hasOfflineContent(): Promise<boolean> {
    const stats = await this.getCacheStats();
    return stats.totalItems > 50; // Consider we have offline content if we have more than 50 cached items
  }

  // Get offline status
  getOnlineStatus(): boolean {
    return this.isOnline;
  }
}

export const tmdbWithCache = new TMDBWithCacheService();

// Export individual functions for backward compatibility
export const getMovies = (type: any, page?: number) =>
  tmdbWithCache.getMovies(type, page);
export const getTVShows = (type: any, page?: number) =>
  tmdbWithCache.getTVShows(type, page);
export const searchMovies = (
  query: string,
  page?: number,
  filters?: FilterParams,
) => tmdbWithCache.searchMovies(query, page, filters);
export const searchTVShows = (
  query: string,
  page?: number,
  filters?: FilterParams,
) => tmdbWithCache.searchTVShows(query, page, filters);
export const getMovieDetails = (movieId: number) =>
  tmdbWithCache.getMovieDetails(movieId);
export const getTVShowDetails = (tvId: number) =>
  tmdbWithCache.getTVShowDetails(tvId);
export const getGenres = (type?: 'movie' | 'tv') =>
  tmdbWithCache.getGenres(type);
export const getSimilarMovies = (movieId: number, page?: number) =>
  tmdbWithCache.getSimilarMovies(movieId, page);
export const getSimilarTVShows = (tvId: number, page?: number) =>
  tmdbWithCache.getSimilarTVShows(tvId, page);
export const getMovieRecommendations = (movieId: number, page?: number) =>
  tmdbWithCache.getMovieRecommendations(movieId, page);
export const getTVShowRecommendations = (tvId: number, page?: number) =>
  tmdbWithCache.getTVShowRecommendations(tvId, page);
export const getTrending = (timeWindow?: 'day' | 'week', page?: number) =>
  tmdbWithCache.getTrending(timeWindow, page);
export const discoverMovies = (filters?: any, page?: number) =>
  tmdbWithCache.discoverMovies(filters, page);
export const discoverTVShows = (filters?: any, page?: number) =>
  tmdbWithCache.discoverTVShows(filters, page);
export const getMoviesByOTT = (providerId: number, page?: number) =>
  tmdbWithCache.getMoviesByOTT(providerId, page);
export const getShowsByOTT = (providerId: number, page?: number) =>
  tmdbWithCache.getShowsByOTT(providerId, page);
export const getMoviesByLanguageSimple = (iso6391: string, page?: number) =>
  tmdbWithCache.getMoviesByLanguageSimple(iso6391, page);
export const getShowsByLanguageSimple = (iso6391: string, page?: number) =>
  tmdbWithCache.getShowsByLanguageSimple(iso6391, page);
export const getContentByGenre = (
  genreId: any,
  contentType: 'movie' | 'tv',
  page?: number,
  sortBy?: any,
) => tmdbWithCache.getContentByGenre(genreId, contentType, page, sortBy);
export const getTop10MoviesTodayByRegion = () =>
  tmdbWithCache.getTop10MoviesTodayByRegion();
export const getTop10TVShowsTodayByRegion = () =>
  tmdbWithCache.getTop10TVShowsTodayByRegion();
export const getWatchProviders = (
  contentId: number,
  contentType: 'movie' | 'tv',
) => tmdbWithCache.getWatchProviders(contentId, contentType);
export const getAvailableWatchProviders = (region?: string) =>
  tmdbWithCache.getAvailableWatchProviders(region);
export const getPersonDetails = (personId: number) =>
  tmdbWithCache.getPersonDetails(personId);
export const getPersonMovieCredits = (personId: number, page?: number) =>
  tmdbWithCache.getPersonMovieCredits(personId, page);
export const getPersonTVCredits = (personId: number, page?: number) =>
  tmdbWithCache.getPersonTVCredits(personId, page);
export const searchFilterContent = (savedFilter: SavedFilter, page?: number) =>
  tmdbWithCache.searchFilterContent(savedFilter, page);
export const fetchContentFromAI = (
  aiResponse: {title: string; year: string}[],
  type: 'movie' | 'tv',
) => tmdbWithCache.fetchContentFromAI(aiResponse, type);

// Re-export utility functions
export const getImageUrl = tmdbService.getImageUrl;
export const getOptimizedImageUrl = tmdbService.getOptimizedImageUrl;
export const getLanguages = tmdbService.getLanguages;
export const getLanguage = tmdbService.getLanguage;
export const getRegions = tmdbService.getRegions;
export const checkTMDB = tmdbService.checkTMDB;
export const getTrendingMovies = (timeWindow?: 'day' | 'week', page?: number) =>
  tmdbWithCache.getTrending(timeWindow, page);
export const getTrendingTVShows = (
  timeWindow?: 'day' | 'week',
  page?: number,
) => tmdbWithCache.getTrending(timeWindow, page);
export const getSeasonDetails = (tvId: number, seasonNumber: number) =>
  tmdbWithCache.getSeasonDetails(tvId, seasonNumber);
