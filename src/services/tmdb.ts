import axios from 'axios';
import {tmdbApi} from './api';
import {FilterParams, SavedFilter} from '../types/filters';
import {SettingsManager} from '../store/settings';
import languageData from '../utils/language.json';
import regionData from '../utils/region.json';

// Helper function to filter out 'tl' language content if region is not Philippines
const filterTagalogContent = async (data: any): Promise<any> => {
  try {
    const region = await getRegionParam();
    if (region !== 'PH' && data?.results) {
      data.results = data.results.filter(
        (item: any) => item.original_language !== 'tl',
      );
      // Update the total results count after filtering
      data.total_results = data.results.length;
    }
    return data;
  } catch (error) {
    return data;
  }
};

const getLanguageParam = async () => {
  const contentLanguages = await SettingsManager.getContentLanguages();
  if (contentLanguages.length === 0) return undefined;
  return contentLanguages.map(lang => lang.iso_639_1).join('|');
};

const getRegionParam = async () => {
  const region = await SettingsManager.getRegion();
  return region?.iso_3166_1;
};

function formatDate(date: any) {
  return date.toISOString().split('T')[0];
}

export const getMovies = async (
  type:
    | 'latest'
    | 'popular'
    | 'top_rated'
    | 'upcoming'
    | 'now_playing'
    | 'latest_by_region'
    | 'upcoming_by_region',
  page = 1,
) => {
  // Current date
  const now = new Date();
  const today = formatDate(now);

  // Date 60 days after
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 60);
  const future = formatDate(futureDate);
  const with_original_language = await getLanguageParam();
  const region = await getRegionParam();

  const params: any = {
    page,
    sort_by: 'release_date.desc',
    'vote_average.gte': 4,
    include_adult: false,
    'vote_count.gte': 10,
    with_original_language,
    without_genres: '99,10755',
  };

  // Only apply language filter if we have languages set and it's not too restrictive
  if (with_original_language) {
    params.with_original_language = with_original_language;
  }

  const makeRequest = async (
    useLanguageFilter: boolean = true,
    useRatingFilter: boolean = true,
  ) => {
    const requestParams = {...params};

    if (!useLanguageFilter) {
      delete requestParams.with_original_language;
    }

    if (!useRatingFilter) {
      delete requestParams['vote_average.gte'];
      delete requestParams['vote_count.gte'];
      if (type === 'top_rated') {
        delete requestParams['vote_average.lte'];
      }
    }

    if (type === 'latest') {
      const response = await tmdbApi.get('/discover/movie', {
        params: {...requestParams, with_original_language},
      });

      return response.data;
    }

    if (type === 'latest_by_region') {
      const response = await tmdbApi.get('/movie/now_playing', {
        params: {...requestParams, with_original_language, region},
      });

      return response.data;
    }

    if (type === 'upcoming') {
      const response = await tmdbApi.get('/discover/movie', {
        params: {
          page,
          include_adult: false,
          'release_date.lte': future,
          'release_date.gte': today,
          with_release_type: '2|3',
          sort_by: 'popularity.desc',
        },
      });
      return response.data;
    }

    if (type === 'upcoming_by_region') {
      const response = await tmdbApi.get('/discover/movie', {
        params: {
          page,
          include_adult: false,
          'release_date.lte': future,
          'release_date.gte': today,
          with_release_type: '2|3',
          sort_by: 'popularity.desc',
          region,
        },
      });
      return response.data;
    }

    if (type === 'popular') {
      requestParams.sort_by = 'popularity.desc';
      if (useRatingFilter) {
        requestParams['vote_average.gte'] = 6;
        requestParams['vote_count.gte'] = 200;
      }
      const response = await tmdbApi.get('/discover/movie', {
        params: requestParams,
      });

      return response.data;
    }

    if (type === 'top_rated') {
      requestParams.sort_by = 'vote_average.desc';
      if (useRatingFilter) {
        requestParams['vote_average.gte'] = 7;
        requestParams['vote_average.lte'] = 10;
        requestParams['vote_count.gte'] = 500;
      }
      const response = await tmdbApi.get('/discover/movie', {
        params: requestParams,
      });

      return response.data;
    }

    // For other types, use built-in endpoints
    const response = await tmdbApi.get(`/movie/${type}`, {
      params: {
        page,
        ...(useLanguageFilter &&
          with_original_language && {with_original_language}),
      },
    });

    return response.data;
  };

  // Step 1: Try with language filter + rating filter
  let result = await makeRequest(true, true);

  // Step 2: If no results, try without rating filter but keep language filter
  if (
    (!result.results || result.results.length === 0) &&
    with_original_language
  ) {
    result = await makeRequest(true, false);
  }

  // Step 3: If still no results, try without language filter
  if (
    (!result.results || result.results.length === 0) &&
    with_original_language
  ) {
    result = await makeRequest(false, false);
  }

  return filterTagalogContent(result);
};

