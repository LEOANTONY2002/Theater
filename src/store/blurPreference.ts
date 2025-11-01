import {RealmSettingsManager} from '../database/managers';

const BLUR_PREFERENCE_KEY = 'blur_preference';

export type ThemeMode = 'glass' | 'normal';

let cached = false;
let mode: ThemeMode = 'glass';
const listeners = new Set<() => void>();

export const BlurPreference = {
  async init() {
    if (cached) return;
    try {
      const raw = await RealmSettingsManager.getSetting(BLUR_PREFERENCE_KEY);
      if (raw === 'glass' || raw === 'normal') {
        mode = raw;
      } else if (raw === 'true') {
        // Back-compat: true => glass
        mode = 'glass';
      } else if (raw === 'false') {
        // Back-compat: false => normal
        mode = 'normal';
      } else {
        mode = 'glass';
      }
      cached = true;
      // Notify listeners so UI can re-render with the loaded mode
      listeners.forEach(l => l());
    } catch {
      cached = true;
      mode = 'glass';
      listeners.forEach(l => l());
    }
  },
  // Back-compat boolean getter: true when glass
  get(): boolean {
    return mode === 'glass';
  },
  // Back-compat boolean setter
  async set(value: boolean) {
    mode = value ? 'glass' : 'normal';
    await RealmSettingsManager.setSetting(BLUR_PREFERENCE_KEY, mode);
    listeners.forEach(l => l());
  },
  getMode(): ThemeMode {
    return mode;
  },
  async setMode(next: ThemeMode) {
    mode = next;
    await RealmSettingsManager.setSetting(BLUR_PREFERENCE_KEY, mode);
    listeners.forEach(l => l());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
