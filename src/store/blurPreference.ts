import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@settings/force_blur_all';

export type ThemeMode = 'glass' | 'normal';

let cached = false;
let mode: ThemeMode = 'glass';
const listeners = new Set<() => void>();

export const BlurPreference = {
  async init() {
    if (cached) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
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
    await AsyncStorage.setItem(STORAGE_KEY, mode);
    listeners.forEach(l => l());
  },
  getMode(): ThemeMode {
    return mode;
  },
  async setMode(next: ThemeMode) {
    mode = next;
    await AsyncStorage.setItem(STORAGE_KEY, mode);
    listeners.forEach(l => l());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
