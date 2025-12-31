import axios from 'axios';

const TMDB_API_KEY = 'ddc242ac9b33e6c9054b5193c541ffbb';
const BASE_URL = 'https://api.themoviedb.org/3';

export const tmdbApi = axios.create({
  baseURL: BASE_URL,
  params: {
    api_key: TMDB_API_KEY,
    include_adult: false,
  },
  timeout: 15000,
});
