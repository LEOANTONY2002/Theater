/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, {useEffect, useState} from 'react';
import {LogBox, StatusBar, AppState, InteractionManager} from 'react-native';
import {QueryClientProvider} from '@tanstack/react-query';
import {AppNavigator} from './src/navigation/AppNavigator';
import {LoadingScreen} from './src/components/LoadingScreen';
import {PerformanceMonitor} from './src/components/PerformanceMonitor';
import {detectRegion} from './src/services/regionDetection';
import {getRegions} from './src/services/tmdb';
import {SettingsManager} from './src/store/settings';
import {queryClient} from './src/services/queryClient';

const App = () => {
  const [isLoading, setIsLoading] = useState(true);

  LogBox.ignoreAllLogs();

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
          console.log('Region detected:', region);
        }
        // Add a small delay to ensure smooth transition
        // await new Promise(resolve => setTimeout(resolve, 1000));

        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing app:', error);
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Memory cleanup effect to prevent glitches
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        console.log('App became active');
        // Don't clear cache immediately - let screens load naturally
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    // Less frequent cache cleanup every 10 minutes
    const interval = setInterval(() => {
      console.log('Periodic cache cleanup');
      // Only clear if cache is getting very large
      const cacheSize = queryClient.getQueryCache().getAll().length;
      if (cacheSize > 200) {
        console.log(`Clearing cache with ${cacheSize} queries`);
        queryClient.clear();
      }
    }, 10 * 60 * 1000);

    // Don't clear cache on mount - let data load naturally

    // Development: Monitor performance without aggressive clearing
    if (__DEV__) {
      const monitorInterval = setInterval(() => {
        const cacheSize = queryClient.getQueryCache().getAll().length;
        console.log(`Current cache size: ${cacheSize} queries`);

        // Only clear if cache is extremely large
        if (cacheSize > 300) {
          console.warn(
            `Cache size is very large: ${cacheSize} queries - clearing`,
          );
          queryClient.clear();
        }

        // Monitor memory usage
        if (global.performance && (global.performance as any).memory) {
          const memory = (global.performance as any).memory;
          const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
          const totalMB = Math.round(memory.totalJSHeapSize / 1024 / 1024);
          console.log(`Memory usage: ${usedMB}MB / ${totalMB}MB`);

          // Only clear if memory is extremely high
          if (usedMB > 200) {
            console.warn(
              `Very high memory usage: ${usedMB}MB / ${totalMB}MB - clearing cache`,
            );
            queryClient.clear();
          }
        }
      }, 30 * 1000); // Check every 30 seconds

      return () => {
        subscription?.remove();
        clearInterval(interval);
        clearInterval(monitorInterval);
      };
    }

    return () => {
      subscription?.remove();
      clearInterval(interval);
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
    <QueryClientProvider client={queryClient}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A1A" />
      <AppNavigator />
      <PerformanceMonitor />
      {(() => {
        // Make queryClient globally accessible for monitoring
        (global as any).queryClient = queryClient;
        return null;
      })()}
    </QueryClientProvider>
  );
};

export default App;
