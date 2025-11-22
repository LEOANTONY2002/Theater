import {RealmSettingsManager} from '../database/managers';

const AI_MODEL_KEY = 'ai_model';
const AI_API_KEY_KEY = 'ai_api_key';
const AI_IS_DEFAULT_KEY = 'ai_is_default';

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
  model: 'gemini-2.5-flash-lite',
  apiKey: null,
  isDefault: true,
};

export class AISettingsManager {
  static async getSettings(): Promise<AISettings> {
    try {
      const model = await RealmSettingsManager.getSetting(AI_MODEL_KEY);
      const apiKey = await RealmSettingsManager.getSetting(AI_API_KEY_KEY);
      const isDefaultStr = await RealmSettingsManager.getSetting(
        AI_IS_DEFAULT_KEY,
      );

      const isDefault = isDefaultStr === 'true' || isDefaultStr === null;

      return {
        model: model || DEFAULT_SETTINGS.model,
        apiKey: apiKey || DEFAULT_SETTINGS.apiKey,
        isDefault,
      };
    } catch (error) {
      return DEFAULT_SETTINGS;
    }
  }

  static async saveSettings(settings: AISettingsInput): Promise<void> {
    try {
      const isDefault =
        typeof settings.isDefault === 'boolean'
          ? settings.isDefault
          : settings.apiKey === DEFAULT_SETTINGS.apiKey;

      await RealmSettingsManager.setSetting(AI_MODEL_KEY, settings.model);
      await RealmSettingsManager.setSetting(
        AI_API_KEY_KEY,
        settings.apiKey || '',
      );
      await RealmSettingsManager.setSetting(
        AI_IS_DEFAULT_KEY,
        isDefault.toString(),
      );
    } catch (error) {
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
      throw error;
    }
  }
}
