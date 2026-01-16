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
import {
  watchTrackingService,
  PendingWatch,
} from './src/services/WatchTrackingService';
import {WatchPromptModal} from './src/components/WatchPromptModal';
import {DiaryModal} from './src/components/modals/DiaryModal';

export default function App() {
  const [themeReady, setThemeReady] = useState(false);
  const [dbReady, setDbReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const {isOnline, checkLikelyOnline} = useConnectivity();
  const [hasCache, setHasCache] = useState(false);
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);
  const [showDNSModal, setShowDNSModal] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [showWatchPrompt, setShowWatchPrompt] = useState(false);
  const [pendingWatch, setPendingWatch] = useState<PendingWatch | null>(null);

  // Diary Modal State
  const [showDiaryModal, setShowDiaryModal] = useState(false);
  const [diaryData, setDiaryData] = useState<{
    contentId: number;
    type: 'movie' | 'tv';
    title: string;
    posterPath?: string;
    initialProgress?: number;
    seasonData?: {season_number: number; episode_count: number}[];
  } | null>(null);

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

  const checkLocalCache = () => {
    try {
      if (!dbReady) return false;
      const {getRealm} = require('./src/database/realm');
      const realm = getRealm();
      // Check if we have any movies in the database
      const hasMovies = realm.objects('Movie').length > 0;
      return hasMovies;
    } catch (error) {
      console.warn('Cache check failed:', error);
      return false;
    }
  };

  const performConnectivityCheck = async () => {
    console.log('[App] 🚀 Performing Connectivity Check...');

    // 1. Check Cache
    const cacheExists = checkLocalCache();
    setHasCache(cacheExists);
    console.log('[App] 💾 Cache Status:', cacheExists);

    if (cacheExists) {
      console.log('[App] Cache present - skipping Internet/DNS checks');
      setShowDNSModal(false);
      return;
    }

    // 2. No Cache -> Check Internet
    const online = await checkLikelyOnline();
    console.log('[App] 🌐 Internet Status:', online);

    if (!online) {
      console.log('[App] No Internet - showing NoInternet screen (via state)');
      setShowDNSModal(false);
      return;
    }

    // 3. Internet YES -> Check DNS (TMDB)
    console.log('[App] 🎬 Checking TMDB availability...');
    const tmdbOk = await checkTMDB();
    console.log('[App] 🎬 TMDB Status:', tmdbOk);

    if (tmdbOk) {
      setShowDNSModal(false);
    } else {
      // Double check internet to be sure it's not a momentary drop
      const isStillOnline = await checkLikelyOnline();
      if (isStillOnline) {
        console.log('[App] Internet OK but TMDB blocked - showing DNS modal');
        setShowDNSModal(true);
      } else {
        setShowDNSModal(false);
      }
    }
  };

  const handleTryAgain = async () => {
    if (retrying) return;
    setRetrying(true);
    await performConnectivityCheck();
    setRetrying(false);
  };

  // Startup Check (Run when DB is ready)
  useEffect(() => {
    if (dbReady) {
      performConnectivityCheck();
    }
  }, [dbReady]);

  // Initialization (Onboarding & Loading)
  useEffect(() => {
    const initializeApp = async () => {
      try {
        if (!dbReady) return;

        const ob = await OnboardingManager.getState();
        setIsOnboarded(!!ob.isOnboarded);

        // If not onboarded, we stop loading but don't strictly require connectivity check yet
        // (Onboarding has its own requirements, typically needs internet)
        // But our main guard is below.

        setIsLoading(false);
      } catch (error) {
        console.error('Initialization error:', error);
        setIsLoading(false);
      }
    };
    initializeApp();
  }, [dbReady]);

  // AppState Listener (Focus)
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: string) => {
      if (nextAppState === 'active') {
        // Watch Prompt Check
        const watch = await watchTrackingService.shouldShowPrompt();
        if (watch) {
          setPendingWatch(watch);
          setShowWatchPrompt(true);
        }

        // Connectivity Check
        if (dbReady) {
          performConnectivityCheck();
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
  }, [dbReady]);

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

        {/* Watch Tracking Prompt */}
        <WatchPromptModal
          visible={showWatchPrompt}
          watch={pendingWatch}
          onWatched={async () => {
            setShowWatchPrompt(false);
            if (pendingWatch) {
              await watchTrackingService.markAsPrompted(pendingWatch.id);
              await watchTrackingService.clearPendingWatch();

              // Open Diary Modal
              setDiaryData({
                contentId: pendingWatch.id,
                type: pendingWatch.type,
                title: pendingWatch.title,
                posterPath: pendingWatch.posterPath,
                seasonData: pendingWatch.seasonData,
              });
              setShowDiaryModal(true);
            }
          }}
          onPartial={async () => {
            setShowWatchPrompt(false);
            if (pendingWatch) {
              await watchTrackingService.markAsPrompted(pendingWatch.id);
              await watchTrackingService.clearPendingWatch();

              // Open Diary Modal (user can select partial status there if supported, or just log entry)
              setDiaryData({
                contentId: pendingWatch.id,
                type: pendingWatch.type,
                title: pendingWatch.title,
                posterPath: pendingWatch.posterPath,
                initialProgress: 0, // Default to 0/Watching for partial
                seasonData: pendingWatch.seasonData,
              });
              setShowDiaryModal(true);
            }
          }}
          onDismiss={async () => {
            setShowWatchPrompt(false);
            if (pendingWatch) {
              await watchTrackingService.markAsPrompted(pendingWatch.id);
              await watchTrackingService.clearPendingWatch();
            }
          }}
        />

        {/* Diary Modal for Watch Tracking */}
        {diaryData && (
          <DiaryModal
            visible={showDiaryModal}
            onClose={() => setShowDiaryModal(false)}
            contentId={diaryData.contentId}
            type={diaryData.type}
            title={diaryData.title}
            posterPath={diaryData.posterPath}
            initialProgress={diaryData.initialProgress}
            seasonData={diaryData.seasonData}
            // backdropPath, totalSeasons, etc. not available here but can be fetched by modal if needed
          />
        )}
      </SafeAreaView>
    </QueryClientProvider>
  );
}
