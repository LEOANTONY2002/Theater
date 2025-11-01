import {queryClient} from '../services/queryClient';
import {RealmSettingsManager} from '../database/managers';

export interface Language {
  iso_639_1: string;
  english_name: string;
  name: string;
}

type SettingsChangeListener = () => void;
const listeners = new Set<SettingsChangeListener>();

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
    const regions = await RealmSettingsManager.getSetting('@settings/regions');
    return regions ? JSON.parse(regions) : [];
  },

  async getMyLanguage(): Promise<Language | null> {
    try {
      const raw = await RealmSettingsManager.getSetting('@settings/my_language');
      return raw ? (JSON.parse(raw) as Language) : null;
    } catch (e) {
      console.error('Error reading My Language:', e);
      return null;
    }
  },

  async setMyLanguage(lang: Language | null): Promise<void> {
    try {
      if (lang) {
        await RealmSettingsManager.setSetting('@settings/my_language', JSON.stringify(lang));
      } else {
        await RealmSettingsManager.removeSetting('@settings/my_language');
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

  async getMyOTTs(): Promise<Array<{id: number; provider_name: string; logo_path?: string}>> {
    try {
      const raw = await RealmSettingsManager.getSetting('@settings/my_otts');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Error reading My OTTs:', e);
      return [];
    }
  },

  async setMyOTTs(providers: Array<{id: number; provider_name: string; logo_path?: string}>): Promise<void> {
    try {
      await RealmSettingsManager.setSetting('@settings/my_otts', JSON.stringify(providers || []));
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
    await RealmSettingsManager.setSetting('@settings/regions', JSON.stringify(regions));
    queryClient.invalidateQueries({queryKey: ['regions']});
  },

  async getRegion(): Promise<any> {
    const region = await RealmSettingsManager.getSetting('@settings/selected_region');
    return region ? JSON.parse(region) : null;
  },

  async setRegion(region: any): Promise<void> {
    try {
      await RealmSettingsManager.setSetting('@settings/selected_region', JSON.stringify(region));
      debounce(async () => {
        await Promise.all([
          queryClient.invalidateQueries({queryKey: ['region']}),
          queryClient.invalidateQueries({queryKey: ['top_10_movies_today_by_region']}),
          queryClient.invalidateQueries({queryKey: ['top_10_shows_today_by_region']}),
          queryClient.invalidateQueries({queryKey: ['watchProviders']}),
          queryClient.invalidateQueries({queryKey: ['movies']}),
          queryClient.invalidateQueries({queryKey: ['tvshows']}),
          queryClient.invalidateQueries({queryKey: ['discover_movies']}),
          queryClient.invalidateQueries({queryKey: ['discover_tv']}),
        ]);
        await Promise.all([
          queryClient.refetchQueries({queryKey: ['region']}),
          queryClient.refetchQueries({queryKey: ['top_10_movies_today_by_region']}),
          queryClient.refetchQueries({queryKey: ['top_10_shows_today_by_region']}),
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
      const savedLanguages = await RealmSettingsManager.getSetting('@settings_content_languages');
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
      await RealmSettingsManager.setSetting('@settings_content_languages', JSON.stringify(languages));
      debounce(() => {
        queryClient.invalidateQueries({queryKey: ['watchlist']});
        queryClient.invalidateQueries({queryKey: ['selectedLanguages']});
        listeners.forEach(listener => listener());
      }, 500)();
    } catch (error) {
      console.error('Error saving content languages:', error);
    }
  },


  addChangeListener(listener: SettingsChangeListener): void {
    listeners.add(listener);
  },

  removeChangeListener(listener: SettingsChangeListener): void {
  },

  async clearStorage(): Promise<void> {
    try {
      await RealmSettingsManager.removeSetting('@settings_content_languages');
      await RealmSettingsManager.removeSetting('@settings/selected_region');
    } catch (error) {
      console.error('Error clearing settings storage:', error);
    }
  },
};
