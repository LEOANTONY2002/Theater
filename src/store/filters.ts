import {RealmFiltersManager} from '../database/managers';
import {SavedFilter} from '../types/filters';

export const FiltersManager = {
  async getSavedFilters(): Promise<SavedFilter[]> {
    const filters = await RealmFiltersManager.getSavedFilters();
    return filters.map(filter => ({
      ...filter,
      type: filter.type as 'all' | 'movie' | 'tv',
      createdAt: filter.createdAt.getTime(),
    }));
  },

  async saveFilter(name: string, params: any, type: 'all' | 'movie' | 'tv'): Promise<string> {
    return await RealmFiltersManager.saveFilter(name, params, type);
  },

  async updateFilter(id: string, filter: {name: string; params: any; type: 'all' | 'movie' | 'tv'}): Promise<void> {
    await RealmFiltersManager.updateFilter(id, filter);
  },

  async deleteFilter(id: string): Promise<void> {
    await RealmFiltersManager.deleteFilter(id);
  },
};
