import Realm from 'realm';

// ============================================================================
// CONTENT TABLES (Movies & TV Shows)
// ============================================================================

export class Movie extends Realm.Object<Movie> {
  _id!: number; // TMDB ID (primary key)

  // Basic TMDB data
  title!: string;
  original_title!: string;
  overview!: string;
  poster_path?: string;
  backdrop_path?: string;
  vote_average!: number;
  vote_count!: number;
  release_date?: string;
  runtime?: number;
  genres!: Realm.List<string>;
  genre_ids!: Realm.List<number>;
  original_language!: string;
  popularity!: number;
  adult!: boolean;

  // Cast & Crew (JSON strings)
  cast?: string; // [{id, name, character, profile_path, order}]
  crew?: string; // [{id, name, job, department, profile_path}]

  // Videos (JSON strings)
  trailer_key?: string; // YouTube key for main trailer
  videos?: string; // [{key, type, site, name}]

  // AI-generated data (JSON strings)
  ai_similar?: string; // [{id, type, title/name, poster_path, vote_average, reason, confidence}]
  ai_trivia?: string; // ["Trivia fact 1", "Trivia fact 2"]
  ai_tags?: string; // {thematic: [{tag, description, confidence}], emotional: [...]}

  // AI Ratings (scraped via AI)
  ai_imdb_rating?: number; // 0-10 scale
  ai_rotten_tomatoes?: number; // 0-100 scale
  ai_imdb_votes?: number;
  ai_ratings_cached_at?: Date;

  // Metadata
  cached_at!: Date;
  media_cached_at?: Date; // For images, cast, videos (7-day TTL)
  ai_generated_at?: Date;
  has_full_details!: boolean; // true if fetched from detail screen

  static schema: Realm.ObjectSchema = {
    name: 'Movie',
    primaryKey: '_id',
    properties: {
      _id: 'int',
      title: 'string',
      original_title: 'string',
      overview: 'string',
      poster_path: 'string?',
      backdrop_path: 'string?',
      vote_average: 'double',
      vote_count: 'int',
      release_date: 'string?',
      runtime: 'int?',
      genres: 'string[]',
      genre_ids: 'int[]',
      original_language: 'string',
      popularity: 'double',
      adult: 'bool',
      cast: 'string?',
      crew: 'string?',
      trailer_key: 'string?',
      videos: 'string?',
      ai_similar: 'string?',
      ai_trivia: 'string?',
      ai_tags: 'string?',
      ai_imdb_rating: 'double?',
      ai_rotten_tomatoes: 'double?',
      ai_imdb_votes: 'int?',
      ai_ratings_cached_at: 'date?',
      cached_at: {type: 'date', indexed: true},
      media_cached_at: 'date?',
      ai_generated_at: 'date?',
      has_full_details: 'bool',
    },
  };
}

export class TVShow extends Realm.Object<TVShow> {
  _id!: number; // TMDB ID (primary key)

  // Basic TMDB data
  name!: string;
  original_name!: string;
  overview!: string;
  poster_path?: string;
  backdrop_path?: string;
  vote_average!: number;
  vote_count!: number;
  first_air_date?: string;
  last_air_date?: string;
  number_of_seasons?: number;
  number_of_episodes?: number;
  genres!: Realm.List<string>;
  genre_ids!: Realm.List<number>;
  original_language!: string;
  popularity!: number;
  origin_country!: Realm.List<string>;

  // Cast & Crew (JSON strings)
  cast?: string;
  crew?: string;

  // Videos (JSON strings)
  trailer_key?: string;
  videos?: string;

  // AI-generated data (JSON strings)
  ai_similar?: string;
  ai_trivia?: string;
  ai_tags?: string;

  // AI Ratings (scraped via AI)
  ai_imdb_rating?: number;
  ai_rotten_tomatoes?: number;
  ai_imdb_votes?: number;
  ai_ratings_cached_at?: Date;

  // Metadata
  cached_at!: Date;
  media_cached_at?: Date;
  ai_generated_at?: Date;
  has_full_details!: boolean;

