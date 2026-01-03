import {useEffect} from 'react';
import {Platform, AppState, AppStateStatus} from 'react-native';
import SpInAppUpdates, {
  NeedsUpdateResponse,
  IAUUpdateKind,
  StartUpdateOptions,
} from 'sp-react-native-in-app-updates';
import {SettingsManager} from '../store/settings';

const inAppUpdates = new SpInAppUpdates(
  false, // isDebug (set to true if you wanna test it in debug mode, but usually false for prod)
);

export const useAppUpdate = () => {
  const checkForUpdates = async () => {
    // Only run on Android for now (iOS has its own strict rules and often just happens)
    if (Platform.OS !== 'android') return;

    try {
      console.log('[AppUpdate] Starting update check...');
      const result: NeedsUpdateResponse = await inAppUpdates.checkNeedsUpdate();

      if (result.shouldUpdate) {
        console.log('[AppUpdate] Update available:', result);

        // STALENESS LOGIC
        // Google Play allows you to set an "Update Priority" (0-5) when releasing
        // We map these to our 3 modes:

        const priority = (result as any).updatePriority || 0; // Default to 0 if undefined

        // MODE 1: No Notify
        if (priority <= 1) {
          console.log(
            '[AppUpdate] Priority is low (<=1), skipping notification.',
          );
          return;
        }

        // MODE 2: Flexible (Notify but don't force)
        // Downloads in background, less intrusive
        if (priority <= 3) {
          console.log(
            '[AppUpdate] Priority is medium (2-3), starting FLEXIBLE update.',
          );
          await inAppUpdates.startUpdate({
            updateType: IAUUpdateKind.FLEXIBLE,
          });
          return;
        }

        // MODE 3: Force (Immediate)
        // Blocks the screen until updated. Use for critical bugs.
        if (priority >= 4) {
          console.log(
            '[AppUpdate] Priority is high (>=4), starting IMMEDIATE update.',
          );
          await inAppUpdates.startUpdate({
            updateType: IAUUpdateKind.IMMEDIATE,
          });
        }
      }
    } catch (error) {
      // It's normal to fail in Debug builds if the app isn't signed/zipalgined with the Play Store cert
      console.log('[AppUpdate] Check failed (likely dev mode):', error);
    }
  };

  useEffect(() => {
    // Check on launch
    checkForUpdates();

    // Also check when app comes to foreground (in case they updated in background)
    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
          checkForUpdates();
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, []);
};
