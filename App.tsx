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
import {SafeAreaView} from 'react-native-safe-area-context';
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
import {notificationService} from './src/services/NotificationService';
import {BlurPreference} from './src/store/blurPreference';
import {initializeRealm} from './src/database/realm';
import {detectRegion} from './src/services/regionDetection';

export default function App() {
  const [themeReady, setThemeReady] = useState(false);
  const [dbReady, setDbReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [hasCache, setHasCache] = useState(false);
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);
  const [showDNSModal, setShowDNSModal] = useState(false);
  const [retrying, setRetrying] = useState(false);

  // Initialize Notifications
  useEffect(() => {
    notificationService.requestUserPermission();
    notificationService.onAppBootstrap();
    const unsubscribe = notificationService.listen();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Subscribe to Region Topic
  useEffect(() => {
    if (dbReady) {
      detectRegion().then(region => {
        if (region) {
          notificationService.subscribeToTopic(region);
        }
      });
    }
  }, [dbReady]);

  // Initialize Realm database first
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        console.log('[App] Initializing Realm database...');
        await initializeRealm();
        console.log('[App] ✅ Realm initialized');

        // Log database stats on startup
        const {getRealm} = require('./src/database/realm');
        const realm = getRealm();
        const movies = realm.objects('Movie');
        const searches = realm.objects('RecentSearch');
        const threads = realm.objects('ChatThread');
        const feedback = realm.objects('UserFeedback');

        console.log('[App] 📊 Database Stats on Startup:');
        console.log('  🎬 Movies:', movies.length);
        console.log('  🔍 Recent Searches:', searches.length);
        console.log('  💬 Chat Threads:', threads.length);
        console.log('  👍 User Feedback:', feedback.length);

        if (searches.length > 0) {
          console.log(
            '[App] Recent searches:',
            Array.from(searches).map((s: any) => s.query),
          );
        }
      } catch (error) {
        console.error('[App] ❌ Database initialization failed:', error);
      } finally {
        if (mounted) setDbReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Ensure theme preference is loaded before first render
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Wait for Realm to be ready
        if (!dbReady) {
          return;
        }
        await BlurPreference.init();
      } finally {
        if (mounted) setThemeReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [dbReady]); // Run when Realm is ready

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
        // Wait for Realm to be ready before checking onboarding
        if (!dbReady) {
          console.log('[App] Waiting for Realm to initialize...');
          return;
        }

        console.log('[App] Realm is ready, checking onboarding state...');
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
        let ok = await checkInternet();
        // Retry logic for cold starts (e.g. notification launch)
        if (!ok) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          ok = await checkInternet();
        }
        setIsOnline(ok);
        if (!ok && !hasCacheData) {
          setIsLoading(false);
          return;
        }

        // Check DNS if online and onboarded
        if (ok && isOnboarded) {
          const tmdbOk = await checkTMDB();
          if (!tmdbOk) {
            setShowDNSModal(true);
          }
        }

        setIsLoading(false);
      } catch (error) {
        setIsLoading(false);
      }
    };
    initializeApp();
  }, [dbReady]); // Run when Realm is ready

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: string) => {
      if (nextAppState === 'active') {
        const ok = await checkInternet();
        setIsOnline(ok);

        // Check DNS when app becomes active again
        if (ok && isOnboarded) {
          const tmdbOk = await checkTMDB();
          if (!tmdbOk) setShowDNSModal(true);
        }
      }
    };
    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
    return () => {
      subscription?.remove();
    };
  }, [isOnboarded]);

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
  if (!dbReady || !themeReady || isLoading || isOnboarded === null) {
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
      <SafeAreaView
        style={{flex: 1, backgroundColor: '#000007'}}
        edges={['bottom']}>
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
      </SafeAreaView>
    </QueryClientProvider>
  );
}
