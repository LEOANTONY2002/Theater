import {Movie} from './movie';
import {TVShow} from './tvshow';
import {NavigatorScreenParams} from '@react-navigation/native';
import {ContentItem} from '../components/MovieList';
import {SavedFilter} from './filters';

export type MovieCategoryType =
  | 'latest'
  | 'popular'
  | 'top_rated'
  | 'now_playing'
  | 'upcoming';
export type TVShowCategoryType = 'latest' | 'popular' | 'top_rated';
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
};

export type MoviesStackParamList = {
  MoviesScreen: undefined;
  MovieDetails: {movie: Movie};
  Category: {
    title: string;
    categoryType: MovieCategoryType;
    contentType: 'movie';
    genreId?: number;
  };
  Genre: {
    genreId: number;
    genreName: string;
    contentType: 'movie';
  };
  PersonCredits: {
    personId: number;
    personName: string;
    contentType: ContentType;
  };
};

export type TVShowsStackParamList = {
  TVShowsScreen: undefined;
  TVShowDetails: {show: TVShow};
  Category: {
    title: string;
    categoryType: TVShowCategoryType;
    contentType: 'tv';
    genreId?: number;
  };
  Genre: {
    genreId: number;
    genreName: string;
    contentType: 'tv';
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
};

export type TabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  Search: NavigatorScreenParams<SearchStackParamList>;
  Movies: NavigatorScreenParams<MoviesStackParamList>;
  TVShows: NavigatorScreenParams<TVShowsStackParamList>;
  MySpace: NavigatorScreenParams<MySpaceStackParamList>;
};

export type RootStackParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  Search: NavigatorScreenParams<SearchStackParamList>;
  Movies: NavigatorScreenParams<MoviesStackParamList>;
  TVShows: NavigatorScreenParams<TVShowsStackParamList>;
  MySpace: NavigatorScreenParams<MySpaceStackParamList>;
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
