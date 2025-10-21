import {Movie} from './movie';
import {TVShow} from './tvshow';
import {NavigatorScreenParams} from '@react-navigation/native';
import {ContentItem} from '../components/MovieList';
import {SavedFilter, FilterParams} from './filters';

export type MovieCategoryType =
  | 'latest'
  | 'popular'
  | 'top_rated'
  | 'now_playing'
  | 'upcoming'
  | 'trending_day'
  | 'trending_week';
export type TVShowCategoryType = 'latest' | 'popular' | 'top_rated' | 'trending_day' | 'trending_week';
export type ContentType = 'movie' | 'tv';

export type HomeStackParamList = {
  HomeScreen: undefined;
  MovieDetails: {movie: Movie};
  TVShowDetails: {show: TVShow};
  Category: {
    title: string;
    categoryType: MovieCategoryType | TVShowCategoryType;
    contentType: ContentType;
    genreId?: number;
  };
  Genre: {
    genreId: number;
    genreName: string;
    contentType: ContentType;
  };
  PersonCredits: {
    personId: number;
    personName: string;
    contentType: ContentType;
  };
};

export type SearchStackParamList = {
  SearchScreen: {
    filter?: SavedFilter;
  };
  MovieDetails: {movie: Movie};
  TVShowDetails: {show: TVShow};
  PersonCredits: {
    personId: number;
    personName: string;
    contentType: ContentType;
  };
  Category: {
    title: string;
    categoryType?: MovieCategoryType | TVShowCategoryType;
    // Use a concrete content type; when using SavedFilter, the hook ignores this
    contentType: 'movie' | 'tv';
    filter?: SavedFilter | FilterParams;
  };
};

export type MoviesAndSeriesStackParamList = {
  MoviesAndSeriesScreen: undefined;
  MovieDetails: {movie: Movie};
  TVShowDetails: {show: TVShow};
  Category: {
    title: string;
    categoryType?: MovieCategoryType | TVShowCategoryType;
    contentType: 'movie' | 'tv';
    filter?: SavedFilter;
    fromSearch?: boolean;
  };
  Genre: {
    genreId: number;
    genreName: string;
    contentType: 'movie' | 'tv';
  };
  PersonCredits: {
    personId: number;
    personName: string;
    contentType: ContentType;
  };
};

export type MoviesStackParamList = {
  MovieDetails: {movie: Movie};
  TVShowDetails: {show: TVShow};
  Category: {
    title: string;
    categoryType?: MovieCategoryType | TVShowCategoryType;
    contentType: 'movie' | 'tv';
    filter?: any;
    fromSearch?: boolean;
  };
  Genre: {
    genreId: number;
    genreName: string;
    contentType: 'movie' | 'tv';
  };
  PersonCredits: {
    personId: number;
    personName: string;
    contentType: ContentType;
  };
};

export type TVShowsStackParamList = {
  MovieDetails: {movie: Movie};
  TVShowDetails: {show: TVShow};
  Category: {
    title: string;
    categoryType?: MovieCategoryType | TVShowCategoryType;
    contentType: 'movie' | 'tv';
    filter?: any;
    fromSearch?: boolean;
  };
  Genre: {
    genreId: number;
    genreName: string;
    contentType: 'movie' | 'tv';
  };
  PersonCredits: {
    personId: number;
    personName: string;
    contentType: ContentType;
  };
};

export type FiltersStackParamList = {
  FiltersScreen: undefined;
  MovieDetails: {movie: Movie};
  TVShowDetails: {show: TVShow};
  Category: {
    title: string;
    categoryType?: MovieCategoryType | TVShowCategoryType;
    contentType: 'movie' | 'tv';
    filter?: SavedFilter;
    fromSearch?: boolean;
  };
  Genre: {
    genreId: number;
    genreName: string;
    contentType: 'movie' | 'tv';
  };
  PersonCredits: {
    personId: number;
    personName: string;
    contentType: ContentType;
  };
};

export type MySpaceStackParamList = {
  MySpaceScreen: undefined;
  MyFiltersScreen: undefined;
  WatchlistsScreen: undefined;
  MovieDetails: {movie: Movie};
  TVShowDetails: {show: TVShow};
  SearchScreen: {
    filter?: SavedFilter;
  };
  PersonCredits: {
    personId: number;
    personName: string;
    contentType: ContentType;
  };
  WatchlistDetails: {
    watchlistId: string;
  };
  OnlineAIScreen: undefined;
  AISettingsScreen: undefined;
  AboutLegalScreen: undefined;
};

export type TabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  Search: NavigatorScreenParams<SearchStackParamList>;
  MoviesAndSeries: NavigatorScreenParams<MoviesAndSeriesStackParamList>;
  Filters: NavigatorScreenParams<FiltersStackParamList>;
  MySpace: NavigatorScreenParams<MySpaceStackParamList>;
};

export type RootStackParamList = {
  Main: NavigatorScreenParams<TabParamList>;
};

export interface PersonDetails {
  id: number;
  name: string;
  biography: string;
  birthday: string;
  place_of_birth: string;
  profile_path: string;
  known_for_department: string;
}

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
