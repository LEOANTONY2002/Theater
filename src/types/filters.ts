export type SortOption = {
  label: string;
  value: string;
};

export type FilterParams = {
  sort_by?: string;
  'vote_average.gte'?: number;
  'vote_average.lte'?: number;
  'primary_release_date.gte'?: string;
  'primary_release_date.lte'?: string;
  'first_air_date.gte'?: string;
  'first_air_date.lte'?: string;
  with_genres?: string;
  with_original_language?: string;
  with_watch_providers?: string;
  watch_region?: string;
  with_runtime_gte?: number;
  with_runtime_lte?: number;
  include_adult?: boolean;
};

export const SORT_OPTIONS: SortOption[] = [
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
