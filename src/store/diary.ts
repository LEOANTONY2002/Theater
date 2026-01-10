import {queryClient} from '../services/queryClient';
import {getRealm} from '../database/realm';
import {DiaryEntry} from '../database/schema';

export interface IDiaryEntry {
  id: number;
  type: 'movie' | 'tv';
  title: string;
  poster_path?: string;
  backdrop_path?: string;
  progress: number;
  status: 'watching' | 'completed' | 'dropped' | 'plan_to_watch';
  last_season: number;
  last_episode: number;
  total_seasons: number;
  total_episodes: number;
  tv_status?: string;
  note?: string;
  season_notes?: {[key: string]: string};
  episode_notes?: {[key: string]: string};
  rating?: number;
  mood?: string;
  started_at: string;
  last_updated_at: string;
  finished_at?: string;
}

class DiaryManager {
  private listeners: (() => void)[] = [];

  addChangeListener(listener: () => void) {
    this.listeners.push(listener);
  }

  removeChangeListener(listener: () => void) {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  private mapEntry(entry: DiaryEntry): IDiaryEntry {
    return {
      id: entry._id,
      type: entry.type as 'movie' | 'tv',
      title: entry.title,
      poster_path: entry.poster_path || undefined,
      backdrop_path: entry.backdrop_path || undefined,
      progress: entry.progress,
      status: entry.status as any,
      last_season: entry.last_season,
      last_episode: entry.last_episode,
      total_seasons: entry.total_seasons,
      total_episodes: entry.total_episodes,
      tv_status: entry.tv_status || undefined,
      note: entry.note || undefined,
      season_notes: entry.season_notes ? JSON.parse(entry.season_notes) : {},
      episode_notes: entry.episode_notes ? JSON.parse(entry.episode_notes) : {},
      rating: entry.rating || undefined,
      mood: entry.mood || undefined,
      started_at: entry.started_at.toISOString(),
      last_updated_at: entry.last_updated_at.toISOString(),
      finished_at: entry.finished_at?.toISOString(),
    };
  }

  getEntry(id: number): IDiaryEntry | null {
    try {
      const realm = getRealm();
      const entry = realm.objectForPrimaryKey<DiaryEntry>('DiaryEntry', id);
      if (!entry) return null;
      return this.mapEntry(entry);
    } catch (error) {
      return null;
    }
  }

  getAllEntries(): IDiaryEntry[] {
    try {
      const realm = getRealm();
      const entries = realm
        .objects<DiaryEntry>('DiaryEntry')
        .sorted('last_updated_at', true);
      return entries.map(e => this.mapEntry(e));
    } catch (error) {
      console.error('[DiaryManager] Error getting all entries:', error);
      return [];
    }
  }

  /**
   * Update or Create a Diary Entry
   */
  async updateEntry(
    data: Partial<IDiaryEntry> & {
      id: number;
      type: 'movie' | 'tv';
      title: string;
    },
  ): Promise<void> {
    try {
      const realm = getRealm();
      const existing = realm.objectForPrimaryKey<DiaryEntry>(
        'DiaryEntry',
        data.id,
      );

      // Prepare JSON fields if they are updated
      const seasonNotesStr = data.season_notes
        ? JSON.stringify(data.season_notes)
        : undefined;
      const episodeNotesStr = data.episode_notes
        ? JSON.stringify(data.episode_notes)
        : undefined;

      realm.write(() => {
        // If creating new or updating basic fields
        const now = new Date();
        const updatedAt = data.last_updated_at
          ? new Date(data.last_updated_at)
          : now;

        const updateObj: any = {
          _id: data.id,
          type: data.type,
          title: data.title,
          last_updated_at: updatedAt,
        };

        if (!existing) {
          updateObj.started_at = data.started_at
            ? new Date(data.started_at)
            : updatedAt;
        }

        // Only update fields if they are provided in 'data'
        if (data.poster_path !== undefined)
          updateObj.poster_path = data.poster_path;
        if (data.backdrop_path !== undefined)
          updateObj.backdrop_path = data.backdrop_path;
        if (data.progress !== undefined) updateObj.progress = data.progress;
        if (data.status !== undefined) updateObj.status = data.status;
        if (data.last_season !== undefined)
          updateObj.last_season = data.last_season;
        if (data.last_episode !== undefined)
          updateObj.last_episode = data.last_episode;
        if (data.total_seasons !== undefined)
          updateObj.total_seasons = data.total_seasons;
        if (data.total_episodes !== undefined)
          updateObj.total_episodes = data.total_episodes;
        if (data.tv_status !== undefined) updateObj.tv_status = data.tv_status;
        if (data.note !== undefined) updateObj.note = data.note;
        if (data.rating !== undefined) updateObj.rating = data.rating;
        if (data.mood !== undefined) updateObj.mood = data.mood;

        // Notes merging logic handled by caller usually, but here we just replace if provided
        // Ideally caller fetches existing -> merges -> sends full object back
        if (seasonNotesStr !== undefined)
          updateObj.season_notes = seasonNotesStr;
        if (episodeNotesStr !== undefined)
          updateObj.episode_notes = episodeNotesStr;

        // Auto-set finished_at if status becomes completed
        if (
          data.status === 'completed' &&
          (!existing || existing.status !== 'completed')
        ) {
          updateObj.finished_at = now;
        }

        realm.create('DiaryEntry', updateObj, Realm.UpdateMode.Modified);
      });

      queryClient.invalidateQueries({queryKey: ['diaryEntry', data.id]});
      queryClient.invalidateQueries({queryKey: ['diary']});
      this.notifyListeners();
    } catch (error) {
      console.error('[DiaryManager] Error updating entry:', error);
      throw error;
    }
  }

  async deleteEntry(id: number): Promise<void> {
    try {
      const realm = getRealm();
      const existing = realm.objectForPrimaryKey<DiaryEntry>('DiaryEntry', id);
      if (existing) {
        realm.write(() => {
          realm.delete(existing);
        });
        queryClient.invalidateQueries({queryKey: ['diaryEntry', id]});
        queryClient.invalidateQueries({queryKey: ['diary']});
        this.notifyListeners();
      }
    } catch (error) {
      console.error('[DiaryManager] Error deleting entry:', error);
    }
  }
}

export const diaryManager = new DiaryManager();
