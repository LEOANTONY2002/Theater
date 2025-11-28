import NetInfo from '@react-native-community/netinfo';

export async function checkInternet(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected === true && state.isInternetReachable === true;
  } catch (e) {
    return false;
  }
}
