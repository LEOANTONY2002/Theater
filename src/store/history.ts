import AsyncStorage from '@react-native-async-storage/async-storage';
import type {ContentItem} from '../components/MovieList';

const STORAGE_KEY = '@theater_history_items_v1';
const MAX_ITEMS = 100;

export type HistoryItem = ContentItem & {
  viewedAt: number;
};

export const HistoryManager = {
  async getAll(): Promise<HistoryItem[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed: HistoryItem[] = JSON.parse(raw);
      // sort desc by viewedAt
      return parsed.sort((a, b) => (b.viewedAt || 0) - (a.viewedAt || 0));
    } catch (e) {
      console.warn('HistoryManager.getAll error', e);
      return [];
    }
  },

  async add(item: ContentItem): Promise<void> {
    try {
      const list = await this.getAll();
      const withoutDupes = list.filter(i => i.id !== item.id);
      const toSave: HistoryItem = {
        ...item,
        viewedAt: Date.now(),
      };
      const updated = [toSave, ...withoutDupes].slice(0, MAX_ITEMS);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('HistoryManager.add error', e);
    }
  },

  async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('HistoryManager.clear error', e);
    }
  },
};
