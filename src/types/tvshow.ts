import {Video, Genre, Cast, Crew} from './movie';

export type TVShow = {
  id: number;
  name: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  vote_average: number;
  first_air_date: string;
  genre_ids: number[];
  origin_country: string[];
  popularity: number;
  original_language: string;
};

export interface TVShowDetails extends TVShow {
  created_by: {
    id: number;
    name: string;
    profile_path: string | null;
  }[];
  episode_run_time: number[];
  genres: Genre[];
  homepage: string;
  in_production: boolean;
  languages: string[];
  last_air_date: string;
  networks: {
    id: number;
    name: string;
    logo_path: string | null;
  }[];
  number_of_episodes: number;
  number_of_seasons: number;
  production_companies: {
    id: number;
    name: string;
    logo_path: string | null;
  }[];
  seasons: {
    id: number;
    name: string;
    overview: string;
    poster_path: string | null;
    air_date: string;
    episode_count: number;
    season_number: number;
  }[];
  status: string;
  type: string;
  videos: {
    results: Video[];
  };
  credits: {
    cast: Cast[];
    crew: Crew[];
  };
}

export interface TVShowsResponse {
  page: number;
  results: TVShow[];
  total_pages: number;
  total_results: number;
}

export interface Episode {
  id: number;
  name: string;
  overview: string;
  still_path: string | null;
  air_date: string;
  episode_number: number;
  season_number: number;
  runtime: number;
  vote_average: number;
}

export interface SeasonDetails {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  air_date: string;
  season_number: number;
  episodes: Episode[];
}
