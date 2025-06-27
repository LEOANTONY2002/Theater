import axios from 'axios';
import {tmdbApi} from './api';
import {FilterParams, SavedFilter} from '../types/filters';
import {SettingsManager} from '../store/settings';
import languageData from '../utils/language.json';
import regionData from '../utils/region.json';

const getLanguageParam = async () => {
  const contentLanguages = await SettingsManager.getContentLanguages();
  if (contentLanguages.length === 0) return undefined;
  return contentLanguages.map(lang => lang.iso_639_1).join('|');
};

export const getMovies = async (
  type: 'latest' | 'popular' | 'top_rated' | 'upcoming' | 'now_playing',
  page = 1,
) => {
  const today = new Date().toISOString().split('T')[0];
  const start = new Date('2000-01-01').toISOString().split('T')[0];
  const with_original_language = await getLanguageParam();
  const params: any = {
    page,
    sort_by: 'release_date.desc',
    with_original_language,
    'release_date.lte': today,
    'release_date.gte': start,
    'vote_average.gte': 4,
    'vote_count.gte': 100,
    with_adult: false,
  };
  if (type === 'latest') {
    const response = await tmdbApi.get('/discover/movie', {params});
    return response.data;
  }
  if (type === 'popular') {
    params.sort_by = 'popularity.desc';
    params['vote_average.gte'] = 6;
    const response = await tmdbApi.get('/discover/movie', {params});
    return response.data;
  }
  if (type === 'top_rated') {
    params.sort_by = 'vote_average.desc';
    // params['vote_count.gte'] = 100;
    params['vote_average.gte'] = 7;
    params['vote_average.lte'] = 9;
    const response = await tmdbApi.get('/discover/movie', {params});
    return response.data;
  }

  // For other types, use built-in endpoints
  const response = await tmdbApi.get(`/movie/${type}`, {
    params: {page, with_original_language},
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
  const params: any = {
    page,
    sort_by: 'first_air_date.desc',
    without_genres: '10764,10767,10766,10763', // Reality, Talk Show, Soap, News
    with_original_language,
    'first_air_date.lte': today,
    'first_air_date.gte': start,
    'vote_average.gte': 4,
    'vote_count.gte': 100,
  };
  if (type === 'latest') {
    const response = await tmdbApi.get('/discover/tv', {params});
    return response.data;
  }
  if (type === 'popular') {
    params.sort_by = 'popularity.desc';
    const response = await tmdbApi.get('/discover/tv', {params});
    return response.data;
  }
  if (type === 'top_rated') {
    params.sort_by = 'vote_average.desc';
    params['vote_average.gte'] = 7;
    params['vote_average.lte'] = 9.5;
    const response = await tmdbApi.get('/discover/tv', {params});
    return response.data;
  }
  const response = await tmdbApi.get(`/tv/${type}`, {
    params: {
      page,
      with_original_language,
    },
  });
  return response.data;
};

export const searchMovies = async (
  query: string,
  page = 1,
  filters: FilterParams = {},
) => {
  const with_original_language = await getLanguageParam();
  const params = {
    page,
    ...filters,
    // with_original_language:
    //   filters.with_original_language || with_original_language,
  };

  if (!query) {
    const response = await tmdbApi.get('/discover/movie', {params});
    return response.data;
  }

  // For search queries, we need to use the search endpoint
  // but still respect the sort_by parameter if provided
  const searchResponse = await tmdbApi.get('/search/movie', {
    params: {
      query,
      page,
      ...filters,
    },
  });

  // If there's a sort_by parameter, sort the results manually
  if (filters.sort_by) {
    const [field, order] = filters.sort_by.split('.');
    const multiplier = order === 'desc' ? -1 : 1;

    searchResponse.data.results.sort((a: any, b: any) => {
      let aValue = a[field];
      let bValue = b[field];

      // Handle special cases
      if (field === 'title') {
        aValue = a.title;
        bValue = b.title;
      } else if (field === 'release_date') {
        aValue = a.release_date ? new Date(a.release_date).getTime() : 0;
        bValue = b.release_date ? new Date(b.release_date).getTime() : 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return multiplier * aValue.localeCompare(bValue);
      }
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return multiplier * (aValue - bValue);
      }
      return 0;
    });
  }

  return searchResponse.data;
};

export const searchTVShows = async (
  query: string,
  page = 1,
  filters: FilterParams = {},
) => {
  const with_original_language = await getLanguageParam();
  const params = {
    page,
    ...filters,
    // with_original_language:
    //   filters.with_original_language || with_original_language,
  };

  if (!query) {
    const response = await tmdbApi.get('/discover/tv', {params});
    return response.data;
  }

  // For search queries, we need to use the search endpoint
  // but still respect the sort_by parameter if provided
  const searchResponse = await tmdbApi.get('/search/tv', {
    params: {
      query,
      page,
      ...filters,
    },
  });

  // If there's a sort_by parameter, sort the results manually
  if (filters.sort_by) {
    const [field, order] = filters.sort_by.split('.');
    const multiplier = order === 'desc' ? -1 : 1;

    searchResponse.data.results.sort((a: any, b: any) => {
      let aValue = a[field];
      let bValue = b[field];

      // Handle special cases
      if (field === 'title') {
        aValue = a.name;
        bValue = b.name;
      } else if (field === 'release_date') {
        aValue = a.first_air_date ? new Date(a.first_air_date).getTime() : 0;
        bValue = b.first_air_date ? new Date(b.first_air_date).getTime() : 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return multiplier * aValue.localeCompare(bValue);
      }
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return multiplier * (aValue - bValue);
      }
      return 0;
    });
  }

  return searchResponse.data;
};

