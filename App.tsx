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
import {DNSSetupGuide} from './src/components/DNSSetupGuide';
import {checkInternet} from './src/services/connectivity';
import {NoInternet} from './src/screens/NoInternet';
import {useConnectivity} from './src/hooks/useConnectivity';
import Onboarding from './src/screens/Onboarding';
import {OnboardingManager} from './src/store/onboarding';
import {checkTMDB} from './src/services/tmdb';
import LinearGradient from 'react-native-linear-gradient';
import {colors} from './src/styles/theme';
import {notificationService} from './src/services/NotificationService';
import {BlurPreference} from './src/store/blurPreference';
import {initializeRealm} from './src/database/realm';
import {SettingsManager} from './src/store/settings';
import {useAppUpdate} from './src/hooks/useAppUpdate';

export default function App() {
  const [themeReady, setThemeReady] = useState(false);
  const [dbReady, setDbReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const {isOnline, checkLikelyOnline} = useConnectivity();
  const [hasCache, setHasCache] = useState(false);
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);
  const [showDNSModal, setShowDNSModal] = useState(false);
  const [retrying, setRetrying] = useState(false);

  // Check for In-App Updates (Android)
  useAppUpdate();

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
      SettingsManager.getRegion().then(settingsRegion => {
        const region = settingsRegion?.iso_3166_1;
        // Initialize subscriptions respecting user preferences
        notificationService.initializeSubscriptions(region);
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
    if (retrying) {
      return;
    }
    setRetrying(true);

    try {
      const ok = await checkLikelyOnline();

      if (!ok) {
        setShowDNSModal(false);
        return;
      }
      const tmdbOk = await checkTMDB();

      if (tmdbOk) {
        setShowDNSModal(false);
      } else {
        const isStillOnline = await checkLikelyOnline();

        if (!isStillOnline) {
          setShowDNSModal(false);
        } else {
          console.log(
            '[handleTryAgain] TMDB still blocked - staying on DNS screen',
          );
        }
      }
    } catch (error) {
      console.error('[handleTryAgain] Error:', error);
    } finally {
      console.log('[handleTryAgain] Done, setting retrying to false');
      setRetrying(false);
    }
  };

  useEffect(() => {
    const runStartupChecks = async () => {
      console.log('[App] 🚀 Running Update Startup Checks...');

      let ok = await checkLikelyOnline();
      if (!ok) {
        await new Promise(resolve => setTimeout(resolve, 500));
        ok = await checkLikelyOnline();
      }
      console.log('[App] 🌐 Internet Status:', ok);

      if (!ok) {
        console.log('[App] No internet - skipping TMDB check');
        setShowDNSModal(false); // Clear DNS modal if internet is off
        return;
      }
      console.log('[App] 🎬 Checking TMDB availability...');
      const tmdbOk = await checkTMDB();
      console.log('[App] 🎬 TMDB Status:', tmdbOk);

      if (!tmdbOk) {
        console.log('[App] TMDB failed - double-checking internet...');
        const isStillOnline = await checkLikelyOnline();

        if (!isStillOnline) {
          console.log('[App] Internet lost - not showing DNS modal');
          setShowDNSModal(false); // Clear DNS modal if internet is lost
          return;
        }

        console.log('[App] Internet OK but TMDB blocked - showing DNS modal');
        setShowDNSModal(true);
      }
    };

    runStartupChecks();
  }, []);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Wait for Realm to be ready
        if (!dbReady) {
          return;
        }

        // Load onboarding state
        const ob = await OnboardingManager.getState();
        setIsOnboarded(!!ob.isOnboarded);

        if (!ob.isOnboarded) {
          setIsLoading(false);
          return;
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Initialization error:', error);
        setIsLoading(false);
      }
    };
    initializeApp();
  }, [dbReady]);

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: string) => {
      if (nextAppState === 'active') {
        // Check internet first
        const ok = await checkLikelyOnline();

        // Only check TMDB if internet is OK
        if (ok) {
          const tmdbOk = await checkTMDB();
          if (!tmdbOk) {
            // Double-check internet to be sure
            const isStillOnline = await checkLikelyOnline();
            if (isStillOnline) {
              // Internet OK but TMDB blocked - DNS issue
              setShowDNSModal(true);
            } else {
              // Internet lost
              setShowDNSModal(false); // Clear DNS modal if internet is lost
            }
          }
        } else {
          // No internet - clear DNS modal
          setShowDNSModal(false);
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
  }, []);

  // Avoid flashing Home before theme/onboarding state is known
  // BUT Render DNS Modal if needed
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

  // After onboarding is completed, if offline and no cache, show NoInternet (highest priority)
  if (!isOnline && !hasCache && isOnboarded && !showDNSModal) {
    return (
      <QueryClientProvider client={queryClient}>
        <StatusBar barStyle="dark-content" backgroundColor="#000007" />
        <NoInternet onRetry={handleTryAgain} isRetrying={retrying} />
      </QueryClientProvider>
    );
  }

  // If DNS is blocked, show DNS Instructions Modal as a separate full screen
  if (showDNSModal) {
    return (
      <QueryClientProvider client={queryClient}>
        <StatusBar barStyle="dark-content" backgroundColor="#000007" />
        <DNSSetupGuide
          visible={true}
          onTryAgain={handleTryAgain}
          isRetrying={retrying}
        />
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
            <PosterCaptureHost />
            {(() => {
              (global as any).queryClient = queryClient;
              return null;
            })()}
          </>
        )}
      </SafeAreaView>
    </QueryClientProvider>
  );
}
