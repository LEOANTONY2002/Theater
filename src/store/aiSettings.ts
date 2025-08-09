import AsyncStorage from '@react-native-async-storage/async-storage';

const AI_SETTINGS_KEY = 'ai_settings';

export interface AISettings {
  model: string;
  apiKey: string;
}

const DEFAULT_SETTINGS: AISettings = {
  model: 'gemini-2.5-flash',
  apiKey: 'AIzaSyBNUXbNTw9EPA5ixGxStNtAAMZLUo4f3xs', // Default API key
};

export class AISettingsManager {
  static async getSettings(): Promise<AISettings> {
    try {
      const stored = await AsyncStorage.getItem(AI_SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          model: parsed.model || DEFAULT_SETTINGS.model,
          apiKey: parsed.apiKey || DEFAULT_SETTINGS.apiKey,
        };
      }
      return DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Error getting AI settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  static async saveSettings(settings: AISettings): Promise<void> {
    try {
      await AsyncStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving AI settings:', error);
      throw error;
    }
  }

  static async resetToDefaults(): Promise<void> {
    try {
      await AsyncStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
    } catch (error) {
      console.error('Error resetting AI settings:', error);
      throw error;
    }
  }

  static async updateModel(model: string): Promise<void> {
    try {
      const currentSettings = await this.getSettings();
      await this.saveSettings({
        ...currentSettings,
        model,
      });
    } catch (error) {
      console.error('Error updating model:', error);
      throw error;
    }
  }

  static async updateApiKey(apiKey: string): Promise<void> {
    try {
      const currentSettings = await this.getSettings();
      await this.saveSettings({
        ...currentSettings,
        apiKey,
      });
    } catch (error) {
      console.error('Error updating API key:', error);
      throw error;
    }
  }
}
