import {RealmSettingsManager} from '../database/managers';

import {AI_CONFIG} from '../config/aiConfig';

const AI_MODEL_KEY = 'ai_model';
const AI_MODEL_CREATED_KEY = 'ai_model_created';
const AI_API_KEY_KEY = 'ai_api_key';
const AI_IS_DEFAULT_KEY = 'ai_is_default';
const AI_ENABLED_KEY = 'ai_enabled';

export interface AISettings {
  model: string;
  modelCreated: number | null;
  apiKey: string | null;
  isDefault: boolean; // true if using the hardcoded default key
  aiEnabled: boolean;
}

// Allow callers to omit isDefault; we compute it from apiKey
export interface AISettingsInput {
  model: string;
  modelCreated?: number | null;
  apiKey: string | null;
  isDefault?: boolean;
  aiEnabled?: boolean;
}

const DEFAULT_SETTINGS: AISettings = {
  model: AI_CONFIG.DEFAULT_MODEL,
  modelCreated: null,
  apiKey: null,
  isDefault: true,
  aiEnabled: false,
};

export class AISettingsManager {
  static async getSettings(): Promise<AISettings> {
    try {
      const model = await RealmSettingsManager.getSetting(AI_MODEL_KEY);
      const modelCreated = await RealmSettingsManager.getSetting(
        AI_MODEL_CREATED_KEY,
      );
      const apiKey = await RealmSettingsManager.getSetting(AI_API_KEY_KEY);
      const isDefaultStr = await RealmSettingsManager.getSetting(
        AI_IS_DEFAULT_KEY,
      );
      const aiEnabledStr = await RealmSettingsManager.getSetting(
        AI_ENABLED_KEY,
      );

      const isDefault = isDefaultStr === 'true' || isDefaultStr === null;
      const aiEnabled = aiEnabledStr === 'true';

      return {
        model: model || DEFAULT_SETTINGS.model,
        modelCreated: modelCreated ? parseInt(modelCreated, 10) : null,
        apiKey: apiKey || DEFAULT_SETTINGS.apiKey,
        isDefault,
        aiEnabled,
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
      if (settings.modelCreated) {
        await RealmSettingsManager.setSetting(
          AI_MODEL_CREATED_KEY,
          settings.modelCreated.toString(),
        );
      } else {
        await RealmSettingsManager.setSetting(AI_MODEL_CREATED_KEY, '');
      }
      await RealmSettingsManager.setSetting(
        AI_API_KEY_KEY,
        settings.apiKey || '',
      );
      await RealmSettingsManager.setSetting(
        AI_IS_DEFAULT_KEY,
        isDefault.toString(),
      );
      if (settings.aiEnabled !== undefined) {
        await RealmSettingsManager.setSetting(
          AI_ENABLED_KEY,
          settings.aiEnabled.toString(),
        );
      }
    } catch (error) {
      throw error;
    }
  }

  static async updateModel(
    model: string,
    created?: number | null,
  ): Promise<void> {
    try {
      const currentSettings = await this.getSettings();
      await this.saveSettings({
        ...currentSettings,
        model,
        modelCreated: created ?? currentSettings.modelCreated,
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
      });
    } catch (error) {
      throw error;
    }
  }

  static async updateAIEnabled(enabled: boolean): Promise<void> {
    try {
      const currentSettings = await this.getSettings();
      await this.saveSettings({
        ...currentSettings,
        aiEnabled: enabled,
      });
    } catch (error) {
      throw error;
    }
  }
}
