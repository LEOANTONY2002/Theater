import {useState, useEffect, useCallback} from 'react';
import NetInfo, {NetInfoState} from '@react-native-community/netinfo';
import {checkInternet} from '../services/connectivity';

export const useConnectivity = () => {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Initial strict check
    checkInternet().then(setIsOnline);

    // Subscribe to NetInfo updates for immediate feedback
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      if (state.isConnected === false) {
        setIsOnline(false);
      } else if (state.isConnected === true) {
        // NetInfo says connected, but we can trust it generally.
        // We let the strict check (checkLikelyOnline) handle the "connected but no internet" later if needed.
        // For now, if NetInfo says online, we assume online to avoid false positives.
        setIsOnline(true);
      }
    });

    return unsubscribe;
  }, []);

  // Manual strict check
  const checkLikelyOnline = useCallback(async () => {
    const result = await checkInternet();
    setIsOnline(result);
    return result;
  }, []);

  return {isOnline, checkLikelyOnline};
};