export const getTodayReleasedMovies = async (page = 1) => {
  const now = new Date();
  const today = formatDate(now);
  const region = await getRegionParam();

  const response = await tmdbApi.get('/discover/movie', {
    params: {
      page,
      'primary_release_date.gte': today,
      'primary_release_date.lte': today,
      region,
      include_adult: false,
      sort_by: 'popularity.desc',
    },
  });

  return response.data;
};

export const getTVShows = async (
  type: 'latest' | 'popular' | 'top_rated',
  page = 1,
) => {
  const today = new Date().toISOString().split('T')[0];
  const start = new Date('2000-01-01').toISOString().split('T')[0];
  const with_original_language = await getLanguageParam();
  const region = await getRegionParam();

  const params: any = {
    page,
    sort_by: 'first_air_date.desc',
    without_genres: '10764,10767,10766,10763', // Reality, Talk Show, Soap, News
    'first_air_date.lte': today,
    'first_air_date.gte': start,
    'vote_average.gte': 4,
    'vote_count.gte': 100,
    with_adult: false,
    include_adult: false,
  };

  // Only apply language filter if we have languages set and it's not too restrictive
  if (with_original_language) {
    params.with_original_language = with_original_language;
  }

  const makeRequest = async (
    useLanguageFilter: boolean = true,
    useRatingFilter: boolean = true,
  ) => {
    const requestParams = {...params};

    if (!useLanguageFilter) {
      delete requestParams.with_original_language;
    }

    if (!useRatingFilter) {
      delete requestParams['vote_average.gte'];
      delete requestParams['vote_count.gte'];
      if (type === 'top_rated') {
        delete requestParams['vote_average.lte'];
      }
    }

    if (type === 'latest') {
      const response = await tmdbApi.get('/discover/tv', {
        params: requestParams,
      });

      return response.data;
    }
    if (type === 'popular') {
      requestParams.sort_by = 'popularity.desc';
      const response = await tmdbApi.get('/discover/tv', {
        params: requestParams,
      });

      return response.data;
    }
    if (type === 'top_rated') {
      requestParams.sort_by = 'vote_average.desc';
      if (useRatingFilter) {
        requestParams['vote_average.gte'] = 7;
        requestParams['vote_average.lte'] = 9.5;
      }
      const response = await tmdbApi.get('/discover/tv', {
        params: requestParams,
      });

      return response.data;
    }
    const response = await tmdbApi.get(`/tv/${type}`, {
      params: {
        page,
        ...(useLanguageFilter &&
          with_original_language && {with_original_language}),
      },
    });

    return response.data;
  };

  // Step 1: Try with language filter + rating filter
  let result = await makeRequest(true, true);

  // Step 2: If no results, try without rating filter but keep language filter
  if (
    (!result.results || result.results.length === 0) &&
    with_original_language
  ) {
    result = await makeRequest(true, false);
  }

  // Step 3: If still no results, try without language filter
  if (
    (!result.results || result.results.length === 0) &&
    with_original_language
  ) {
    result = await makeRequest(false, false);
  }

  return result;
};

export const getAiringTodayTVShows = async (page = 1) => {
  const with_original_language = await getLanguageParam();
  const today = new Date().toISOString().split('T')[0];
  const response = await tmdbApi.get('/discover/tv', {
    params: {
      page,
      'air_date.gte': today,
      'air_date.lte': today,
      with_original_language,
      include_adult: false,
      sort_by: 'popularity.desc',
      'vote_count.gte': 2,
    },
  });
  return response.data;
};

// Helper function to process genre operator
const processGenreOperator = (filters: FilterParams) => {
  const processedFilters = {...filters};

  // Handle genre operator: convert OR to comma, AND to ampersand
  if (processedFilters.with_genres && processedFilters.genre_operator) {
    const genres = processedFilters.with_genres.split('|').filter(Boolean);
    if (processedFilters.genre_operator === 'AND') {
      // TMDB uses comma for AND when multiple genres
      processedFilters.with_genres = genres.join(',');
    } else {
      // OR is default, use pipe separator
      processedFilters.with_genres = genres.join('|');
    }
    // Remove genre_operator as it's not a TMDB API param
    delete processedFilters.genre_operator;
  }

  return processedFilters;
};

export const searchMovies = async (
  query: string,
  page = 1,
  filters: FilterParams = {},
) => {
  const processedFilters = processGenreOperator(filters);
  const params = {
    page,
    ...processedFilters,
  };

  // Add watch region if watch providers are specified
  if (processedFilters.with_watch_providers) {
    params.watch_region = processedFilters.watch_region || 'US';
  }

  if (!query) {
    const response = await tmdbApi.get('/discover/movie', {params});
    return response.data;
  }

  const params2 = {
    query,
    page,
    ...processedFilters,
    sort_by: processedFilters.sort_by || 'popularity.desc',
    include_adult: false,
    'vote_count.gte':
      processedFilters?.['vote_average.lte'] ||
      processedFilters?.sort_by ||
      200,
    'vote_average.gte': processedFilters['vote_average.gte'] || 4,
  };

  // Add watch region for search queries too
  if (processedFilters.with_watch_providers) {
    params2.watch_region = processedFilters.watch_region || 'US';
  }

  let searchResponse = await tmdbApi.get('/search/movie', {
    params: params2,
  });

  return filterTagalogContent(searchResponse.data);
};

