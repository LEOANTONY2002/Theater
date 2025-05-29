import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Language {
  iso_639_1: string;
  english_name: string;
  name: string;
}

const STORAGE_KEY = '@settings_content_languages';

type LanguageChangeListener = () => void;
const listeners = new Set<LanguageChangeListener>();

export const SettingsManager = {
  async getContentLanguages(): Promise<Language[]> {
    try {
      const savedLanguages = await AsyncStorage.getItem(STORAGE_KEY);
      return savedLanguages ? JSON.parse(savedLanguages) : [];
    } catch (error) {
      console.error('Error loading content languages:', error);
      return [];
    }
  },

  async setContentLanguages(languages: Language[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(languages));
      // Notify all listeners
      listeners.forEach(listener => listener());
    } catch (error) {
      console.error('Error saving content languages:', error);
    }
  },

  addChangeListener(listener: LanguageChangeListener): void {
    listeners.add(listener);
  },

  removeChangeListener(listener: LanguageChangeListener): void {
    listeners.delete(listener);
  },
};