  static schema: Realm.ObjectSchema = {
    name: 'TVShow',
    primaryKey: '_id',
    properties: {
      _id: 'int',
      name: 'string',
      original_name: 'string',
      overview: 'string',
      poster_path: 'string?',
      backdrop_path: 'string?',
      vote_average: 'double',
      vote_count: 'int',
      first_air_date: 'string?',
      last_air_date: 'string?',
      number_of_seasons: 'int?',
      number_of_episodes: 'int?',
      genres: 'string[]',
      genre_ids: 'int[]',
      original_language: 'string',
      popularity: 'double',
      origin_country: 'string[]',
      cast: 'string?',
      crew: 'string?',
      trailer_key: 'string?',
      videos: 'string?',
      ai_similar: 'string?',
      ai_trivia: 'string?',
      ai_tags: 'string?',
      ai_imdb_rating: 'double?',
      ai_rotten_tomatoes: 'double?',
      ai_imdb_votes: 'int?',
      ai_ratings_cached_at: 'date?',
      cached_at: {type: 'date', indexed: true},
      media_cached_at: 'date?',
      ai_generated_at: 'date?',
      has_full_details: 'bool',
    },
  };
}

// ============================================================================
// WATCHLIST TABLES
// ============================================================================

export class Watchlist extends Realm.Object<Watchlist> {
  _id!: string;
  name!: string;
  createdAt!: Date;
  updatedAt!: Date;

  static schema: Realm.ObjectSchema = {
    name: 'Watchlist',
    primaryKey: '_id',
    properties: {
      _id: 'string',
      name: 'string',
      createdAt: 'date',
      updatedAt: 'date',
    },
  };
}

export class WatchlistItem extends Realm.Object<WatchlistItem> {
  _id!: Realm.BSON.ObjectId;
  watchlistId!: string;
  contentId!: number;
  type!: string;
  addedAt!: Date;

  static schema: Realm.ObjectSchema = {
    name: 'WatchlistItem',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      watchlistId: {type: 'string', indexed: true},
      contentId: {type: 'int', indexed: true},
      type: 'string',
      addedAt: 'date',
    },
  };
}

export class WatchlistInsight extends Realm.Object<WatchlistInsight> {
  _id!: string; // watchlistHash as primary key
  insights!: string; // JSON string
  topGenres!: string; // JSON string
  averageRating!: number;
  decadeDistribution!: string; // JSON string
  contentTypeSplit!: string; // JSON string - {movies: number, tvShows: number}
  moodProfile!: string; // JSON string - {dominant, secondary, traits[]}
  hiddenGems!: string; // JSON string - [{title, type, reason}]
  contentFreshness!: string; // JSON string - {preference, recentPercentage, note}
  completionInsight!: string; // JSON string - {estimatedWatchTime, bingeability, suggestion}
  recommendations!: string;
  recommendedTitles!: string; // JSON string
  timestamp!: Date;

  static schema: Realm.ObjectSchema = {
    name: 'WatchlistInsight',
    primaryKey: '_id',
    properties: {
      _id: 'string',
      insights: 'string',
      topGenres: 'string',
      averageRating: 'double',
      decadeDistribution: 'string',
      contentTypeSplit: 'string',
      moodProfile: 'string',
      hiddenGems: 'string',
      contentFreshness: 'string',
      completionInsight: 'string',
      recommendations: 'string',
      recommendedTitles: 'string',
      timestamp: 'date',
    },
  };
}

export class WatchlistRecommendation extends Realm.Object<WatchlistRecommendation> {
  _id!: string; // watchlistHash as primary key
  items!: string; // JSON string of array
  timestamp!: Date;

  static schema: Realm.ObjectSchema = {
    name: 'WatchlistRecommendation',
    primaryKey: '_id',
    properties: {
      _id: 'string',
      items: 'string',
      timestamp: 'date',
    },
  };
}

// ============================================================================
// USER DATA TABLES
// ============================================================================

export class HistoryItem extends Realm.Object<HistoryItem> {
  _id!: Realm.BSON.ObjectId;
  contentId!: number; // TMDB ID (foreign key)
  type!: string; // 'movie' | 'tv'
  viewedAt!: Date;
  
  // Display data (so we don't depend on Movie/TVShow cache)
  title?: string;
  name?: string;
  poster_path?: string;
  backdrop_path?: string;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  overview?: string;

