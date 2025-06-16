import AsyncStorage from '@react-native-async-storage/async-storage';
import {SavedFilter, FilterParams} from '../types/filters';
import {queryClient} from '../services/queryClient';

const STORAGE_KEY = '@saved_filters';

export const FiltersManager = {
  async getSavedFilters(): Promise<SavedFilter[]> {
    try {
      const savedFilters = await AsyncStorage.getItem(STORAGE_KEY);
      console.log('savedFilters AsyncStorage', savedFilters);
      return savedFilters ? JSON.parse(savedFilters) : [];
    } catch (error) {
      console.error('Error loading saved filters:', error);
      return [];
    }
  },

  async saveFilter(
    name: string,
    params: FilterParams,
    type: 'all' | 'movie' | 'tv',
  ): Promise<SavedFilter> {
    try {
      const filters = await this.getSavedFilters();

      // Check if filter with same name exists
      if (filters.some(f => f.name.toLowerCase() === name.toLowerCase())) {
        throw new Error('A filter with this name already exists');
      }

      const timestamp = Date.now();
      const newFilter: SavedFilter = {
        id: timestamp.toString(),
        name,
        params,
        type,
        createdAt: timestamp,
      };

      const updatedFilters = [...filters, newFilter];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedFilters));

      // Invalidate queries
      queryClient.invalidateQueries({queryKey: ['savedFilters']});

      return newFilter;
    } catch (error) {
      console.error('Error saving filter:', error);
      throw error;
    }
  },

  async updateFilter(id: string, updates: Partial<SavedFilter>): Promise<void> {
    try {
      const filters = await this.getSavedFilters();
      const filterIndex = filters.findIndex(f => f.id === id);

      if (filterIndex === -1) {
        throw new Error('Filter not found');
      }

      // If name is being updated, check for duplicates
      if (
        updates.name &&
        filters.some(
          f =>
            f.id !== id && f.name.toLowerCase() === updates.name!.toLowerCase(),
        )
      ) {
        throw new Error('A filter with this name already exists');
      }

      filters[filterIndex] = {
        ...filters[filterIndex],
        ...updates,
      };

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filters));

      // Invalidate queries
      queryClient.invalidateQueries({queryKey: ['savedFilters']});
    } catch (error) {
      console.error('Error updating filter:', error);
      throw error;
    }
  },

  async deleteFilter(id: string): Promise<void> {
    try {
      const filters = await this.getSavedFilters();
      const updatedFilters = filters.filter(f => f.id !== id);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedFilters));

      // Invalidate queries
      queryClient.invalidateQueries({queryKey: ['savedFilters']});
    } catch (error) {
      console.error('Error deleting filter:', error);
      throw error;
    }
  },

  async findMatchingFilter(
    params: FilterParams,
    type: 'all' | 'movie' | 'tv',
  ): Promise<SavedFilter | null> {
    try {
      const filters = await this.getSavedFilters();
      return (
        filters.find(
          f =>
            f.type === type &&
            JSON.stringify(f.params) === JSON.stringify(params),
        ) || null
      );
    } catch (error) {
      console.error('Error finding matching filter:', error);
      return null;
    }
  },
};
