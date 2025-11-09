import {Language} from '../store/settings';

export type SortOption = {
  label: string;
  value: string;
};

export interface FilterParams {
  sort_by?: string;
  'vote_average.gte'?: number;
  'vote_average.lte'?: number;
  'primary_release_date.gte'?: string;
  'primary_release_date.lte'?: string;
  'first_air_date.gte'?: string;
  'first_air_date.lte'?: string;
  with_genres?: string;
  without_genres?: string;
  genre_operator?: 'AND' | 'OR'; // How to combine genres: OR (any) or AND (all)
  with_original_language?: string;
  with_watch_providers?: string;
  watch_region?: string;
  with_runtime_gte?: number;
  with_runtime_lte?: number;
  
  // Phase 2: Advanced Filters
  with_cast?: string; // Person IDs (comma-separated)
  with_crew?: string; // Person IDs (comma-separated)
  with_people?: string; // Either cast or crew
  with_keywords?: string; // Keyword IDs (comma-separated)
  without_keywords?: string; // Exclude keywords
  with_companies?: string; // Production companies (comma-separated)
  with_networks?: string; // TV networks (comma-separated)
  'vote_count.gte'?: number; // Minimum vote count
  'vote_count.lte'?: number; // Maximum vote count
  'with_popularity.gte'?: number; // Minimum popularity
  'with_popularity.lte'?: number; // Maximum popularity
  
  // Phase 3: Release Type & Certification
  certification?: string; // Age rating (e.g., "PG-13", "R")
  certification_country?: string; // Country for certification (default: US)
  'certification.gte'?: string; // Minimum certification
  'certification.lte'?: string; // Maximum certification
  with_release_type?: string; // Release type (1-6, pipe-separated)
  with_runtime?: number; // Exact runtime (deprecated, use range)
}

export interface SavedFilter {
  id: string;
  name: string;
  params: FilterParams;
  type: 'all' | 'movie' | 'tv';
  createdAt: number;
}

// US Movie Certifications (in order of restriction)
export const US_CERTIFICATIONS = [
  {value: 'G', label: 'G - General Audiences'},
  {value: 'PG', label: 'PG - Parental Guidance'},
  {value: 'PG-13', label: 'PG-13 - Parents Cautioned'},
  {value: 'R', label: 'R - Restricted'},
  {value: 'NC-17', label: 'NC-17 - Adults Only'},
  {value: 'NR', label: 'NR - Not Rated'},
];

// US TV Content Ratings
export const US_TV_RATINGS = [
  {value: 'TV-Y', label: 'TV-Y - All Children'},
  {value: 'TV-Y7', label: 'TV-Y7 - Older Children'},
  {value: 'TV-G', label: 'TV-G - General Audience'},
  {value: 'TV-PG', label: 'TV-PG - Parental Guidance'},
  {value: 'TV-14', label: 'TV-14 - Parents Cautioned'},
  {value: 'TV-MA', label: 'TV-MA - Mature Audience'},
];

// Release Types (TMDB values)
export const RELEASE_TYPES = [
  {value: '1', label: 'Premiere'},
  {value: '2', label: 'Theatrical (Limited)'},
  {value: '3', label: 'Theatrical'},
  {value: '4', label: 'Digital'},
  {value: '5', label: 'Physical'},
  {value: '6', label: 'TV'},
];

export const SORT_OPTIONS = [
  {label: 'Popularity Descending', value: 'popularity.desc'},
  {label: 'Popularity Ascending', value: 'popularity.asc'},
  {label: 'Rating Descending', value: 'vote_average.desc'},
  {label: 'Rating Ascending', value: 'vote_average.asc'},
  {label: 'Release Date Descending', value: 'primary_release_date.desc'},
  {label: 'Release Date Ascending', value: 'primary_release_date.asc'},
  {label: 'Title (A-Z)', value: 'original_title.asc'},
  {label: 'Title (Z-A)', value: 'original_title.desc'},
];

export const LANGUAGE_OPTIONS = [
  {label: 'English', value: 'en'},
  {label: 'Spanish', value: 'es'},
  {label: 'French', value: 'fr'},
  {label: 'German', value: 'de'},
  {label: 'Italian', value: 'it'},
  {label: 'Japanese', value: 'ja'},
  {label: 'Korean', value: 'ko'},
  {label: 'Chinese', value: 'zh'},
];
