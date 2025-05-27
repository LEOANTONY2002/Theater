import axios from 'axios';

const TMDB_API_KEY = 'ddc242ac9b33e6c9054b5193c541ffbb';
const BASE_URL = 'https://api.themoviedb.org/3';

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
  type: 'latest' | 'popular' | 'top_rated',
  page = 1,
) => {
  const today = new Date().toISOString().split('T')[0];
  const params: any = {
    page,
    sort_by: 'first_air_date.desc',
    without_genres: '10764,10767,10766,10763', // Reality, Talk Show, Soap, News
    with_original_language: 'en',
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
  const response = await tmdbApi.get(`/tv/${type}`, {
    params: {
      page,
    },
  });
  return response.data;
};

// export const getTVShows = async (
//   type: 'latest' | 'popular' | 'top_rated',
//   page = 1,
// ) => {
//   const sortMap = {
//     latest: 'first_air_date.desc',
//     popular: 'popularity.desc',
//     top_rated: 'vote_average.desc',
//   };

//   const today = new Date().toISOString().split('T')[0];

//   const params: any = {
//     page,
//     sort_by: sortMap[type],
//     with_type: 0, // Only scripted shows
//     with_original_language: 'en',
//     'first_air_date.lte': today,
//     'vote_count.gte': 10,
//     without_genres: '10764,10767,10766,10763', // Reality, Talk, Soap, News
//     include_null_first_air_dates: false,
//   };

//   const response = await tmdbApi.get('/discover/tv', { params });
//   return response.data;
// };

// Use basic TV endpoints for popular and top_rated

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
