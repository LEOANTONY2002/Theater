import NetInfo from '@react-native-community/netinfo';

export async function checkInternet(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    // Optimistic check: if connected, assume reachable if status is unknown (null)
    return !!state.isConnected && (state.isInternetReachable ?? true);
  } catch (e) {
    return false;
  }
}
