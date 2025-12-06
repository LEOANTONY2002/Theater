import {useInfiniteQuery} from '@tanstack/react-query';
import {searchMovies} from '../services/tmdbWithCache';
import {searchTVShows} from '../services/tmdbWithCache';
import {FilterParams} from '../types/filters';
import {Movie} from '../types/movie';
import {TVShow} from '../types/tvshow';
import {ContentItem} from '../components/MovieList';

const MIN_ITEMS_THRESHOLD = 60; // Increased from 20 to show more results initially
const MAX_PAGES_PER_BATCH = 10; // Increased from 5 to handle filters better

interface BatchedResponse {
  results: ContentItem[];
  page: number;
  total_pages: number;
  hasReachedThreshold: boolean;
  lastFetchedPage: number;
}

// Filter function to remove adult content and apply other filters
const filterContent = (
  items: ContentItem[],
  filters: FilterParams,
  query: string,
): ContentItem[] => {
  return items.filter(item => {
    // Remove adult content
    if ((item as any).adult) {
      return false;
    }

    // Apply search query filter
    if (query) {
      const title =
        item.type === 'movie' ? (item as Movie).title : (item as TVShow).name;

      if (!title?.toLowerCase().includes(query.toLowerCase())) {
        return false;
      }

      // Basic quality filter for search results
      if (!filters['vote_average.gte'] && item.vote_average < 5) {
        return false;
      }
    }

    // Apply rating filter
    if (filters['vote_average.gte'] !== undefined) {
      if (item.vote_average < filters['vote_average.gte']) {
        return false;
      }
    }

    // Apply date filters
    if (item.type === 'movie') {
      const movie = item as Movie;
      if (filters['primary_release_date.gte'] && movie.release_date) {
        if (movie.release_date < filters['primary_release_date.gte']) {
          return false;
        }
      }
      if (filters['primary_release_date.lte'] && movie.release_date) {
        if (movie.release_date > filters['primary_release_date.lte']) {
          return false;
        }
      }
    } else {
      const tvShow = item as TVShow;
      if (filters['first_air_date.gte'] && tvShow.first_air_date) {
        if (tvShow.first_air_date < filters['first_air_date.gte']) {
          return false;
        }
      }
      if (filters['first_air_date.lte'] && tvShow.first_air_date) {
        if (tvShow.first_air_date > filters['first_air_date.lte']) {
          return false;
        }
      }
    }

    // Apply language filter
    if (filters.with_original_language && item.original_language) {
      if (item.original_language !== filters.with_original_language) {
        return false;
      }
    }

    // Apply genre filter
    if (filters.with_genres && item.genre_ids) {
      if (
        !item.genre_ids.some(genreId =>
          filters.with_genres?.includes(genreId.toString()),
        )
      ) {
        return false;
      }
    }

    return true;
  });
};

// Batch fetch function that gets multiple pages until threshold is met
const batchFetchMovies = async (
  query: string,
  startPage: number,
  filters: FilterParams,
): Promise<BatchedResponse> => {
  let allResults: ContentItem[] = [];
  let currentPage = startPage;
  let totalPages = 1;
  let hasReachedThreshold = false;

  for (let i = 0; i < MAX_PAGES_PER_BATCH && currentPage <= totalPages; i++) {
    try {
      const response = await searchMovies(query, currentPage, filters);

      // Transform movies to ContentItem format
      const movies: ContentItem[] = response.results.map((movie: Movie) => ({
        ...movie,
        type: 'movie' as const,
      }));

      // Apply filtering
      const filteredMovies = filterContent(movies, filters, query);
      allResults.push(...filteredMovies);

      totalPages = response.total_pages;
      currentPage++;

      // Check if we've reached the threshold
      if (allResults.length >= MIN_ITEMS_THRESHOLD) {
        hasReachedThreshold = true;
        break;
      }

      // If this was the last page, break
      if (response.page >= response.total_pages) {
        break;
      }
    } catch (error) {
      console.error(`Error fetching movies page ${currentPage}:`, error);
      break;
    }
  }

  return {
    results: allResults,
    page: startPage,
    total_pages: totalPages,
    hasReachedThreshold,
    lastFetchedPage: currentPage - 1,
  };
};

// Batch fetch function for TV shows
const batchFetchTVShows = async (
  query: string,
  startPage: number,
  filters: FilterParams,
): Promise<BatchedResponse> => {
  let allResults: ContentItem[] = [];
  let currentPage = startPage;
  let totalPages = 1;
  let hasReachedThreshold = false;

  for (let i = 0; i < MAX_PAGES_PER_BATCH && currentPage <= totalPages; i++) {
    try {
      const response = await searchTVShows(query, currentPage, filters);

      // Transform TV shows to ContentItem format
      const tvShows: ContentItem[] = response.results.map((show: TVShow) => ({
        ...show,
        type: 'tv' as const,
      }));

      // Apply filtering
      const filteredTVShows = filterContent(tvShows, filters, query);
      allResults.push(...filteredTVShows);

      totalPages = response.total_pages;
      currentPage++;

      // Check if we've reached the threshold
      if (allResults.length >= MIN_ITEMS_THRESHOLD) {
        hasReachedThreshold = true;
        break;
      }

      // If this was the last page, break
      if (response.page >= response.total_pages) {
        break;
      }
    } catch (error) {
      console.error(`Error fetching TV shows page ${currentPage}:`, error);
      break;
    }
  }

  return {
    results: allResults,
    page: startPage,
    total_pages: totalPages,
    hasReachedThreshold,
    lastFetchedPage: currentPage - 1,
  };
};

export const useEnhancedMovieSearch = (
  query: string,
  filters: FilterParams = {},
) => {
  return useInfiniteQuery({
    queryKey: ['enhanced_search_movies', query, filters],
    queryFn: async ({pageParam = 1}) => {
      const batchResponse = await batchFetchMovies(
        query,
        pageParam as number,
        filters,
      );
      return batchResponse;
    },
    getNextPageParam: (lastPage: BatchedResponse) => {
      // Only provide next page if we haven't reached the end and have enough items
      if (lastPage.lastFetchedPage < lastPage.total_pages) {
        return lastPage.lastFetchedPage + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    gcTime: 1000 * 60 * 60, // 1 hour
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
};

export const useEnhancedTVSearch = (
  query: string,
  filters: FilterParams = {},
) => {
  return useInfiniteQuery({
    queryKey: ['enhanced_search_tv', query, filters],
    queryFn: async ({pageParam = 1}) => {
      const batchResponse = await batchFetchTVShows(
        query,
        pageParam as number,
        filters,
      );
      return batchResponse;
    },
    getNextPageParam: (lastPage: BatchedResponse) => {
      // Only provide next page if we haven't reached the end and have enough items
      if (lastPage.lastFetchedPage < lastPage.total_pages) {
        return lastPage.lastFetchedPage + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    gcTime: 1000 * 60 * 60, // 1 hour
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
};
