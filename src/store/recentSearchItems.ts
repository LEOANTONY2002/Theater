import {RecentSearchItemManager} from '../database/managers';

export const RecentSearchItemsManager = {
  async getAll(): Promise<any[]> {
    const items = await RecentSearchItemManager.getAll();
    
    // Return items directly (no longer depends on Movie/TVShow cache)
    return items.map(item => ({
      id: item.contentId,
      title: item.title,
      name: item.name,
      overview: item.overview,
      poster_path: item.poster_path,
      backdrop_path: item.backdrop_path,
      vote_average: item.vote_average,
      release_date: item.release_date,
      first_air_date: item.first_air_date,
      genre_ids: [], // Not stored in RecentSearchItem
      type: item.type,
      searchedAt: item.searchedAt,
      isSearch: item.isSearch,
    }));
  },

  async add(item: any): Promise<void> {
    await RecentSearchItemManager.add({
      contentId: item.id,
      type: item.type,
      isSearch: item.isSearch ?? false, // Default to false if not provided
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

  async clear(): Promise<void> {
    await RecentSearchItemManager.clear();
  },
};
