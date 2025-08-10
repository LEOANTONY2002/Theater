import AsyncStorage from '@react-native-async-storage/async-storage';

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
      const raw = await AsyncStorage.getItem(ONBOARDING_KEY);
      if (!raw) return DEFAULT_ONBOARDING;
      const parsed = JSON.parse(raw);
      return {
        isOnboarded:
          typeof parsed?.isOnboarded === 'boolean'
            ? parsed.isOnboarded
            : DEFAULT_ONBOARDING.isOnboarded,
      };
    } catch (e) {
      return DEFAULT_ONBOARDING;
    }
  }

  static async setIsOnboarded(value: boolean): Promise<void> {
    const toSave: OnboardingState = {isOnboarded: value};
    await AsyncStorage.setItem(ONBOARDING_KEY, JSON.stringify(toSave));
  }
}
