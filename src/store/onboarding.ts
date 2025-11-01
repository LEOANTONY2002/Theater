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
      console.log('[Onboarding] Getting onboarding state from Realm...');
      const raw = await RealmSettingsManager.getSetting(ONBOARDING_KEY);
      console.log('[Onboarding] Raw value from Realm:', raw);
      
      if (!raw) {
        console.log('[Onboarding] No value found, returning default (false)');
        return DEFAULT_ONBOARDING;
      }
      
      const parsed = JSON.parse(raw);
      console.log('[Onboarding] Parsed value:', parsed);
      
      const result = {
        isOnboarded:
          typeof parsed?.isOnboarded === 'boolean'
            ? parsed.isOnboarded
            : DEFAULT_ONBOARDING.isOnboarded,
      };
      console.log('[Onboarding] Returning state:', result);
      return result;
    } catch (e) {
      console.error('[Onboarding] Error getting state:', e);
      return DEFAULT_ONBOARDING;
    }
  }

  static async setIsOnboarded(value: boolean): Promise<void> {
    console.log('[Onboarding] Setting isOnboarded to:', value);
    const toSave: OnboardingState = {isOnboarded: value};
    const jsonString = JSON.stringify(toSave);
    console.log('[Onboarding] Saving to Realm:', jsonString);
    await RealmSettingsManager.setSetting(ONBOARDING_KEY, jsonString);
    console.log('[Onboarding] ✅ Saved successfully');
    
    // Verify it was saved
    const verify = await RealmSettingsManager.getSetting(ONBOARDING_KEY);
    console.log('[Onboarding] Verification read:', verify);
  }
}
