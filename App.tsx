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
import Onboarding from './src/screens/Onboarding';
import {OnboardingManager} from './src/store/onboarding';
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
        // Initialize subscriptions respecting user preferences
        notificationService.initializeSubscriptions(region || undefined);
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

  // 1. Immediate Startup Checks (Internet & TMDB)
  // MUST RUN NO MATTER WHAT
  useEffect(() => {
    const runStartupChecks = async () => {
      console.log('[App] 🚀 Running Update Startup Checks...');

      // Check Internet
      let ok = await checkInternet();
      // Retry logic for cold starts
      if (!ok) {
        await new Promise(resolve => setTimeout(resolve, 500));
        ok = await checkInternet();
      }
      setIsOnline(ok);
      console.log('[App] 🌐 Internet Status:', ok);

      // Check TMDB Immediately - logic updated to run even if internet check is ambiguous
      // If internet is strictly down, TMDB will fail too, which is fine
      console.log('[App] 🎬 Checking TMDB availability...');
      const tmdbOk = await checkTMDB();
      console.log('[App] 🎬 TMDB Status:', tmdbOk);

      // If TMDB fails, ALWAYS show DNS modal as requested
      if (!tmdbOk) {
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
        const ok = await checkInternet();
        setIsOnline(ok);

        // Check DNS when app becomes active again
        const tmdbOk = await checkTMDB();
        if (!tmdbOk) setShowDNSModal(true);
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
