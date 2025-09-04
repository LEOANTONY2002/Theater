import AsyncStorage from '@react-native-async-storage/async-storage';

const AI_SETTINGS_KEY = 'ai_settings';

export interface AISettings {
  model: string;
  apiKey: string | null;
  isDefault: boolean; // true if using the hardcoded default key
}

// Allow callers to omit isDefault; we compute it from apiKey
export interface AISettingsInput {
  model: string;
  apiKey: string | null;
  isDefault?: boolean;
}

const DEFAULT_SETTINGS: AISettings = {
  model: 'gemini-2.5-flash',
  apiKey: null,
  isDefault: true,
};

export class AISettingsManager {
  static async getSettings(): Promise<AISettings> {
    try {
      const stored = await AsyncStorage.getItem(AI_SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const apiKey = parsed.apiKey || DEFAULT_SETTINGS.apiKey;
        const isDefault =
          typeof parsed.isDefault === 'boolean'
            ? parsed.isDefault
            : apiKey === DEFAULT_SETTINGS.apiKey;
        return {
          model: parsed.model || DEFAULT_SETTINGS.model,
          apiKey,
          isDefault,
        };
      }
      return DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Error getting AI settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  static async saveSettings(settings: AISettingsInput): Promise<void> {
    try {
      const isDefault =
        typeof settings.isDefault === 'boolean'
          ? settings.isDefault
          : settings.apiKey === DEFAULT_SETTINGS.apiKey;
      await AsyncStorage.setItem(
        AI_SETTINGS_KEY,
        JSON.stringify({...settings, isDefault}),
      );
    } catch (error) {
      console.error('Error saving AI settings:', error);
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
        // isDefault will auto-compute based on apiKey
      });
    } catch (error) {
      console.error('Error updating API key:', error);
      throw error;
    }
  }
}
