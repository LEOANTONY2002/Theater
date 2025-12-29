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
export type TVShowCategoryType =
  | 'latest'
  | 'popular'
  | 'top_rated'
  | 'trending_day'
  | 'trending_week';
export type ContentType = 'movie' | 'tv';

export type HomeStackParamList = {
  HomeScreen: undefined;
  MovieDetails: {movie: Movie};
  TVShowDetails: {show: TVShow};
  Collection: {collectionId: number};
  Category: {
    title: string;
    categoryType?: MovieCategoryType | TVShowCategoryType;
    contentType: ContentType;
    genreId?: number;
    filter?: any;
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
  ThematicGenreResults: {
    tag: string;
    description: string;
  };
  OTTDetails: {
    ottId: number;
    ottName: string;
    ottLogo?: string;
  };
  CinemaScreen: {
    id: string;
    type: 'movie' | 'tv';
    title: string;
    season?: number;
    episode?: number;
  };
  SimilarMovies: {
    movieId: number;
    title: string;
  };
  SimilarTVShows: {
    tvId: number;
    title: string;
  };
};

export type SearchStackParamList = {
  SearchScreen: {
    filter?: SavedFilter;
  };
  MovieDetails: {movie: Movie};
  TVShowDetails: {show: TVShow};
  Collection: {collectionId: number};
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
  CinemaScreen: {
    id: string;
    type: 'movie' | 'tv';
    title: string;
    season?: number;
    episode?: number;
  };
  SimilarMovies: {
    movieId: number;
    title: string;
  };
  SimilarTVShows: {
    tvId: number;
    title: string;
  };
};

export type MoviesAndSeriesStackParamList = {
  MoviesAndSeriesScreen: undefined;
  MovieDetails: {movie: Movie};
  TVShowDetails: {show: TVShow};
  Collection: {collectionId: number};
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
  EmotionalToneResults: {
    tag: string;
    contentType: 'movie' | 'tv';
  };
  CinemaScreen: {
    id: string;
    type: 'movie' | 'tv';
    title: string;
    season?: number;
    episode?: number;
  };
  SimilarMovies: {
    movieId: number;
    title: string;
  };
  SimilarTVShows: {
    tvId: number;
    title: string;
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
  EmotionalToneResults: {
    tag: string;
    contentType: 'movie';
  };
  CinemaScreen: {
    id: string;
    type: 'movie' | 'tv';
    title: string;
    season?: number;
    episode?: number;
  };
  SimilarMovies: {
    movieId: number;
    title: string;
  };
  SimilarTVShows: {
    tvId: number;
    title: string;
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
  EmotionalToneResults: {
    tag: string;
    contentType: 'tv';
  };
  CinemaScreen: {
    id: string;
    type: 'movie' | 'tv';
    title: string;
    season?: number;
    episode?: number;
  };
  SimilarMovies: {
    movieId: number;
    title: string;
  };
  SimilarTVShows: {
    tvId: number;
    title: string;
  };
};

export type CurationStackParamList = {
  CurationScreen: undefined;
  MovieDetails: {movie: Movie};
  TVShowDetails: {show: TVShow};
  Collection: {collectionId: number};
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
  CinemaScreen: {
    id: string;
    type: 'movie' | 'tv';
    title: string;
    season?: number;
    episode?: number;
  };
  SimilarMovies: {
    movieId: number;
    title: string;
  };
  SimilarTVShows: {
    tvId: number;
    title: string;
  };
};

export type MySpaceStackParamList = {
  MySpaceScreen: undefined;
  MyFiltersScreen: undefined;
  WatchlistsScreen: undefined;
  MyCollectionsScreen: undefined;
  MovieDetails: {movie: Movie};
  TVShowDetails: {show: TVShow};
  Collection: {collectionId: number};
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
  CinemaInsightsScreen: undefined;
  NotificationSettings: undefined;
  MyCalendarScreen: undefined;
  CinemaScreen: {
    id: string;
    type: 'movie' | 'tv';
    title: string;
    season?: number;
    episode?: number;
  };
  SimilarMovies: {
    movieId: number;
    title: string;
  };
  SimilarTVShows: {
    tvId: number;
    title: string;
  };
};

export type TabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  Search: NavigatorScreenParams<SearchStackParamList>;
  MoviesAndSeries: NavigatorScreenParams<MoviesAndSeriesStackParamList>;
  Curation: NavigatorScreenParams<CurationStackParamList>;
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
