import AsyncStorage from '@react-native-async-storage/async-storage';
import {queryClient} from '../services/queryClient';

export interface Language {
  iso_639_1: string;
  english_name: string;
  name: string;
}

const STORAGE_KEY = '@settings_content_languages';
const LANGUAGES_CACHE_KEY = '@languages_cache';

type LanguageChangeListener = () => void;
const listeners = new Set<LanguageChangeListener>();

export const SettingsManager = {
  async getContentLanguages(): Promise<Language[]> {
    try {
      const savedLanguages = await AsyncStorage.getItem(STORAGE_KEY);
      console.log('Getting saved languages from storage:', savedLanguages);
      if (!savedLanguages) return [];

      const parsedLanguages = JSON.parse(savedLanguages);
      console.log('Parsed saved languages:', parsedLanguages);
      return Array.isArray(parsedLanguages) ? parsedLanguages : [];
    } catch (error) {
      console.error('Error loading content languages:', error);
      return [];
    }
  },

  async setContentLanguages(languages: Language[]): Promise<void> {
    try {
      console.log('Saving languages to storage:', languages);
      const languagesString = JSON.stringify(languages);
      await AsyncStorage.setItem(STORAGE_KEY, languagesString);
      console.log('Languages saved successfully');

      // Invalidate relevant queries
      queryClient.invalidateQueries({queryKey: ['watchlist']});
      queryClient.invalidateQueries({queryKey: ['selectedLanguages']});

      // Notify all listeners
      listeners.forEach(listener => listener());
    } catch (error) {
      console.error('Error saving content languages:', error);
    }
  },

  async getCachedLanguages(): Promise<Language[] | null> {
    try {
      const cachedData = await AsyncStorage.getItem(LANGUAGES_CACHE_KEY);
      console.log('Getting cached languages from storage:', cachedData);
      if (!cachedData) return null;

      const parsedCache = JSON.parse(cachedData);
      console.log('Parsed cached languages:', parsedCache);
      return Array.isArray(parsedCache) ? parsedCache : null;
    } catch (error) {
      console.error('Error loading cached languages:', error);
      return null;
    }
  },

  async setCachedLanguages(languages: Language[]): Promise<void> {
    try {
      console.log('Caching languages to storage:', languages);
      const languagesString = JSON.stringify(languages);
      await AsyncStorage.setItem(LANGUAGES_CACHE_KEY, languagesString);
      console.log('Languages cached successfully');
    } catch (error) {
      console.error('Error caching languages:', error);
    }
  },

  addChangeListener(listener: LanguageChangeListener): void {
    listeners.add(listener);
  },

  removeChangeListener(listener: LanguageChangeListener): void {
    listeners.delete(listener);
  },

  // Debug method to clear all storage (for testing)
  async clearStorage(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([STORAGE_KEY, LANGUAGES_CACHE_KEY]);
      console.log('Storage cleared successfully');
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  },
};