export const searchTVShows = async (
  query: string,
  page = 1,
  filters: FilterParams = {},
) => {
  const processedFilters = processGenreOperator(filters);
  const params = {
    page,
    ...processedFilters,
    include_adult: false,
  };

  // Add watch region if watch providers are specified
  if (processedFilters.with_watch_providers) {
    params.watch_region = processedFilters.watch_region || 'US';
  }

  if (!query) {
    const response = await tmdbApi.get('/discover/tv', {params});
    return response.data;
  }

  const searchParams = {
    query,
    page,
    ...processedFilters,
    sort_by: processedFilters.sort_by || 'popularity.desc',
    include_adult: false,
    'vote_count.gte': 100,
    'vote_average.gte': processedFilters['vote_average.gte'] || 4,
  };

  // Add watch region for search queries too
  if (processedFilters.with_watch_providers) {
    searchParams.watch_region = processedFilters.watch_region || 'US';
  }

  // For search queries, we need to use the search endpoint
  // but still respect the sort_by parameter if provided
  let searchResponse = await tmdbApi.get('/search/tv', {
    params: searchParams,
  });

  return filterTagalogContent(searchResponse.data);
};

export const searchFilterContent = async (
  savedFilter: SavedFilter,
  page = 1,
) => {
  // Import the adult content filter
  const {filterTMDBResponse} = await import('../utils/adultContentFilter');

  if (savedFilter.type === 'movie' || savedFilter.type === 'all') {
    let res = await searchMovies('', page, savedFilter.params);
    if (res?.results?.length > 0) {
      // Apply adult content filter
      const filteredResults = filterTMDBResponse(res.results, 'movie');
      return {
        ...savedFilter,
        results: filteredResults.map((result: any) => ({
          ...result,
          type: 'movie',
        })),
        page: res.page,
        total_pages: res.total_pages,
      };
    }
  } else if (savedFilter.type === 'tv') {
    let res = await searchTVShows('', page, savedFilter.params);
    if (res?.results?.length > 0) {
      // Apply adult content filter
      const filteredResults = filterTMDBResponse(res.results, 'tv');
      return {
        ...savedFilter,
        results: filteredResults.map((result: any) => ({
          ...result,
          type: 'tv',
        })),
        page: res.page,
        total_pages: res.total_pages,
      };
    }
  }
};

export const getMovieDetails = async (movieId: number) => {
  // Check Realm cache first
  try {
    const {getMovie} = await import('../database/contentCache');
    const cachedMovie = getMovie(movieId);

    if (cachedMovie && cachedMovie.has_full_details) {
      // Check if cache is still valid (30 days)
      const cacheAge = Date.now() - cachedMovie.cached_at.getTime();
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;

      if (cacheAge < thirtyDays) {
        // Return in TMDB API format
        return {
          id: cachedMovie._id,
          title: cachedMovie.title,
          original_title: cachedMovie.original_title,
          overview: cachedMovie.overview,
          poster_path: cachedMovie.poster_path,
          backdrop_path: cachedMovie.backdrop_path,
          vote_average: cachedMovie.vote_average,
          vote_count: cachedMovie.vote_count,
          release_date: cachedMovie.release_date,
          runtime: cachedMovie.runtime,
          genres:
            cachedMovie.genres?.map((name: string, index: number) => ({
              id: cachedMovie.genre_ids?.[index] || 0,
              name,
            })) || [],
          original_language: cachedMovie.original_language,
          popularity: cachedMovie.popularity,
          adult: cachedMovie.adult,
          credits: {
            cast: cachedMovie.cast ? JSON.parse(cachedMovie.cast) : [],
            crew: cachedMovie.crew ? JSON.parse(cachedMovie.crew) : [],
          },
          videos: {
            results: cachedMovie.videos ? JSON.parse(cachedMovie.videos) : [],
          },
          images: cachedMovie.images
            ? JSON.parse(cachedMovie.images)
            : undefined,
          keywords: cachedMovie.keywords
            ? {keywords: JSON.parse(cachedMovie.keywords)}
            : undefined,
          release_dates: cachedMovie.release_dates
            ? JSON.parse(cachedMovie.release_dates)
            : undefined,
          production_companies: cachedMovie.production_companies
            ? JSON.parse(cachedMovie.production_companies)
            : [],
          spoken_languages: cachedMovie.spoken_languages
            ? JSON.parse(cachedMovie.spoken_languages)
            : [],
          belongs_to_collection: cachedMovie.belongs_to_collection
            ? JSON.parse(cachedMovie.belongs_to_collection)
            : null,
          budget: cachedMovie.budget,
          revenue: cachedMovie.revenue,
          tagline: cachedMovie.tagline,
          imdb_id: cachedMovie.imdb_id,
        };
      }
    }
  } catch (error) {}

  // Cache miss or expired - fetch from TMDB
  const response = await tmdbApi.get(`/movie/${movieId}`, {
    params: {
      append_to_response: 'videos,credits,images,keywords,release_dates',
    },
  });

  // Mark that this came from API so hook knows to cache it
  response.data._fromAPI = true;
  return response.data;
};

