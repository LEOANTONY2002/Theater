import axios from 'axios';

const TMDB_API_KEY = 'ddc242ac9b33e6c9054b5193c541ffbb';
const BASE_URL = 'https://api.themoviedb.org/3';
const YOUTUBE_API_KEY = 'YOUR_YOUTUBE_API_KEY'; // Replace with your actual API key

export const tmdbApi = axios.create({
  baseURL: BASE_URL,
  params: {
    api_key: TMDB_API_KEY,
  },
});

export const getMovies = async (
  type: 'latest' | 'popular' | 'top_rated' | 'upcoming' | 'now_playing',
  page = 1,
) => {
  const response = await tmdbApi.get(`/movie/${type}`, {params: {page}});
  return response.data;
};

export const getTVShows = async (
  type: 'latest' | 'popular' | 'top_rated' | 'on_the_air' | 'airing_today',
  page = 1,
) => {
  const response = await tmdbApi.get(`/tv/${type}`, {params: {page}});
  return response.data;
};

export const searchMovies = async (query: string, page = 1) => {
  if (!query) {
    const response = await tmdbApi.get('/discover/movie', {
      params: {
        page,
        sort_by: 'popularity.desc',
      },
    });
    return response.data;
  }
  const response = await tmdbApi.get('/search/movie', {params: {query, page}});
  return response.data;
};

export const searchTVShows = async (query: string, page = 1) => {
  if (!query) {
    const response = await tmdbApi.get('/discover/tv', {
      params: {
        page,
        sort_by: 'popularity.desc',
      },
    });
    return response.data;
  }
  const response = await tmdbApi.get('/search/tv', {params: {query, page}});
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
  const response = await tmdbApi.get(`/movie/${movieId}/similar`, {
    params: {page},
  });
  return response.data;
};

export const getMovieRecommendations = async (movieId: number, page = 1) => {
  const response = await tmdbApi.get(`/movie/${movieId}/recommendations`, {
    params: {page},
  });
  return response.data;
};

export const getSimilarTVShows = async (tvId: number, page = 1) => {
  const response = await tmdbApi.get(`/tv/${tvId}/similar`, {params: {page}});
  return response.data;
};

export const getTVShowRecommendations = async (tvId: number, page = 1) => {
  const response = await tmdbApi.get(`/tv/${tvId}/recommendations`, {
    params: {page},
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
    },
  });
  return response.data;
};
