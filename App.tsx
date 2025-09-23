/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, {useEffect, useRef, useState} from 'react';
import {
  LogBox,
  StatusBar,
  AppState,
  DevSettings,
  StyleSheet,
} from 'react-native';
import {QueryClientProvider} from '@tanstack/react-query';
import {AppNavigator} from './src/navigation/AppNavigator';
import {queryClient} from './src/services/queryClient';
import {PosterCaptureHost} from './src/components/PosterCaptureHost';
import {enableScreens} from 'react-native-screens';
import {DNSInstructionsModal} from './src/components/DNSInstructionsModal';
import {checkInternet} from './src/services/connectivity';
import {NoInternet} from './src/screens/NoInternet';
import Onboarding from './src/screens/Onboarding';
import {OnboardingManager} from './src/store/onboarding';
import {offlineCache} from './src/services/offlineCache';
import {checkTMDB} from './src/services/tmdb';
import LinearGradient from 'react-native-linear-gradient';
import {colors} from './src/styles/theme';
import {BlurPreference} from './src/store/blurPreference';

export default function App() {
  const [themeReady, setThemeReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [hasCache, setHasCache] = useState(false);
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);
  const [showDNSModal, setShowDNSModal] = useState(false);
  const [retrying, setRetrying] = useState(false);

  // Ensure theme preference is loaded before first render
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await BlurPreference.init();
      } finally {
        if (mounted) setThemeReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  enableScreens();
  LogBox.ignoreAllLogs();

  const handleTryAgain = async () => {
    if (retrying) return;
    setRetrying(true);
    try {
      const ok = await checkInternet();
      setIsOnline(ok);
      if (ok) {
        DevSettings.reload();
      }
    } finally {
      setRetrying(false);
    }
  };

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Load onboarding state first
        const ob = await OnboardingManager.getState();
        setIsOnboarded(!!ob.isOnboarded);

        if (!ob.isOnboarded) {
          // Show onboarding immediately; no API calls needed
          setIsLoading(false);
          return;
        }

        // Only preload content after onboarding is complete
        const hasCacheData = await offlineCache.hasCachedContent();
        setHasCache(hasCacheData);

        // If already onboarded, then check connectivity
        const ok = await checkInternet();
        setIsOnline(ok);
        if (!ok && !hasCacheData) {
          setIsLoading(false);
          return;
        }

        setIsLoading(false);
      } catch (error) {
        setIsLoading(false);
      }
    };
    initializeApp();
  }, []);

  useEffect(() => {
    const check = async () => {
      const ok = await checkTMDB();
      if (!ok) setShowDNSModal(true);
    };
    check();
  }, []);

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: string) => {
      if (nextAppState === 'active') {
        const ok = await checkInternet();
        setIsOnline(ok);
      }
    };
    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
    return () => {
      subscription?.remove();
    };
  }, []);

  // Periodic connectivity check
  // useEffect(() => {
  //   const checkConnectivity = async () => {
  //     const ok = await checkInternet();
  //     setIsOnline(ok);
  //   };

  //   // Check connectivity every 10 seconds
  //   const interval = setInterval(checkConnectivity, 10000);

  //   return () => clearInterval(interval);
  // }, []);

  // if (isLoading) {
  //   return (
  //     <>
  //       <StatusBar barStyle="light-content" backgroundColor="#0A0A1A" />
  //       <LoadingScreen message="Personalizing your experience..." />
  //     </>
  //   );
  // }

  // Avoid flashing Home before theme/onboarding state is known
  if (!themeReady || isLoading || isOnboarded === null) {
    return (
      <>
        <StatusBar
          barStyle="dark-content"
          translucent
          backgroundColor="#000007"
        />
      </>
    );
  }

  // OnboardingManager.setIsOnboarded(false);

  // Show onboarding if required

  // Priority logic for modals:
  // 1. If no internet -> show NoInternet
  // 2. If internet but DNS blocked -> show DNS modal
  // 3. If both internet and DNS work -> show normal app

  // After onboarding is completed, if offline and no cache, show NoInternet (highest priority)
  if (!isOnline && !hasCache) {
    return (
      <QueryClientProvider client={queryClient}>
        <StatusBar barStyle="dark-content" backgroundColor="#000007" />
        <NoInternet onRetry={handleTryAgain} isRetrying={retrying} />
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar barStyle="dark-content" backgroundColor="#000007" />
      {!isOnboarded ? (
        <Onboarding onDone={() => setIsOnboarded(true)} />
      ) : (
        <>
          <AppNavigator />
          {/* <PerformanceMonitor screenName="AppRoot" /> */}
          {/* Centralized off-screen poster capture host */}
          <PosterCaptureHost />
          {(() => {
            // Make queryClient globally accessible for monitoring
            (global as any).queryClient = queryClient;
            return null;
          })()}
          {/* Show DNS modal only if internet is on but DNS is blocked */}
          <DNSInstructionsModal
            visible={showDNSModal && isOnline}
            onClose={() => setShowDNSModal(false)}
            onTryAgain={handleTryAgain}
          />
        </>
      )}
      {/* <LinearGradient
        colors={['transparent', colors.background.primary]}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 150,
          zIndex: 1,
        }}
      /> */}
    </QueryClientProvider>
  );
}
