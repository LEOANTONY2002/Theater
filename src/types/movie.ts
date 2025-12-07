export type Movie = {
  id: number;
  title: string;
  originalTitle: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  vote_average: number;
  release_date: string;
  genre_ids: number[];
  popularity: number;
  original_language: string;
};

export interface MovieDetails extends Movie {
  genres: Genre[];
  runtime: number;
  tagline?: string;
  budget?: number;
  revenue?: number;
  videos: {
    results: Video[];
  };
  credits: {
    cast: Cast[];
    crew: Crew[];
  };
  images?: {
    backdrops: ImageData[];
    posters: ImageData[];
    logos: ImageData[];
  };
  keywords?: {
    keywords: Keyword[];
  };
  release_dates?: {
    results: ReleaseDate[];
  };
  external_ids?: ExternalIds;
  belongs_to_collection?: Collection | null;
  production_companies?: ProductionCompany[];
  spoken_languages?: SpokenLanguage[];
  imdb_id?: string;
}

export interface Genre {
  id: number;
  name: string;
}

export interface Video {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
}

export interface Cast {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

export interface Crew {
  id: number;
  name: string;
  job: string;
  profile_path: string | null;
}

export interface MoviesResponse {
  page: number;
  results: Movie[];
  total_pages: number;
  total_results: number;
}

export interface ImageData {
  aspect_ratio: number;
  height: number;
  iso_639_1: string | null;
  file_path: string;
  vote_average: number;
  vote_count: number;
  width: number;
}

export interface Keyword {
  id: number;
  name: string;
}

export interface ReleaseDate {
  iso_3166_1: string;
  release_dates: {
    certification: string;
    iso_639_1: string;
    note: string;
    release_date: string;
    type: number;
  }[];
}

export interface ContentRating {
  iso_3166_1: string;
  rating: string;
}

export interface ExternalIds {
  imdb_id?: string | null;
  facebook_id?: string | null;
  instagram_id?: string | null;
  twitter_id?: string | null;
  wikidata_id?: string | null;
}

export interface Collection {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
}

export interface ProductionCompany {
  id: number;
  name: string;
  logo_path: string | null;
  origin_country: string;
}

export interface SpokenLanguage {
  english_name: string;
  iso_639_1: string;
  name: string;
}
