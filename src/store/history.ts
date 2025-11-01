import {RealmHistoryManager} from '../database/managers';

export const HistoryManager = {
  async getAll(): Promise<any[]> {
    const history = await RealmHistoryManager.getAll();
    
    // Return history items directly (no longer depends on Movie/TVShow cache)
    return history.map(item => ({
      id: item.contentId,
      title: item.title,
      name: item.name,
      overview: item.overview,
      poster_path: item.poster_path,
      backdrop_path: item.backdrop_path,
      vote_average: item.vote_average,
      release_date: item.release_date,
      first_air_date: item.first_air_date,
      genre_ids: [], // Not stored in HistoryItem
      type: item.type,
      viewedAt: item.viewedAt,
    }));
  },

  async getHistory(): Promise<any[]> {
    return await this.getAll();
  },

  async add(item: any): Promise<void> {
    // Validate that we have a valid ID
    if (!item || !item.id) {
      console.warn('[History] Cannot add item without ID:', item);
      return;
    }

    await RealmHistoryManager.add({
      contentId: item.id,
      type: item.type,
      title: item.title,
      name: item.name,
      poster_path: item.poster_path,
      backdrop_path: item.backdrop_path,
      vote_average: item.vote_average,
      release_date: item.release_date,
      first_air_date: item.first_air_date,
      overview: item.overview,
    });
  },

  async addToHistory(contentId: number, type: 'movie' | 'tv'): Promise<void> {
    // This method needs more data - should be deprecated
    await RealmHistoryManager.add({
      contentId,
      type,
    });
  },

  async clearHistory(): Promise<void> {
    await RealmHistoryManager.clear();
  },

  async clear(): Promise<void> {
    await RealmHistoryManager.clear();
  },
};
