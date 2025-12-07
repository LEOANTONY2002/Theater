import {getRealm} from './realm';
import Realm from 'realm';
import {Movie as MovieType} from '../types/movie';
import {TVShow as TVShowType} from '../types/tvshow';

/**
 * Content Cache Service - Manages Movie/TVShow data in Realm
 */

// TTL constants
const BASIC_DATA_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days
const MEDIA_DATA_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
const AI_DATA_TTL = 180 * 24 * 60 * 60 * 1000; // 6 months

const isStale = (timestamp: Date | undefined, ttl: number): boolean => {
  if (!timestamp) return true;
  return Date.now() - timestamp.getTime() > ttl;
};

/**
 * Get movie from cache
 */
export const getMovie = (movieId: number): any | null => {
  try {
    const realm = getRealm();
    const movie = realm.objectForPrimaryKey('Movie', movieId);
    return movie || null;
  } catch (error) {
    console.error('[ContentCache] Error getting movie:', error);
    return null;
  }
};

/**
 * Get TV show from cache
 */
export const getTVShow = (showId: number): any | null => {
  try {
    const realm = getRealm();
    const show = realm.objectForPrimaryKey('TVShow', showId);
    return show || null;
  } catch (error) {
    console.error('[ContentCache] Error getting TV show:', error);
    return null;
  }
};

/**
 * Cache movie data (basic info from lists/search)
 */
export const cacheMovie = (movie: MovieType): void => {
  try {
    const realm = getRealm();

    realm.write(() => {
      realm.create(
        'Movie',
        {
          _id: movie.id,
          title: movie.title || '',
          original_title: movie.title || '',
          overview: movie.overview || '',
          poster_path: movie.poster_path,
          backdrop_path: movie.backdrop_path,
          vote_average: movie.vote_average || 0,
          vote_count: 0,
          release_date: movie.release_date,
          runtime: 0,
          genres: [],
          genre_ids: movie.genre_ids || [],
          original_language: movie.original_language || '',
          popularity: movie.popularity || 0,
          adult: false,
          cached_at: new Date(),
          has_full_details: false,
        },
        Realm.UpdateMode.Modified,
      );
    });
  } catch (error) {
    console.error('[ContentCache] Error caching movie:', error);
  }
};

/**
 * Cache TV show data (basic info from lists/search)
 */
export const cacheTVShow = (show: TVShowType): void => {
  try {
    const realm = getRealm();

    realm.write(() => {
      realm.create(
        'TVShow',
        {
          _id: show.id,
          name: show.name || '',
          original_name: show.name || '',
          overview: show.overview || '',
          poster_path: show.poster_path,
          backdrop_path: show.backdrop_path,
          vote_average: show.vote_average || 0,
          vote_count: 0,
          first_air_date: show.first_air_date,
          genres: [],
          genre_ids: show.genre_ids || [],
          original_language: show.original_language || '',
          popularity: show.popularity || 0,
          origin_country: show.origin_country || [],
          cached_at: new Date(),
          has_full_details: false,
        },
        Realm.UpdateMode.Modified,
      );
    });
  } catch (error) {
    console.error('[ContentCache] Error caching TV show:', error);
  }
};

/**
 * Cache full movie details (from detail screen)
 */