export const getTVShowDetails = async (tvId: number) => {
  // Check Realm cache first for other details
  try {
    const {getTVShow} = await import('../database/contentCache');
    const cachedShow = getTVShow(tvId);

    if (cachedShow && cachedShow.has_full_details) {
      // Check if cache is still valid (30 days)
      const cacheAge = Date.now() - cachedShow.cached_at.getTime();
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;

      if (cacheAge < thirtyDays) {
        // Fetch ONLY fresh episode air dates (lightweight API call)
        let episodeData: {
          next_episode_to_air?: any;
          last_episode_to_air?: any;
          seasons?: any[];
        } = {};

        try {
          const episodeResponse = await tmdbApi.get(`/tv/${tvId}`);
          episodeData = {
            next_episode_to_air: episodeResponse.data.next_episode_to_air,
            last_episode_to_air: episodeResponse.data.last_episode_to_air,
            seasons: episodeResponse.data.seasons,
          };
        } catch (error) {
          console.warn(
            '[getTVShowDetails] Failed to fetch episode air dates:',
            error,
          );
        }

        // Return cached data with fresh episode air dates
        return {
          id: cachedShow._id,
          name: cachedShow.name,
          original_name: cachedShow.original_name,
          overview: cachedShow.overview,
          poster_path: cachedShow.poster_path,
          backdrop_path: cachedShow.backdrop_path,
          vote_average: cachedShow.vote_average,
          vote_count: cachedShow.vote_count,
          first_air_date: cachedShow.first_air_date,
          last_air_date: cachedShow.last_air_date,
          number_of_seasons: cachedShow.number_of_seasons,
          number_of_episodes: cachedShow.number_of_episodes,
          episode_run_time: cachedShow.episode_run_time
            ? Array.from(cachedShow.episode_run_time)
            : [],
          genres:
            cachedShow.genres?.map((name: string, index: number) => ({
              id: cachedShow.genre_ids?.[index] || 0,
              name,
            })) || [],
          original_language: cachedShow.original_language,
          popularity: cachedShow.popularity,
          status: cachedShow.status,
          type: cachedShow.type,
          seasons: episodeData.seasons || [],
          credits: {
            cast: cachedShow.cast ? JSON.parse(cachedShow.cast) : [],
            crew: cachedShow.crew ? JSON.parse(cachedShow.crew) : [],
          },
          videos: {
            results: cachedShow.videos ? JSON.parse(cachedShow.videos) : [],
          },
          images: cachedShow.images ? JSON.parse(cachedShow.images) : undefined,
          keywords: cachedShow.keywords
            ? {keywords: JSON.parse(cachedShow.keywords)}
            : undefined,
          content_ratings: cachedShow.content_ratings
            ? JSON.parse(cachedShow.content_ratings)
            : undefined,
          created_by: cachedShow.created_by
            ? JSON.parse(cachedShow.created_by)
            : [],
          networks: cachedShow.networks ? JSON.parse(cachedShow.networks) : [],
          production_companies: cachedShow.production_companies
            ? JSON.parse(cachedShow.production_companies)
            : [],
          spoken_languages: cachedShow.spoken_languages
            ? JSON.parse(cachedShow.spoken_languages)
            : [],
          tagline: cachedShow.tagline,
          // Always include fresh episode air dates
          next_episode_to_air: episodeData.next_episode_to_air,
          last_episode_to_air: episodeData.last_episode_to_air,
        };
      }
    }
  } catch (error) {}

  // Cache miss or expired - fetch full details from TMDB (includes episode data)
  const response = await tmdbApi.get(`/tv/${tvId}`, {
    params: {
      append_to_response:
        'videos,credits,images,keywords,content_ratings,aggregate_credits',
    },
  });
  return response.data;
};

export const getGenres = async (type: 'movie' | 'tv' = 'movie') => {
  const response = await tmdbApi.get(`/genre/${type}/list`);
  return response.data.genres;
};

export const getImageUrl = (
  path: string,
  size: 'w154' | 'w185' | 'w300' | 'w342' | 'w500' | 'original' = 'w185',
) => {
  return `https://image.tmdb.org/t/p/${size}${path}`;
};

export const getOptimizedImageUrl = (
  path: string | null | undefined,
  size: 'small' | 'medium' | 'large' = 'small',
): string => {
  if (!path) {
    return 'https://via.placeholder.com/120x180/333/666?text=No+Image';
  }

  // Use smallest possible images for maximum performance
  const sizeMap = {
    small: 'w92', // Smallest poster size
    medium: 'w154', // Small backdrop size
    large: 'w185', // Medium size
  };

  return `https://image.tmdb.org/t/p/${sizeMap[size]}${path}`;
};

