import axios from 'axios';
import {tmdbApi} from './api';
import {FilterParams} from '../types/filters';
import {SettingsManager} from '../store/settings';

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
  const with_original_language = await getLanguageParam();
  console.log('with_original_language', with_original_language);
  const params: any = {
    page,
    sort_by: 'release_date.desc',
    with_original_language,
    'release_date.lte': today,
    'vote_count.gte': 6,
  };
  if (type === 'latest') {
    const response = await tmdbApi.get('/discover/movie', {params});
    return response.data;
  }
  if (type === 'popular') {
    params.sort_by = 'popularity.desc';
    const response = await tmdbApi.get('/discover/movie', {params});
    return response.data;
  }
  if (type === 'top_rated') {
    params.sort_by = 'vote_average.desc';
    params['vote_count.gte'] = 7;
    params['vote_average.gte'] = 7;
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
  const with_original_language = await getLanguageParam();
  const params: any = {
    page,
    sort_by: 'first_air_date.desc',
    without_genres: '10764,10767,10766,10763', // Reality, Talk Show, Soap, News
    with_original_language,
    'first_air_date.lte': today,
    'vote_count.gte': 6,
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
    params['vote_count.gte'] = 7;
    params['vote_average.gte'] = 7;
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
  if (!query) {
    const with_original_language = await getLanguageParam();
    const params = {
      page,
      sort_by: 'popularity.desc',
      ...filters,
      with_original_language:
        filters.with_original_language || with_original_language,
    };
    const response = await tmdbApi.get('/discover/movie', {params});
    return response.data;
  }
  const response = await tmdbApi.get('/search/movie', {
    params: {
      query,
      page,
      ...filters,
    },
  });
  return response.data;
};

export const searchTVShows = async (
  query: string,
  page = 1,
  filters: FilterParams = {},
) => {
  if (!query) {
    const with_original_language = await getLanguageParam();
    const params = {
      page,
      sort_by: 'popularity.desc',
      ...filters,
      with_original_language:
        filters.with_original_language || with_original_language,
    };
    const response = await tmdbApi.get('/discover/tv', {params});
    return response.data;
  }
  const response = await tmdbApi.get('/search/tv', {
    params: {
      query,
      page,
      ...filters,
    },
  });
  return response.data;
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
  size: 'w500' | 'original' = 'w500',
) => {
  return `https://image.tmdb.org/t/p/${size}${path}`;
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

export const getTrendingMovies = async (
  timeWindow: 'day' | 'week' = 'day',
  page = 1,
) => {
  const response = await tmdbApi.get(`/trending/movie/${timeWindow}`, {
    params: {page},
  });
  return response.data;
};

export const getTrendingTVShows = async (
  timeWindow: 'day' | 'week' = 'day',
  page = 1,
) => {
  const response = await tmdbApi.get(`/trending/tv/${timeWindow}`, {
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

export const getSeasonDetails = async (tvId: number, seasonNumber: number) => {
  const response = await tmdbApi.get(`/tv/${tvId}/season/${seasonNumber}`);
  return response.data;
};

export const getWatchProviders = async (
  contentId: number,
  contentType: 'movie' | 'tv',
) => {
  const response = await tmdbApi.get(
    `/${contentType}/${contentId}/watch/providers`,
  );
  return response.data;
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
  const response = await tmdbApi.get('/configuration/languages');
  return response.data;
};