  static schema: Realm.ObjectSchema = {
    name: 'HistoryItem',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      contentId: {type: 'int', indexed: true},
      type: {type: 'string', indexed: true},
      viewedAt: {type: 'date', indexed: true},
      title: 'string?',
      name: 'string?',
      poster_path: 'string?',
      backdrop_path: 'string?',
      vote_average: 'double?',
      release_date: 'string?',
      first_air_date: 'string?',
      overview: 'string?',
    },
  };
}

export class SavedFilter extends Realm.Object<SavedFilter> {
  _id!: string;
  name!: string;
  params!: string; // JSON stringified FilterParams
  type!: string; // 'all' | 'movie' | 'tv'
  createdAt!: Date;

  static schema: Realm.ObjectSchema = {
    name: 'SavedFilter',
    primaryKey: '_id',
    properties: {
      _id: 'string',
      name: 'string',
      params: 'string',
      type: 'string',
      createdAt: 'date',
    },
  };
}

export class Settings extends Realm.Object<Settings> {
  _id!: Realm.BSON.ObjectId;
  key!: string; // 'region', 'my_language', 'my_otts', etc.
  value!: string; // JSON stringified value
  updatedAt!: Date;

  static schema: Realm.ObjectSchema = {
    name: 'Settings',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      key: {type: 'string', indexed: true},
      value: 'string',
      updatedAt: 'date',
    },
  };
}

// ============================================================================
// TAG TABLES
// ============================================================================

export class ThematicTag extends Realm.Object<ThematicTag> {
  _id!: Realm.BSON.ObjectId;
  tag!: string;
  description!: string;
  category!: string; // 'thematic' | 'emotional'
  count!: number;
  lastSeen!: Date;
  confidence!: number;

  static schema: Realm.ObjectSchema = {
    name: 'ThematicTag',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      tag: {type: 'string', indexed: true},
      description: 'string',
      category: 'string',
      count: 'double',
      lastSeen: 'date',
      confidence: 'double',
    },
  };
}

export class TagContent extends Realm.Object<TagContent> {
  _id!: Realm.BSON.ObjectId;
  tag!: string; // Tag name (indexed)
  category!: string; // 'thematic' | 'emotional'

  // Content reference
  contentId!: number; // TMDB ID
  type!: string; // 'movie' | 'tv'

  // Display data (for UI cards)
  title?: string;
  name?: string;
  poster_path?: string;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  overview?: string;

  // AI metadata
  relevance?: number; // 0-1
  reason?: string;

  // Metadata
  generatedAt!: Date;
  position!: number; // 1-15 (ranking order)

  static schema: Realm.ObjectSchema = {
    name: 'TagContent',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      tag: {type: 'string', indexed: true},
      category: 'string',
      contentId: {type: 'int', indexed: true},
      type: 'string',
      title: 'string?',
      name: 'string?',
      poster_path: 'string?',
      vote_average: 'double?',
      release_date: 'string?',
      first_air_date: 'string?',
      overview: 'string?',
      relevance: 'double?',
      position: 'int',
    },
  };
}

// ============================================================================
// AI CHAT TABLES
// ============================================================================

export class ChatThread extends Realm.Object<ChatThread> {
  _id!: Realm.BSON.ObjectId;
  threadId!: string;
  title!: string;
  createdAt!: Date;
  updatedAt!: Date;

  static schema: Realm.ObjectSchema = {
    name: 'ChatThread',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      threadId: {type: 'string', indexed: true},
      title: 'string',
      createdAt: 'date',
      updatedAt: 'date',
    },
  };
}

export class ChatMessage extends Realm.Object<ChatMessage> {
  _id!: Realm.BSON.ObjectId;
  threadId!: string;
  role!: string;
  content!: string;
  timestamp!: Date;

  static schema: Realm.ObjectSchema = {
    name: 'ChatMessage',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      threadId: {type: 'string', indexed: true},
      role: 'string',
      content: 'string',
      timestamp: 'date',
    },
  };
}

export class ChatRecommendation extends Realm.Object<ChatRecommendation> {
  _id!: Realm.BSON.ObjectId;
  threadId!: string;
  messageIndex!: number;
  contentId!: number;
  type!: string;
  title?: string;
  name?: string;
  poster_path?: string;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  overview?: string;
  createdAt!: Date;
  position!: number;

