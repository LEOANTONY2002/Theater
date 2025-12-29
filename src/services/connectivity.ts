import NetInfo from '@react-native-community/netinfo';

export async function checkInternet(): Promise<boolean> {
  try {
    // First check NetInfo for quick response
    const state = await NetInfo.fetch();
    if (!state.isConnected) {
      return false;
    }

    // Actually test connectivity with a real request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

    try {
      const response = await fetch('https://www.google.com/generate_204', {
        method: 'HEAD',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response.ok || response.status === 204;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      return false;
    }
  } catch (e) {
    return false;
  }
}
