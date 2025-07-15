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

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [showDNSModal, setShowDNSModal] = useState(false);
  enableScreens();
  LogBox.ignoreAllLogs();

  const handleTryAgain = () => {
    DevSettings.reload();
  };

  useEffect(() => {
    const initializeApp = async () => {
      try {
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
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        // App became active - no cache operations needed
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

  return (
    <>
      <QueryClientProvider client={queryClient}>
        <StatusBar barStyle="light-content" backgroundColor="#000007" />
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
