/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, {useEffect, useState} from 'react';
import {LogBox, StatusBar} from 'react-native';
import {QueryClientProvider} from '@tanstack/react-query';
import {AppNavigator} from './src/navigation/AppNavigator';
import {LoadingScreen} from './src/components/LoadingScreen';
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
    </QueryClientProvider>
  );
};

export default App;