export const searchFilterContent = async (
  savedFilter: SavedFilter,
  page = 1,
) => {
  if (savedFilter.type === 'movie' || savedFilter.type === 'all') {
    let res = await searchMovies('', page, savedFilter.params);
    if (res?.results?.length > 0) {
      return {
        ...savedFilter,
        results: res.results.map((result: any) => ({
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
      return {
        ...savedFilter,
        results: res.results.map((result: any) => ({
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
  const response = await tmdbApi.get(`/movie/${movieId}`, {
    params: {append_to_response: 'videos,credits'},
  });
  return response.data;
};

export const getTVShowDetails = async (tvId: number) => {
  const response = await tmdbApi.get(`/tv/${tvId}`, {
    params: {append_to_response: 'videos,credits'},
  });
  return response.data;
};

export const getGenres = async (type: 'movie' | 'tv' = 'movie') => {
  const response = await tmdbApi.get(`/genre/${type}/list`);
  return response.data.genres;
};

export const getImageUrl = (
  path: string,
  size: 'w154' | 'w185' | 'w300' | 'w500' | 'original' = 'w185',
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
  const response = await tmdbApi.get(`/discover/movie`, {
    params: {
      page,
      with_original_language,
      with_genres: (await getMovieDetails(movieId)).genres
        .map((g: any) => g.id)
        .join(','),
    },
  });
  return response.data;
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
    },
  });
  return response.data;
};

export const getSimilarTVShows = async (tvId: number, page = 1) => {
  const with_original_language = await getLanguageParam();
  const response = await tmdbApi.get(`/discover/tv`, {
    params: {
      page,
      with_original_language,
      with_genres: (await getTVShowDetails(tvId)).genres
        .map((g: any) => g.id)
        .join(','),
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
    },
  });
  return response.data;
};

export const getTrending = async (
  timeWindow: 'day' | 'week' = 'day',
  page = 1,
) => {
  const response = await tmdbApi.get(`/trending/all/${timeWindow}`, {
    params: {page},
  });
  return response.data;
};

export const getTrendingMovies = async (
  timeWindow: 'day' | 'week' = 'day',
  page = 1,
) => {
  const with_original_language = await getLanguageParam();
  const response = await tmdbApi.get(`/discover/movie/${timeWindow}`, {
    params: {page},
  });
  return response.data;
};

export const getTrendingTVShows = async (
  timeWindow: 'day' | 'week' = 'day',
  page = 1,
) => {
  const with_original_language = await getLanguageParam();
  const response = await tmdbApi.get(`/discover/tv/${timeWindow}`, {
    params: {page},
  });
  return response.data;
};

export const discoverMovies = async (params: any = {}, page = 1) => {
  const response = await tmdbApi.get('/discover/movie', {
    params: {
      page,
      ...params,
    },
  });
  return response.data;
};

export const discoverTVShows = async (params: any = {}, page = 1) => {
  const response = await tmdbApi.get('/discover/tv', {
    params: {
      page,
      ...params,
      with_type: params.with_type || '0', // Default to scripted series
    },
  });
  return response.data;
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

export const getPersonMovieCredits = async (personId: number, page = 1) => {
  const response = await tmdbApi.get(`/person/${personId}/movie_credits`);
  const {cast} = response.data;
  // Sort by release date, most recent first
  const sortedCast = cast.sort((a: any, b: any) => {
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
  const paginatedCast = sortedCast.slice(start, end);

  return {
    page,
    results: paginatedCast,
    total_pages: Math.ceil(sortedCast.length / itemsPerPage),
    total_results: sortedCast.length,
  };
};

export const getPersonTVCredits = async (personId: number, page = 1) => {
  const response = await tmdbApi.get(`/person/${personId}/tv_credits`);
  const {cast} = response.data;
  // Sort by first air date, most recent first
  const sortedCast = cast.sort((a: any, b: any) => {
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
  const paginatedCast = sortedCast.slice(start, end);

  return {
    page,
    results: paginatedCast,
    total_pages: Math.ceil(sortedCast.length / itemsPerPage),
    total_results: sortedCast.length,
  };
};

export const getLanguages = async () => {
  return languageData;
};

export const getLanguage = (language: string) => {
  return languageData.find((l: any) => l.iso_639_1 === language)?.english_name;
};

export const getContentByGenre = async (
  genreId: number,
  contentType: 'movie' | 'tv',
  page = 1,
  sortBy:
    | 'popularity.desc'
    | 'release_date.desc'
    | 'vote_average.desc' = 'popularity.desc',
) => {
  if (!genreId || !contentType) {
    const error = new Error('Genre ID and content type are required');
    console.error('Invalid parameters:', {genreId, contentType, error});
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
    include_adult: false,
    include_null_first_air_dates: false,
  };

  // Only apply language filter if we have saved languages
  if (with_original_language) {
    // Make language an optional filter to get more results
    params.with_original_language = with_original_language;
  }

  // Add TV-specific filters
  if (contentType === 'tv') {
    params.without_genres = '10764,10767'; // Exclude reality and talk shows
  }

  try {
    const response = await tmdbApi.get(endpoint, {params});
    const responseData = {
      status: response.status,
      page: response.data.page,
      total_pages: response.data.total_pages,
      total_results: response.data.total_results,
      results_count: response.data.results?.length,
      first_result: response.data.results?.[0]?.id,
    };
    return response.data;
  } catch (error: any) {
    const errorDetails = {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    };
    console.error('API call failed:', errorDetails);
    throw error;
  }
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
    console.error('Error fetching top 10 movies:', error);
    return [];
  }
};

export const getTop10TVShowsTodayByRegion = async () => {
  try {
    const region = await SettingsManager.getRegion();
    if (!region?.iso_3166_1) {
      console.warn('No region set for getTop10TVShowsTodayByRegion');
      return [];
    }

    const response = await tmdbApi.get('/trending/tv/day', {
      params: {
        region: region.iso_3166_1,
      },
    });

    return response.data.results.slice(0, 10);
  } catch (error) {
    console.error('Error fetching top 10 TV shows:', error);
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