export const cacheMovieDetails = (
  movie: any,
  cast?: any[],
  crew?: any[],
  videos?: any[],
): void => {
  try {
    const realm = getRealm();
    const existing = realm.objectForPrimaryKey('Movie', movie.id);

    realm.write(() => {
      realm.create(
        'Movie',
        {
          _id: movie.id,
          title: movie.title || '',
          original_title: movie.original_title || movie.title || '',
          overview: movie.overview || '',
          poster_path: movie.poster_path,
          backdrop_path: movie.backdrop_path,
          vote_average: movie.vote_average || 0,
          vote_count: movie.vote_count || 0,
          release_date: movie.release_date,
          runtime: movie.runtime || 0,
          genres: movie.genres?.map((g: any) => g.name) || [],
          genre_ids:
            movie.genres?.map((g: any) => g.id) || movie.genre_ids || [],
          original_language: movie.original_language || '',
          popularity: movie.popularity || 0,
          adult: movie.adult || false,
          // Cast & crew
          cast: cast ? JSON.stringify(cast.slice(0, 20)) : existing?.cast,
          crew: crew
            ? JSON.stringify(
                crew.filter((c: any) =>
                  ['Director', 'Producer', 'Writer', 'Screenplay'].includes(
                    c.job,
                  ),
                ),
              )
            : existing?.crew,
          // Videos
          trailer_key:
            videos?.find((v: any) => v.type === 'Trailer' && v.official)?.key ||
            existing?.trailer_key,
          videos: videos ? JSON.stringify(videos) : existing?.videos,
          // Detail screen data
          images: movie.images
            ? JSON.stringify(movie.images)
            : existing?.images,
          keywords: movie.keywords
            ? JSON.stringify(movie.keywords.keywords)
            : existing?.keywords,
          release_dates: movie.release_dates
            ? JSON.stringify(movie.release_dates)
            : existing?.release_dates,
          production_companies: movie.production_companies
            ? JSON.stringify(movie.production_companies)
            : existing?.production_companies,
          spoken_languages: movie.spoken_languages
            ? JSON.stringify(movie.spoken_languages)
            : existing?.spoken_languages,
          belongs_to_collection: movie.belongs_to_collection
            ? JSON.stringify(movie.belongs_to_collection)
            : existing?.belongs_to_collection,
          budget: movie.budget ?? existing?.budget,
          revenue: movie.revenue ?? existing?.revenue,
          tagline: movie.tagline ?? existing?.tagline,
          imdb_id: movie.imdb_id ?? existing?.imdb_id,
          content_rating:
            existing?.content_rating ||
            movie.release_dates?.results?.find(
              (r: any) => r.iso_3166_1 === 'US',
            )?.release_dates?.[0]?.certification ||
            null,
          // Preserve AI data if exists
          ai_similar: existing?.ai_similar,
          ai_trivia: existing?.ai_trivia,
          ai_tags: existing?.ai_tags,
          ai_generated_at: existing?.ai_generated_at,
          // Update timestamps
          cached_at: new Date(),
          media_cached_at: new Date(),
          has_full_details: true,
        },
        Realm.UpdateMode.Modified,
      );
    });
  } catch (error) {
    console.error('[ContentCache] Error caching movie details:', error);
  }
};

/**
 * Cache full TV show details (from detail screen)
 */
export const cacheTVShowDetails = (
  show: any,
  cast?: any[],
  crew?: any[],
  videos?: any[],
): void => {
  try {
    const realm = getRealm();
    const existing = realm.objectForPrimaryKey('TVShow', show.id);

    realm.write(() => {
      realm.create(
        'TVShow',
        {
          _id: show.id,
          name: show.name || '',
          original_name: show.original_name || show.name || '',
          overview: show.overview || '',
          poster_path: show.poster_path,
          backdrop_path: show.backdrop_path,
          vote_average: show.vote_average || 0,
          vote_count: show.vote_count || 0,
          first_air_date: show.first_air_date,
          last_air_date: show.last_air_date,
          number_of_seasons: show.number_of_seasons || 0,
          number_of_episodes: show.number_of_episodes || 0,
          genres: show.genres?.map((g: any) => g.name) || [],
          genre_ids: show.genres?.map((g: any) => g.id) || show.genre_ids || [],
          original_language: show.original_language || '',
          popularity: show.popularity || 0,
          origin_country: show.origin_country || [],
          // Cast & crew
          cast: cast ? JSON.stringify(cast.slice(0, 20)) : existing?.cast,
          crew: crew
            ? JSON.stringify(
                crew.filter((c: any) =>
                  ['Director', 'Producer', 'Writer', 'Creator'].includes(c.job),
                ),
              )
            : existing?.crew,
          // Videos
          trailer_key:
            videos?.find((v: any) => v.type === 'Trailer' && v.official)?.key ||
            existing?.trailer_key,
          videos: videos ? JSON.stringify(videos) : existing?.videos,
          // Detail screen data
          images: show.images ? JSON.stringify(show.images) : existing?.images,
          keywords: show.keywords
            ? JSON.stringify(show.keywords.keywords)
            : existing?.keywords,
          content_ratings: show.content_ratings
            ? JSON.stringify(show.content_ratings)
            : existing?.content_ratings,
          created_by: show.created_by
            ? JSON.stringify(show.created_by)
            : existing?.created_by,
          networks: show.networks
            ? JSON.stringify(show.networks)
            : existing?.networks,
          production_companies: show.production_companies
            ? JSON.stringify(show.production_companies)
            : existing?.production_companies,
          spoken_languages: show.spoken_languages
            ? JSON.stringify(show.spoken_languages)
            : existing?.spoken_languages,
          status: show.status || existing?.status,
          type: show.type || existing?.type,
          tagline: show.tagline || existing?.tagline,
          episode_run_time:
            show.episode_run_time || existing?.episode_run_time || [],
          // Preserve AI data if exists
          ai_similar: existing?.ai_similar,
          ai_trivia: existing?.ai_trivia,
          ai_tags: existing?.ai_tags,
          ai_generated_at: existing?.ai_generated_at,
          // Update timestamps
          cached_at: new Date(),
          media_cached_at: new Date(),
          has_full_details: true,
        },
        Realm.UpdateMode.Modified,
      );
    });
  } catch (error) {
    console.error('[ContentCache] Error caching TV show details:', error);
  }
};

/**
 * Store AI-generated data for a movie
 */