export const getSimilarMovies = async (movieId: number, page = 1) => {
  const with_original_language = await getLanguageParam();
  const response = await tmdbApi.get(`/movie/${movieId}/similar`, {
    params: {
      page,
      with_original_language,
      with_genres: (await getMovieDetails(movieId)).genres
        .map((g: any) => g.id)
        .join(','),
      with_adult: false,
      include_adult: false,
    },
  });
  return filterTagalogContent(response.data);
};

export const getMovieRecommendations = async (movieId: number, page = 1) => {
  const with_original_language = await getLanguageParam();
  const response = await tmdbApi.get(`/discover/movie`, {
    params: {
      page,
      with_original_language,
      with_genres: (await getMovieDetails(movieId)).genres
        .map((g: any) => g.id)
        .join(','),
      sort_by: 'vote_average.desc',
      with_adult: false,
      include_adult: false,
    },
  });
  return response.data;
};

export const getSimilarTVShows = async (tvId: number, page = 1) => {
  const with_original_language = await getLanguageParam();
  const response = await tmdbApi.get(`/tv/${tvId}/similar`, {
    params: {
      page,
      with_original_language,
      with_genres: (await getTVShowDetails(tvId)).genres
        .map((g: any) => g.id)
        .join(','),
      with_adult: false,
      include_adult: false,
    },
  });
  return response.data;
};

export const getTVShowRecommendations = async (tvId: number, page = 1) => {
  const with_original_language = await getLanguageParam();
  const response = await tmdbApi.get(`/discover/tv`, {
    params: {
      page,
      with_original_language,
      with_genres: (await getTVShowDetails(tvId)).genres
        .map((g: any) => g.id)
        .join(','),
      sort_by: 'vote_average.desc',
      with_adult: false,
      include_adult: false,
    },
  });
  return response.data;
};

export const getTrending = async (
  timeWindow: 'day' | 'week' = 'day',
  page = 1,
) => {
  const response = await tmdbApi.get(`/trending/all/${timeWindow}`, {
    params: {page, with_adult: false, include_adult: false},
  });
  return response.data;
};

export const getTrendingMovies = async (
  timeWindow: 'day' | 'week' = 'day',
  page = 1,
) => {
  const response = await tmdbApi.get(`/trending/movie/${timeWindow}`, {
    params: {page, with_adult: false, include_adult: false},
  });
  return response.data;
};

export const getTrendingTVShows = async (
  timeWindow: 'day' | 'week' = 'day',
  page = 1,
) => {
  const response = await tmdbApi.get(`/trending/tv/${timeWindow}`, {
    params: {page, with_adult: false, include_adult: false},
  });
  return response.data;
};

export const discoverMovies = async (filters: any = {}, page = 1) => {
  const params: any = {
    page,
    ...filters,
    sort_by: filters.sort_by || 'popularity.desc',
    with_adult: false,
    include_adult: false,
  };

  const response = await tmdbApi.get('/discover/movie', {
    params,
  });
  return response.data;
};

export const discoverTVShows = async (filters: any = {}, page = 1) => {
  const params: any = {
    page,
    ...filters,
    sort_by: filters.sort_by || 'popularity.desc',
    with_adult: false,
    include_adult: false,
  };
  const response = await tmdbApi.get('/discover/tv', {
    params,
  });
  return response.data;
};

// Centralized OTT filter builder - single source of truth
export const buildOTTFilters = (
  providerId: number,
  kind: 'popular' | 'latest',
  contentType: 'movie' | 'tv',
  region?: string,
) => {
  const filters: any = {
    sort_by:
      kind === 'latest'
        ? contentType === 'movie'
          ? 'release_date.desc'
          : 'first_air_date.desc'
        : 'popularity.desc',
    include_adult: false,
    with_watch_providers: providerId.toString(),
    watch_region: region || 'US',
    with_watch_monetization_types: 'flatrate|ads|free',
  };

  return filters;
};

// New simplified helpers per instruction
export const getMoviesByOTT = async (providerId: number, page = 1) => {
  if (!providerId) return {results: [], page: 1, total_pages: 1};
  const region = await SettingsManager.getRegion();
  const params: any = {
    page,
    ...buildOTTFilters(providerId, 'popular', 'movie', region?.iso_3166_1),
  };
  const response = await tmdbApi.get('/discover/movie', {params});
  return response.data;
};

export const getShowsByOTT = async (providerId: number, page = 1) => {
  if (!providerId) return {results: [], page: 1, total_pages: 1};
  const region = await SettingsManager.getRegion();
  const params: any = {
    page,
    ...buildOTTFilters(providerId, 'popular', 'tv', region?.iso_3166_1),
  };
  const response = await tmdbApi.get('/discover/tv', {params});
  return response.data;
};

export const getMoviesByLanguageSimple = async (iso6391: string, page = 1) => {
  if (!iso6391) return {results: [], page: 1, total_pages: 1};
  const params: any = {
    page,
    sort_by: 'popularity.desc',
    include_adult: false,
    with_original_language: iso6391,
  };
  const response = await tmdbApi.get('/discover/movie', {params});
  return response.data;
};

