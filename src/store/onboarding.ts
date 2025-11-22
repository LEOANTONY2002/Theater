import {RealmSettingsManager} from '../database/managers';

const ONBOARDING_KEY = 'onboarding_state';

export interface OnboardingState {
  isOnboarded: boolean;
}

const DEFAULT_ONBOARDING: OnboardingState = {
  isOnboarded: false,
};

export class OnboardingManager {
  static async getState(): Promise<OnboardingState> {
    try {
      const raw = await RealmSettingsManager.getSetting(ONBOARDING_KEY);

      if (!raw) {
        return DEFAULT_ONBOARDING;
      }

      const parsed = JSON.parse(raw);

      const result = {
        isOnboarded:
          typeof parsed?.isOnboarded === 'boolean'
            ? parsed.isOnboarded
            : DEFAULT_ONBOARDING.isOnboarded,
      };
      return result;
    } catch (e) {
      return DEFAULT_ONBOARDING;
    }
  }

  static async setIsOnboarded(value: boolean): Promise<void> {
    const toSave: OnboardingState = {isOnboarded: value};
    const jsonString = JSON.stringify(toSave);
    await RealmSettingsManager.setSetting(ONBOARDING_KEY, jsonString);

    // Verify it was saved
    const verify = await RealmSettingsManager.getSetting(ONBOARDING_KEY);
  }
}
