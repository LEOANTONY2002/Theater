import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'pending_watch_tracking';
const PROMPTED_KEY = 'prompted_watch_tracking';

export interface PendingWatch {
  id: number;
  title: string;
  type: 'movie' | 'tv';
  platform: string;
  clickedAt: number;
  posterPath?: string;
  seasonData?: {season_number: number; episode_count: number}[];
}

class WatchTrackingService {
  /**
   * Save a pending watch when user clicks "Watch on [OTT]"
   */
  async setPendingWatch(watch: PendingWatch): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(watch));
      console.log('📺 Pending watch saved:', watch.title);
    } catch (error) {
      console.error('Error saving pending watch:', error);
    }
  }

  /**
   * Get pending watch if exists (no time limit)
   */
  async getPendingWatch(): Promise<PendingWatch | null> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (!stored) return null;

      const watch: PendingWatch = JSON.parse(stored);
      return watch;
    } catch (error) {
      console.error('Error getting pending watch:', error);
      return null;
    }
  }

  /**
   * Check if we've already prompted for this watch
   */
  async hasBeenPrompted(watchId: number): Promise<boolean> {
    try {
      const stored = await AsyncStorage.getItem(PROMPTED_KEY);
      if (!stored) return false;

      const promptedIds: number[] = JSON.parse(stored);
      return promptedIds.includes(watchId);
    } catch (error) {
      console.error('Error checking prompted status:', error);
      return false;
    }
  }

  /**
   * Mark this watch as prompted
   */
  async markAsPrompted(watchId: number): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(PROMPTED_KEY);
      let promptedIds: number[] = stored ? JSON.parse(stored) : [];

      if (!promptedIds.includes(watchId)) {
        promptedIds.push(watchId);
        // Keep only last 50 to avoid bloat
        promptedIds = promptedIds.slice(-50);
        await AsyncStorage.setItem(PROMPTED_KEY, JSON.stringify(promptedIds));
      }
    } catch (error) {
      console.error('Error marking as prompted:', error);
    }
  }

  /**
   * Clear pending watch
   */
  async clearPendingWatch(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      console.log('🗑️ Pending watch cleared');
    } catch (error) {
      console.error('Error clearing pending watch:', error);
    }
  }

  /**
   * Check if item is already in diary
   */
  async isInDiary(id: number, type: 'movie' | 'tv'): Promise<boolean> {
    try {
      const {getRealm} = require('../database/realm');
      const realm = getRealm();

      if (type === 'movie') {
        const movie = realm.objectForPrimaryKey('Movie', id);
        return movie?.diaryEntry !== null && movie?.diaryEntry !== undefined;
      } else {
        const show = realm.objectForPrimaryKey('TVShow', id);
        return show?.diaryEntry !== null && show?.diaryEntry !== undefined;
      }
    } catch (error) {
      console.error('Error checking diary:', error);
      return false;
    }
  }

  /**
   * Should we show the prompt?
   */
  /**
   * Should we show the prompt?
   */
  async shouldShowPrompt(): Promise<PendingWatch | null> {
    const pending = await this.getPendingWatch();
    if (!pending) return null;

    // Check if already in diary
    const inDiary = await this.isInDiary(pending.id, pending.type);
    if (inDiary) {
      await this.clearPendingWatch();
      return null;
    }

    return pending;
  }
}

export const watchTrackingService = new WatchTrackingService();