export const getShowsByLanguageSimple = async (iso6391: string, page = 1) => {
  if (!iso6391) return {results: [], page: 1, total_pages: 1};
  const params: any = {
    page,
    sort_by: 'popularity.desc',
    include_adult: false,
    with_original_language: iso6391,
  };
  const response = await tmdbApi.get('/discover/tv', {params});
  return response.data;
};

// Trending movies by OTT provider
export const getTrendingMoviesByOTT = async (providerId: number, page = 1) => {
  if (!providerId) return {results: [], page: 1, total_pages: 1};
  const region = await SettingsManager.getRegion();

  // Get trending movies first
  const trendingResponse = await tmdbApi.get('/trending/movie/week', {
    params: {page, include_adult: false},
  });

  // Filter by provider availability
  const moviesWithProvider = await Promise.all(
    trendingResponse.data.results.map(async (movie: any) => {
      try {
        const providersResponse = await tmdbApi.get(
          `/movie/${movie.id}/watch/providers`,
        );
        const providers =
          providersResponse.data.results?.[region?.iso_3166_1 || 'US'];

        if (
          providers?.flatrate?.some((p: any) => p.provider_id === providerId)
        ) {
          return movie;
        }
        return null;
      } catch {
        return null;
      }
    }),
  );

  const filteredResults = moviesWithProvider.filter(m => m !== null);

  return {
    ...trendingResponse.data,
    results: filteredResults,
    total_results: filteredResults.length,
  };
};

// Trending TV shows by OTT provider
export const getTrendingTVByOTT = async (providerId: number, page = 1) => {
  if (!providerId) return {results: [], page: 1, total_pages: 1};
  const region = await SettingsManager.getRegion();

  // Get trending TV shows first
  const trendingResponse = await tmdbApi.get('/trending/tv/week', {
    params: {page, include_adult: false},
  });

  // Filter by provider availability
  const showsWithProvider = await Promise.all(
    trendingResponse.data.results.map(async (show: any) => {
      try {
        const providersResponse = await tmdbApi.get(
          `/tv/${show.id}/watch/providers`,
        );
        const providers =
          providersResponse.data.results?.[region?.iso_3166_1 || 'US'];

        if (
          providers?.flatrate?.some((p: any) => p.provider_id === providerId)
        ) {
          return show;
        }
        return null;
      } catch {
        return null;
      }
    }),
  );

  const filteredResults = showsWithProvider.filter(s => s !== null);

  return {
    ...trendingResponse.data,
    results: filteredResults,
    total_results: filteredResults.length,
  };
};

export const discoverContent = async (savedFilters: any = []) => {
  return await Promise.all(
    savedFilters.map(async (filter: SavedFilter) => {
      if (filter.type === 'movie' || filter.type === 'all') {
        return await discoverMovies(filter.params);
      } else if (filter.type === 'tv') {
        return await discoverTVShows(filter.params);
      }
    }),
  );
};

export const getSeasonDetails = async (tvId: number, seasonNumber: number) => {
  const response = await tmdbApi.get(`/tv/${tvId}/season/${seasonNumber}`);
  return response.data;
};

export const getWatchProviders = async (
  contentId: number,
  contentType: 'movie' | 'tv',
) => {
  const region = await SettingsManager.getRegion();
  const response = await tmdbApi.get(
    `/${contentType}/${contentId}/watch/providers`,
  );
  const results = response.data.results || {};
  return results[region?.iso_3166_1 || 'US'] || null;
};

export const getAvailableWatchProviders = async (region = 'US') => {
  const response = await tmdbApi.get('/watch/providers/tv', {
    params: {
      watch_region: region,
    },
  });
  return response.data.results || [];
};

