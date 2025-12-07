import Realm from 'realm';
import {schemas} from './schema';

export const SCHEMA_VERSION = 18; // Force clear all movie cache to fix undefined fields bug

let realmInstance: Realm | null = null;

/**
 * Initialize Realm database
 */
export const initializeRealm = async (): Promise<Realm> => {
  if (realmInstance) {
    return realmInstance;
  }

  try {
    console.log('[Realm] Initializing database...');

    const config: Realm.Configuration = {
      schema: schemas,
      schemaVersion: SCHEMA_VERSION,
      path: 'theater.realm',

      // Migration function (for future schema changes)
      onMigration: (oldRealm: Realm, newRealm: Realm) => {
        console.log('[Realm] Running schema migration...');
        // Add migration logic here when schema changes
      },
    };

    realmInstance = await Realm.open(config);
    console.log('[Realm] Database initialized successfully');
    console.log(`[Realm] Schema version: ${SCHEMA_VERSION}`);
    console.log(`[Realm] Path: ${realmInstance.path}`);

    return realmInstance;
  } catch (error) {
    console.error('[Realm] Failed to initialize database:', error);
    throw error;
  }
};

/**
 * Get Realm instance (must call initializeRealm first)
 */
export const getRealm = (): Realm => {
  if (!realmInstance) {
    throw new Error('Realm not initialized. Call initializeRealm() first.');
  }
  return realmInstance;
};

/**
 * Close Realm database
 */
export const closeRealm = (): void => {
  if (realmInstance && !realmInstance.isClosed) {
    realmInstance.close();
    realmInstance = null;
    console.log('[Realm] Database closed');
  }
};

/**
 * Delete Realm database (for testing/debugging)
 */
export const deleteRealm = async (): Promise<void> => {
  try {
    closeRealm();
    await Realm.deleteFile({
      schema: schemas,
      schemaVersion: SCHEMA_VERSION,
      path: 'theater.realm',
    });
    console.log('[Realm] Database deleted');
  } catch (error) {
    console.error('[Realm] Failed to delete database:', error);
    throw error;
  }
};

/**
 * Get database statistics
 */
export const getDatabaseStats = (): {
  movies: number;
  tvShows: number;
  watchlists: number;
  watchlistItems: number;
  historyItems: number;
  recentSearchItems: number;
  savedFilters: number;
  thematicTags: number;
  tagContent: number;
  settings: number;
} => {
  const realm = getRealm();

  return {
    movies: realm.objects('Movie').length,
    tvShows: realm.objects('TVShow').length,
    watchlists: realm.objects('Watchlist').length,
    watchlistItems: realm.objects('WatchlistItem').length,
    historyItems: realm.objects('HistoryItem').length,
    recentSearchItems: realm.objects('RecentSearchItem').length,
    savedFilters: realm.objects('SavedFilter').length,
    thematicTags: realm.objects('ThematicTag').length,
    tagContent: realm.objects('TagContent').length,
    settings: realm.objects('Settings').length,
  };
};

/**
 * Clean up old data based on TTL
 */
export const cleanupOldData = (): void => {
  const realm = getRealm();
  const now = Date.now();

  // TTL constants
  const BASIC_DATA_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days
  const MEDIA_DATA_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
  const AI_DATA_TTL = 180 * 24 * 60 * 60 * 1000; // 6 months
  const HISTORY_TTL = 90 * 24 * 60 * 60 * 1000; // 90 days

  realm.write(() => {
    // Clean up old movies (basic data older than 30 days)
    const oldMovies = realm
      .objects('Movie')
      .filtered('cached_at < $0', new Date(now - BASIC_DATA_TTL));
    console.log(`[Realm] Cleaning up ${oldMovies.length} old movies`);
    realm.delete(oldMovies);

    // Clean up old TV shows
    const oldTVShows = realm
      .objects('TVShow')
      .filtered('cached_at < $0', new Date(now - BASIC_DATA_TTL));
    console.log(`[Realm] Cleaning up ${oldTVShows.length} old TV shows`);
    realm.delete(oldTVShows);

    // Clean up old history (older than 90 days)
    const oldHistory = realm
      .objects('HistoryItem')
      .filtered('viewedAt < $0', new Date(now - HISTORY_TTL));
    console.log(`[Realm] Cleaning up ${oldHistory.length} old history items`);
    realm.delete(oldHistory);

    // Clean up old tag content (older than 7 days)
    const oldTagContent = realm
      .objects('TagContent')
      .filtered('generatedAt < $0', new Date(now - MEDIA_DATA_TTL));
    console.log(`[Realm] Cleaning up ${oldTagContent.length} old tag content`);
    realm.delete(oldTagContent);
  });

  console.log('[Realm] Cleanup completed');
};

export default {
  initializeRealm,
  getRealm,
  closeRealm,
  deleteRealm,
  getDatabaseStats,
  cleanupOldData,
};
