import {useEffect, useRef} from 'react';
import {useNavigationState} from './useNavigationState';
import {queryClient} from '../services/queryClient';
import {useNavigation} from '@react-navigation/native';

export const useDeepNavigationProtection = () => {
  const navigationDepth = useRef(0);
  const {isScreenFocused} = useNavigationState();
  const navigation = useNavigation();

  // useEffect(() => {
  //   if (isScreenFocused) {
  //     navigationDepth.current += 1;
  //   } else {
  //     navigationDepth.current = Math.max(0, navigationDepth.current - 1);
  //   }

  // If we're too deep, start aggressive cleanup
  // if (navigationDepth.current > 5) {
  //   // Force cleanup of old queries
  //   setTimeout(() => {
  //     // Clear inactive queries to prevent memory bloat
  //     queryClient.removeQueries({
  //       predicate: query =>
  //         !query.state.dataUpdatedAt ||
  //         Date.now() - query.state.dataUpdatedAt > 5 * 60 * 1000, // 5 minutes
  //     });
  //   }, 100);
  // }

  // Emergency cleanup when very deep
  // if (navigationDepth.current > 5) {
  //   // Pop back to reduce navigation depth
  //   setTimeout(() => {
  //     if (navigation.canGoBack()) {
  //       navigation.goBack();
  //     }
  //   }, 2000); // Wait 2 seconds then auto-pop
  // }
  // }, [isScreenFocused, navigation]);

  return {
    navigationDepth: navigationDepth.current,
  };
};