export const cacheMovieAI = (
  movieId: number,
  data: {
    similar?: any[];
    trivia?: string[];
    tags?: any;
  },
): void => {
  try {
    const realm = getRealm();
    const movie = realm.objectForPrimaryKey('Movie', movieId);

    if (!movie) {
      console.warn(
        '[ContentCache] Movie not found, cannot cache AI data:',
        movieId,
      );
      return;
    }

    realm.write(() => {
      if (data.similar) {
        movie.ai_similar = JSON.stringify(data.similar);
      }
      if (data.trivia) {
        movie.ai_trivia = JSON.stringify(data.trivia);
      }
      if (data.tags) {
        movie.ai_tags = JSON.stringify(data.tags);
      }
      movie.ai_generated_at = new Date();
    });
  } catch (error) {
    console.error('[ContentCache] Error caching movie AI data:', error);
  }
};

/**
 * Store AI-generated data for a TV show
 */
export const cacheTVShowAI = (
  showId: number,
  data: {
    similar?: any[];
    trivia?: string[];
    tags?: any;
  },
): void => {
  try {
    const realm = getRealm();
    const show = realm.objectForPrimaryKey('TVShow', showId);

    if (!show) {
      console.warn(
        '[ContentCache] TV show not found, cannot cache AI data:',
        showId,
      );
      return;
    }

    realm.write(() => {
      if (data.similar) {
        show.ai_similar = JSON.stringify(data.similar);
      }
      if (data.trivia) {
        show.ai_trivia = JSON.stringify(data.trivia);
      }
      if (data.tags) {
        show.ai_tags = JSON.stringify(data.tags);
      }
      show.ai_generated_at = new Date();
    });
  } catch (error) {
    console.error('[ContentCache] Error caching TV show AI data:', error);
  }
};

/**
 * Check if content needs refresh
 */
export const needsRefresh = (
  contentId: number,
  type: 'movie' | 'tv',
  checkType: 'basic' | 'media' | 'ai' = 'basic',
): boolean => {
  try {
    const realm = getRealm();
    const content = realm.objectForPrimaryKey(
      type === 'movie' ? 'Movie' : 'TVShow',
      contentId,
    );

    if (!content) return true;

    switch (checkType) {
      case 'basic':
        return isStale(content.cached_at as Date, BASIC_DATA_TTL);
      case 'media':
        return isStale(content.media_cached_at as Date, MEDIA_DATA_TTL);
      case 'ai':
        return isStale(content.ai_generated_at as Date, AI_DATA_TTL);
      default:
        return true;
    }
  } catch (error) {
    console.error('[ContentCache] Error checking refresh:', error);
    return true;
  }
};

/**
 * Batch cache movies (from lists)
 */
export const batchCacheMovies = (movies: MovieType[]): void => {
  try {
    const realm = getRealm();

    realm.write(() => {
      movies.forEach(movie => {
        realm.create(
          'Movie',
          {
            _id: movie.id,
            title: movie.title || '',
            original_title: movie.title || '',
            overview: movie.overview || '',
            poster_path: movie.poster_path,
            backdrop_path: movie.backdrop_path,
            vote_average: movie.vote_average || 0,
            vote_count: 0,
            release_date: movie.release_date,
            runtime: 0,
            genres: [],
            genre_ids: movie.genre_ids || [],
            original_language: movie.original_language || '',
            popularity: movie.popularity || 0,
            adult: false,
            cached_at: new Date(),
            has_full_details: false,
          },
          Realm.UpdateMode.Modified,
        );
      });
    });
  } catch (error) {
    console.error('[ContentCache] Error batch caching movies:', error);
  }
};

/**
 * Batch cache TV shows (from lists)
 */
export const batchCacheTVShows = (shows: TVShowType[]): void => {
  try {
    if (!shows || shows.length === 0) return;

    const realm = getRealm();

    realm.write(() => {
      shows.forEach(show => {
        try {
          realm.create(
            'TVShow',
            {
              _id: show.id,
              name: show.name || '',
              original_name: show.name || '',
              overview: show.overview || '',
              poster_path: show.poster_path || null,
              backdrop_path: show.backdrop_path || null,
              vote_average: show.vote_average || 0,
              vote_count: 0,
              first_air_date: show.first_air_date || null,
              genres: [],
              genre_ids: show.genre_ids || [],
              original_language: show.original_language || '',
              popularity: show.popularity || 0,
              origin_country: show.origin_country || [],
              cached_at: new Date(),
              has_full_details: false,
            },
            Realm.UpdateMode.Modified,
          );
        } catch (itemError) {
          console.error(
            `[ContentCache] Error caching TV show ${show.id}:`,
            itemError,
          );
        }
      });
    });
  } catch (error) {
    console.error('[ContentCache] Error batch caching TV shows:', error);
  }
};