  static schema: Realm.ObjectSchema = {
    name: 'ChatRecommendation',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      threadId: {type: 'string', indexed: true},
      messageIndex: 'int',
      contentId: {type: 'int', indexed: true},
      type: 'string',
      title: 'string?',
      name: 'string?',
      poster_path: 'string?',
      vote_average: 'double?',
      release_date: 'string?',
      first_air_date: 'string?',
      overview: 'string?',
      createdAt: 'date',
      position: 'int',
    },
  };
}

export class RecentSearch extends Realm.Object<RecentSearch> {
  _id!: Realm.BSON.ObjectId;
  query!: string;
  timestamp!: Date;

  static schema: Realm.ObjectSchema = {
    name: 'RecentSearch',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      query: {type: 'string', indexed: true},
      timestamp: 'date',
    },
  };
}

export class RecentSearchItem extends Realm.Object<RecentSearchItem> {
  _id!: Realm.BSON.ObjectId;
  contentId!: number; // TMDB ID (foreign key)
  type!: string; // 'movie' | 'tv'
  searchedAt!: Date;
  isSearch!: boolean; // true if from search query, false if from trending
  
  // Display data (so we don't depend on Movie/TVShow cache)
  title?: string;
  name?: string;
  poster_path?: string;
  backdrop_path?: string;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  overview?: string;

  static schema: Realm.ObjectSchema = {
    name: 'RecentSearchItem',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      contentId: {type: 'int', indexed: true},
      type: {type: 'string', indexed: true},
      searchedAt: {type: 'date', indexed: true},
      isSearch: {type: 'bool', indexed: true},
      title: 'string?',
      name: 'string?',
      poster_path: 'string?',
      backdrop_path: 'string?',
      vote_average: 'double?',
      release_date: 'string?',
      first_air_date: 'string?',
      overview: 'string?',
    },
  };
}

// ============================================================================
// USER FEEDBACK & PREFERENCES
// ============================================================================

export class UserFeedback extends Realm.Object<UserFeedback> {
  _id!: Realm.BSON.ObjectId;
  contentId!: number;
  title!: string;
  liked!: boolean;
  timestamp!: Date;

  static schema: Realm.ObjectSchema = {
    name: 'UserFeedback',
    primaryKey: '_id',
    properties: {
      _id: 'objectId',
      contentId: {type: 'int', indexed: true},
      title: 'string',
      liked: 'bool',
      timestamp: 'date',
    },
  };
}

export class UserPreferences extends Realm.Object<UserPreferences> {
  _id!: string;
  selectedGenres!: string; // JSON string
  moodAnswers!: string; // JSON string
  timestamp!: Date;

  static schema: Realm.ObjectSchema = {
    name: 'UserPreferences',
    primaryKey: '_id',
    properties: {
      _id: 'string',
      selectedGenres: 'string',
      moodAnswers: 'string',
      timestamp: 'date',
    },
  };
}

export class AIPersonalizationCache extends Realm.Object<AIPersonalizationCache> {
  _id!: string; // 'history_personalization' (singleton)
  inputHistoryIds!: string; // JSON string: array of 10 content IDs used as input
  aiRecommendations!: string; // JSON string: AI response with recommendations
  timestamp!: Date;

  static schema: Realm.ObjectSchema = {
    name: 'AIPersonalizationCache',
    primaryKey: '_id',
    properties: {
      _id: 'string',
      inputHistoryIds: 'string', // JSON: [{id, type, title/name}]
      aiRecommendations: 'string', // JSON: [{id, type, title, reason, ...}]
      timestamp: 'date',
    },
  };
}

// ============================================================================
// SCHEMA EXPORT
// ============================================================================

export const schemas = [
  Movie,
  TVShow,
  Watchlist,
  WatchlistItem,
  WatchlistInsight,
  WatchlistRecommendation,
  HistoryItem,
  SavedFilter,
  Settings,
  ThematicTag,
  TagContent,
  ChatThread,
  ChatMessage,
  ChatRecommendation,
  RecentSearch,
  RecentSearchItem,
  UserFeedback,
  UserPreferences,
  AIPersonalizationCache,
];
