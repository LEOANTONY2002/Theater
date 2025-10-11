import AsyncStorage from '@react-native-async-storage/async-storage';
import {queryClient} from '../services/queryClient';

export interface Language {
  iso_639_1: string;
  english_name: string;
  name: string;
}

const STORAGE_KEY = '@settings_content_languages';
const LANGUAGES_CACHE_KEY = '@languages_cache';
const MY_LANGUAGE_KEY = '@settings/my_language';
const MY_OTTS_KEY = '@settings/my_otts';

type SettingsChangeListener = () => void;
const listeners = new Set<SettingsChangeListener>();

const KEYS = {
  LANGUAGES: '@settings/languages',
  REGIONS: '@settings/regions',
  SELECTED_LANGUAGE: '@settings/selected_language',
  SELECTED_REGION: '@settings/selected_region',
};

// Add debounce utility
function debounce(fn: (...args: any[]) => void, delay: number) {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: any[]) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

export const SettingsManager = {
  async getRegions(): Promise<any> {
    const regions = await AsyncStorage.getItem(KEYS.REGIONS);
    return regions ? JSON.parse(regions) : [];
  },

  // My Language (single selection)
  async getMyLanguage(): Promise<Language | null> {
    try {
      const raw = await AsyncStorage.getItem(MY_LANGUAGE_KEY);
      return raw ? (JSON.parse(raw) as Language) : null;
    } catch (e) {
      console.error('Error reading My Language:', e);
      return null;
    }
  },

  async setMyLanguage(lang: Language | null): Promise<void> {
    try {
      if (lang) {
        await AsyncStorage.setItem(MY_LANGUAGE_KEY, JSON.stringify(lang));
      } else {
        await AsyncStorage.removeItem(MY_LANGUAGE_KEY);
      }
      debounce(async () => {
        await Promise.all([
          queryClient.invalidateQueries({queryKey: ['my_language']}),
          queryClient.invalidateQueries({queryKey: ['my_language_movies']}),
          queryClient.invalidateQueries({queryKey: ['my_language_tv']}),
        ]);
        listeners.forEach(listener => listener());
      }, 300)();
    } catch (e) {
      console.error('Error saving My Language:', e);
    }
  },

  // My OTTs (multi-select of providers)
  async getMyOTTs(): Promise<Array<{id: number; provider_name: string; logo_path?: string}>> {
    try {
      const raw = await AsyncStorage.getItem(MY_OTTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Error reading My OTTs:', e);
      return [];
    }
  },

  async setMyOTTs(providers: Array<{id: number; provider_name: string; logo_path?: string}>): Promise<void> {
    try {
      await AsyncStorage.setItem(MY_OTTS_KEY, JSON.stringify(providers || []));
      debounce(async () => {
        await Promise.all([
          queryClient.invalidateQueries({queryKey: ['my_otts']}),
          queryClient.invalidateQueries({queryKey: ['my_otts_movies']}),
          queryClient.invalidateQueries({queryKey: ['my_otts_tv']}),
        ]);
        listeners.forEach(listener => listener());
      }, 300)();
    } catch (e) {
      console.error('Error saving My OTTs:', e);
    }
  },

  async setRegions(regions: any): Promise<void> {
    await AsyncStorage.setItem(KEYS.REGIONS, JSON.stringify(regions));
    queryClient.invalidateQueries({queryKey: ['regions']});
  },

  async getRegion(): Promise<any> {
    const region = await AsyncStorage.getItem(KEYS.SELECTED_REGION);
    return region ? JSON.parse(region) : null;
    // : {
    //     iso_3166_1: 'US',
    //     english_name: 'United States of America',
    //     native_name: 'United States',
    //   };
  },

  async setRegion(region: any): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.SELECTED_REGION, JSON.stringify(region));
      // Debounced invalidate and refetch
      debounce(async () => {
        await Promise.all([
          queryClient.invalidateQueries({queryKey: ['region']}),
          queryClient.invalidateQueries({
            queryKey: ['top_10_movies_today_by_region'],
          }),
          queryClient.invalidateQueries({
            queryKey: ['top_10_shows_today_by_region'],
          }),
          queryClient.invalidateQueries({queryKey: ['watchProviders']}),
          queryClient.invalidateQueries({queryKey: ['movies']}),
          queryClient.invalidateQueries({queryKey: ['tvshows']}),
          queryClient.invalidateQueries({queryKey: ['discover_movies']}),
          queryClient.invalidateQueries({queryKey: ['discover_tv']}),
        ]);
        await Promise.all([
          queryClient.refetchQueries({queryKey: ['region']}),
          queryClient.refetchQueries({
            queryKey: ['top_10_movies_today_by_region'],
          }),
          queryClient.refetchQueries({
            queryKey: ['top_10_shows_today_by_region'],
          }),
          queryClient.refetchQueries({queryKey: ['watchProviders']}),
          queryClient.refetchQueries({queryKey: ['movies']}),
          queryClient.refetchQueries({queryKey: ['tvshows']}),
          queryClient.refetchQueries({queryKey: ['discover_movies']}),
          queryClient.refetchQueries({queryKey: ['discover_tv']}),
        ]);
        listeners.forEach(listener => listener());
      }, 500)();
    } catch (error) {
      console.error('Error setting region:', error);
      throw error;
    }
  },

  async getContentLanguages(): Promise<Language[]> {
    try {
      const savedLanguages = await AsyncStorage.getItem(STORAGE_KEY);
      if (!savedLanguages) return [];

      const parsedLanguages = JSON.parse(savedLanguages);
      return Array.isArray(parsedLanguages) ? parsedLanguages : [];
    } catch (error) {
      console.error('Error loading content languages:', error);
      return [];
    }
  },

  async setContentLanguages(languages: Language[]): Promise<void> {
    try {
      const languagesString = JSON.stringify(languages);
      await AsyncStorage.setItem(STORAGE_KEY, languagesString);
      debounce(() => {
        queryClient.invalidateQueries({queryKey: ['watchlist']});
        queryClient.invalidateQueries({queryKey: ['selectedLanguages']});
        listeners.forEach(listener => listener());
      }, 500)();
    } catch (error) {
      console.error('Error saving content languages:', error);
    }
  },

  async getCachedLanguages(): Promise<Language[] | null> {
    try {
      const cachedData = await AsyncStorage.getItem(LANGUAGES_CACHE_KEY);
      if (!cachedData) return null;

      const parsedCache = JSON.parse(cachedData);
      return Array.isArray(parsedCache) ? parsedCache : null;
    } catch (error) {
      console.error('Error loading cached languages:', error);
      return null;
    }
  },

  async setCachedLanguages(languages: Language[]): Promise<void> {
    try {
      const languagesString = JSON.stringify(languages);
      await AsyncStorage.setItem(LANGUAGES_CACHE_KEY, languagesString);
    } catch (error) {
      console.error('Error caching languages:', error);
    }
  },

  // Combined listener management for both language and region changes
  addChangeListener(listener: SettingsChangeListener): void {
    listeners.add(listener);
  },

  removeChangeListener(listener: SettingsChangeListener): void {
    listeners.delete(listener);
  },

  // Debug method to clear all storage (for testing)
  async clearStorage(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEY,
        LANGUAGES_CACHE_KEY,
        KEYS.SELECTED_REGION,
        KEYS.REGIONS,
      ]);
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  },
};
