import {Linking, Platform} from 'react-native';

export const openNetworkSettings = async () => {
  try {
    if (Platform.OS === 'android') {
      // Intent for Wireless & Networks (where DNS usually is)
      await Linking.sendIntent('android.settings.WIRELESS_SETTINGS');
    } else {
      // iOS: Try to open WiFi settings
      // Note: 'App-Prefs' scheme is not officially documented but widely used.
      // Fallback to openSettings if it fails.
      const url = 'App-Prefs:root=WIFI';
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openSettings();
      }
    }
  } catch (error) {
    console.warn(
      'Failed to open specific settings, falling back to app settings',
      error,
    );
    await Linking.openSettings();
  }
};
