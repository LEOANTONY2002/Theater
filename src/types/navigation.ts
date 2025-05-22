import {Movie} from './movie';
import {TVShow} from './tvshow';
import {NavigatorScreenParams} from '@react-navigation/native';
import {ContentItem} from '../components/MovieList';

export type MovieCategoryType =
  | 'popular'
  | 'top_rated'
  | 'now_playing'
  | 'upcoming';
export type TVShowCategoryType =
  | 'popular'
  | 'top_rated'
  | 'on_the_air'
  | 'airing_today';
export type ContentType = 'movie' | 'tv';

export type HomeStackParamList = {
  HomeScreen: undefined;
  MovieDetails: {movie: Movie};
  TVShowDetails: {show: TVShow};
  Category: {
    title: string;
    categoryType: MovieCategoryType | TVShowCategoryType;
    contentType: ContentType;
  };
};

export type SearchStackParamList = {
  SearchScreen: undefined;
  MovieDetails: {movie: Movie};
  TVShowDetails: {show: TVShow};
};

export type MoviesStackParamList = {
  MoviesScreen: undefined;
  MovieDetails: {movie: Movie};
  Category: {
    title: string;
    categoryType: MovieCategoryType;
    contentType: 'movie';
  };
};

export type TVShowsStackParamList = {
  TVShowsScreen: undefined;
  TVShowDetails: {show: TVShow};
  Category: {
    title: string;
    categoryType: TVShowCategoryType;
    contentType: 'tv';
  };
};

export type MySpaceStackParamList = {
  MySpaceScreen: undefined;
  MovieDetails: {movie: Movie};
  TVShowDetails: {show: TVShow};
};

export type TabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  Search: NavigatorScreenParams<SearchStackParamList>;
  Movies: NavigatorScreenParams<MoviesStackParamList>;
  TVShows: NavigatorScreenParams<TVShowsStackParamList>;
  MySpace: NavigatorScreenParams<MySpaceStackParamList>;
};

export type RootStackParamList = HomeStackParamList &
  SearchStackParamList &
  MoviesStackParamList &
  TVShowsStackParamList &
  MySpaceStackParamList;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