export const getPersonMovieCredits = async (personId: number, page = 1) => {
  const response = await tmdbApi.get(`/person/${personId}/movie_credits`);
  const {cast, crew} = response.data;

  // Combine cast and crew, removing duplicates by movie ID
  const allCredits = [...cast, ...crew];
  const uniqueCredits = Array.from(
    new Map(allCredits.map(item => [item.id, item])).values(),
  );

  // Sort by release date, most recent first
  const sortedCredits = uniqueCredits.sort((a: any, b: any) => {
    if (!a.release_date) return 1;
    if (!b.release_date) return -1;
    return (
      new Date(b.release_date).getTime() - new Date(a.release_date).getTime()
    );
  });

  // Paginate the results
  const itemsPerPage = 20;
  const start = (page - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const paginatedCredits = sortedCredits.slice(start, end);

  return {
    page,
    results: paginatedCredits,
    total_pages: Math.ceil(sortedCredits.length / itemsPerPage),
    total_results: sortedCredits.length,
  };
};

export const getPersonTVCredits = async (personId: number, page = 1) => {
  const response = await tmdbApi.get(`/person/${personId}/tv_credits`);
  const {cast, crew} = response.data;

  // Combine cast and crew, removing duplicates by TV show ID
  const allCredits = [...cast, ...crew];
  const uniqueCredits = Array.from(
    new Map(allCredits.map(item => [item.id, item])).values(),
  );

  // Sort by first air date, most recent first
  const sortedCredits = uniqueCredits.sort((a: any, b: any) => {
    if (!a.first_air_date) return 1;
    if (!b.first_air_date) return -1;
    return (
      new Date(b.first_air_date).getTime() -
      new Date(a.first_air_date).getTime()
    );
  });

  // Paginate the results
  const itemsPerPage = 20;
  const start = (page - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const paginatedCredits = sortedCredits.slice(start, end);

  return {
    page,
    results: paginatedCredits,
    total_pages: Math.ceil(sortedCredits.length / itemsPerPage),
    total_results: sortedCredits.length,
  };
};

export const getLanguages = async () => {
  return languageData;
};

export const getLanguage = (language: string) => {
  return languageData.find((l: any) => l.iso_639_1 === language)?.english_name;
};

export const getContentByGenre = async (
  genreId: any,
  contentType: 'movie' | 'tv',
  page = 1,
  sortBy:
    | 'popularity.desc'
    | 'release_date.desc'
    | 'vote_average.desc' = 'popularity.desc',
) => {
  if (!genreId || !contentType) {
    const error = new Error('Genre ID and content type are required');
    throw error;
  }

  const with_original_language = await getLanguageParam();
  const endpoint = contentType === 'movie' ? '/discover/movie' : '/discover/tv';

  // Base params that always apply
  const params: any = {
    page,
    with_genres: genreId.toString(),
    with_original_language,
    sort_by: sortBy,
    'vote_average.gte': 7,
    'vote_count.gte': 100,
    include_null_first_air_dates: false,
    with_adult: false,
    include_adult: false,
  };

  // Only apply language filter if we have saved languages
  if (with_original_language) {
    // Make language an optional filter to get more results
    params.with_original_language = with_original_language;
  }

  // Add TV-specific filters
  if (
    contentType === 'tv' &&
    params.with_genres !== '10764' &&
    params.with_genres !== '10767'
  ) {
    params.without_genres = '10764,10767'; // Exclude reality and talk shows
  }

  const response = await tmdbApi.get(endpoint, {params});
  // Client-side filter for adult content
  if (Array.isArray(response.data.results)) {
    response.data.results = response.data.results.filter(
      (item: any) => !item.adult,
    );
  }
  return filterTagalogContent(response.data);
};

export const getRegions = async () => {
  return regionData;
};

export const getTop10MoviesTodayByRegion = async () => {
  try {
    const region = await SettingsManager.getRegion();
    const today = new Date().toISOString().split('T')[0];

    const response = await tmdbApi.get('/trending/movie/day', {
      params: {
        page: 1,
        region: region.iso_3166_1,
        'release_date.lte': today,
        sort_by: 'popularity.desc',
        // 'vote_count.gte': 50,
        without_genres: '10764,10767,10766,10763', // Reality, Talk Show, Soap, News
      },
    });

    return response.data.results.slice(0, 10);
  } catch (error) {
    return [];
  }
};

export const getTop10TVShowsTodayByRegion = async () => {
  try {
    const region = await SettingsManager.getRegion();
    if (!region?.iso_3166_1) {
      return [];
    }

    const response = await tmdbApi.get('/trending/tv/day', {
      params: {
        region: region.iso_3166_1,
      },
    });

    return response.data.results.slice(0, 10);
  } catch (error) {
    return [];
  }
};

export const getPersonDetails = async (personId: number) => {
  const response = await tmdbApi.get(`/person/${personId}`, {
    params: {
      append_to_response: 'images,combined_credits',
    },
  });
  return response.data;
};

// Search for people (actors, directors, etc.)
export const searchPeople = async (query: string) => {
  if (!query.trim()) return {results: []};
  const response = await tmdbApi.get('/search/person', {
    params: {
      query,
      include_adult: false,
    },
  });
  return response.data;
};

// Get person details by ID
export const getPersonById = async (personId: number) => {
  const response = await tmdbApi.get(`/person/${personId}`);
  return response.data;
};

// Search for keywords
export const searchKeywords = async (query: string) => {
  if (!query.trim()) return {results: []};
  const response = await tmdbApi.get('/search/keyword', {
    params: {
      query,
    },
  });
  return response.data;
};

// Get keyword details by ID
export const getKeywordById = async (keywordId: number) => {
  const response = await tmdbApi.get(`/keyword/${keywordId}`);
  return response.data;
};

// Search for production companies
export const searchCompanies = async (query: string) => {
  if (!query.trim()) return {results: []};
  const response = await tmdbApi.get('/search/company', {
    params: {
      query,
    },
  });
  return response.data;
};

// Get company details by ID
export const getCompanyById = async (companyId: number) => {
  const response = await tmdbApi.get(`/company/${companyId}`);
  return response.data;
};

// Search for TV networks
export const searchNetworks = async (query: string) => {
  if (!query.trim()) return {results: []};
  const response = await tmdbApi.get('/search/network', {
    params: {
      query,
    },
  });
  return response.data;
};

// Get network details by ID
export const getNetworkById = async (networkId: number) => {
  const response = await tmdbApi.get(`/network/${networkId}`);
  return response.data;
};

// ============================================================================
// CREDITS & CREW FUNCTIONS
// ============================================================================

// Get movie credits (cast + crew)
export const getMovieCredits = async (movieId: number) => {
  const response = await tmdbApi.get(`/movie/${movieId}/credits`);
  return response.data;
};

// Get TV show credits (cast + crew)
export const getTVCredits = async (tvId: number) => {
  const response = await tmdbApi.get(`/tv/${tvId}/credits`);
  return response.data;
};

// Helper: Extract specific crew members by job
export const extractCrewByJob = (credits: any, job: string) => {
  return credits.crew?.filter((member: any) => member.job === job) || [];
};

// Helper: Get director(s)
export const getDirectors = (credits: any) => {
  return extractCrewByJob(credits, 'Director');
};

// Helper: Get writers
export const getWriters = (credits: any) => {
  const writers = extractCrewByJob(credits, 'Writer');
  const screenplay = extractCrewByJob(credits, 'Screenplay');
  const story = extractCrewByJob(credits, 'Story');
  // Deduplicate by person ID
  const uniqueWriters = new Map();
  [...writers, ...screenplay, ...story].forEach(writer => {
    if (!uniqueWriters.has(writer.id)) {
      uniqueWriters.set(writer.id, writer);
    }
  });
  return Array.from(uniqueWriters.values());
};

// Helper: Get composer(s) - returns array to handle multiple composers
export const getComposer = (credits: any) => {
  // Collect all possible composer job titles
  const composers = [
    ...extractCrewByJob(credits, 'Original Music Composer'),
    ...extractCrewByJob(credits, 'Music'),
    ...extractCrewByJob(credits, 'Original Score'),
    ...extractCrewByJob(credits, 'Composer'),
  ];

  // Deduplicate by person ID
  const uniqueComposers = Array.from(
    new Map(composers.map(c => [c.id, c])).values(),
  );

  return uniqueComposers;
};

// Helper: Get cinematographer (Director of Photography)
export const getCinematographer = (credits: any) => {
  return extractCrewByJob(credits, 'Director of Photography')[0];
};

// Helper: Get producers
export const getProducers = (credits: any) => {
  const producers = extractCrewByJob(credits, 'Producer');
  const executiveProducers = extractCrewByJob(credits, 'Executive Producer');
  return [...producers, ...executiveProducers];
};

// Get all movies by a specific director
export const getMoviesByDirector = async (directorId: number) => {
  const response = await tmdbApi.get(`/person/${directorId}/movie_credits`);
  // Filter only movies where they were director
  const directedMovies =
    response.data.crew?.filter((credit: any) => credit.job === 'Director') ||
    [];
  return directedMovies;
};

// Get all TV shows by a specific creator/director
export const getTVShowsByCreator = async (creatorId: number) => {
  const response = await tmdbApi.get(`/person/${creatorId}/tv_credits`);
  return response.data.crew || [];
};

// Get all movies by a specific actor
export const getMoviesByActor = async (actorId: number) => {
  const response = await tmdbApi.get(`/person/${actorId}/movie_credits`);
  return response.data.cast || [];
};

// Get all TV shows by a specific actor
export const getTVShowsByActor = async (actorId: number) => {
  const response = await tmdbApi.get(`/person/${actorId}/tv_credits`);
  return response.data.cast || [];
};

// Get movie reviews
export const getMovieReviews = async (movieId: number, page = 1) => {
  const response = await tmdbApi.get(`/movie/${movieId}/reviews`, {
    params: {
      page,
      language: 'en-US',
    },
  });
  return response.data;
};

// Get TV show reviews
export const getTVShowReviews = async (tvId: number, page = 1) => {
  const response = await tmdbApi.get(`/tv/${tvId}/reviews`, {
    params: {
      page,
      language: 'en-US',
    },
  });
  return response.data;
};

export const checkTMDB = async (): Promise<boolean> => {
  try {
    // Use Promise.race for reliable timeout with axios
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('TMDB check timeout')), 3000),
    );

    const checkPromise = tmdbApi.get('/configuration', {
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    });

    await Promise.race([checkPromise, timeoutPromise]);
    console.log('TMDB API Check SUCCESS');
    return true;
  } catch (error: any) {
    // If we got a response (even 4xx/5xx), it means we reached the server
    if (error.response) {
      console.log(
        'TMDB API Check Reachable (Response received):',
        error.response.status,
      );
      return true;
    }

    console.log(
      'TMDB API Check FAILED (Network/DNS):',
      error?.message || error,
    );
    return false;
  }
};

export async function fetchContentFromAI(
  aiResponse: {title: string; year: string}[],
  type: 'movie' | 'tv',
) {
  return Promise.all(
    aiResponse.map(content =>
      tmdbApi
        .get(`/search/${type}`, {
          params: {
            query: content.title,
            year: content.year,
          },
        })
        .then(res => res?.data?.results[0])
        .catch(() => null),
    ),
  ).then(results => results.filter(Boolean));
}

export const getCollectionDetails = async (collectionId: number) => {
  const response = await tmdbApi.get(`/collection/${collectionId}`);
  return response.data;
};
