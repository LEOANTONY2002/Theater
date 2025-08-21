/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, {useEffect, useState} from 'react';
import {LogBox, StatusBar, AppState, DevSettings} from 'react-native';
import {QueryClientProvider} from '@tanstack/react-query';
import {AppNavigator} from './src/navigation/AppNavigator';
import {PerformanceMonitor} from './src/components/PerformanceMonitor';
import {detectRegion} from './src/services/regionDetection';
import {getRegions, checkTMDB} from './src/services/tmdb';
import {SettingsManager} from './src/store/settings';
import {queryClient} from './src/services/queryClient';
import {enableScreens} from 'react-native-screens';
import {DNSInstructionsModal} from './src/components/DNSInstructionsModal';
import {checkInternet} from './src/services/connectivity';
import {NoInternet} from './src/screens/NoInternet';
import Onboarding from './src/screens/Onboarding';
import {OnboardingManager} from './src/store/onboarding';

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);
  const [showDNSModal, setShowDNSModal] = useState(false);
  const [retrying, setRetrying] = useState(false);
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
          // Show onboarding immediately; defer connectivity/region until after onboarding
          setIsLoading(false);
          return;
        }
        // If already onboarded, then check connectivity
        // const ok = await checkInternet();
        // setIsOnline(ok);
        // if (!ok) {
        //   setIsLoading(false);
        //   return;
        // }
        // Detect and set region
        var region = await SettingsManager.getRegion();
        if (!region) {
          await detectRegion();
          await getRegions();
          const regions = await SettingsManager.getRegions();
          const regionData = regions.find((r: any) => r?.iso_3166_1 === region);
          await SettingsManager.setRegion(regionData);
          var region = await SettingsManager.getRegion();
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

  // if (isLoading) {
  //   return (
  //     <>
  //       <StatusBar barStyle="light-content" backgroundColor="#0A0A1A" />
  //       <LoadingScreen message="Personalizing your experience..." />
  //     </>
  //   );
  // }

  // Avoid flashing Home before onboarding state is known
  if (isLoading || isOnboarded === null) {
    return (
      <>
        <StatusBar barStyle="dark-content" backgroundColor="#000007" />
      </>
    );
  }

  // Show onboarding if required
  if (isOnboarded === false) {
    return (
      <>
        <StatusBar barStyle="dark-content" backgroundColor="#000007" />
        <Onboarding
          onDone={async () => {
            await OnboardingManager.setIsOnboarded(true);
            setIsOnboarded(true);
            // After onboarding completes, re-check connectivity so NoInternet can appear next if offline
            const ok = await checkInternet();
            setIsOnline(ok);
          }}
        />
      </>
    );
  }

  // After onboarding is completed, if offline, show NoInternet
  if (!isOnline) {
    return (
      <>
        <StatusBar barStyle="dark-content" backgroundColor="#000007" />
        <NoInternet onRetry={handleTryAgain} isRetrying={retrying} />
      </>
    );
  }

  return (
    <>
      <QueryClientProvider client={queryClient}>
        <StatusBar barStyle="dark-content" backgroundColor="#000007" />
        <AppNavigator />
        {/* <PerformanceMonitor screenName="AppRoot" /> */}
        {(() => {
          // Make queryClient globally accessible for monitoring
          (global as any).queryClient = queryClient;
          return null;
        })()}
      </QueryClientProvider>
      <DNSInstructionsModal
        visible={showDNSModal}
        onClose={() => setShowDNSModal(false)}
        onTryAgain={handleTryAgain}
      />
    </>
  );
};

export default App;
