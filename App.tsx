/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, {useEffect, useState} from 'react';
import {StatusBar} from 'react-native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {AppNavigator} from './src/navigation/AppNavigator';
import {LoadingScreen} from './src/components/LoadingScreen';
import {detectRegion} from './src/services/regionDetection';
import {getRegions} from './src/services/tmdb';
import {SettingsManager} from './src/store/settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60, // 1 hour
    },
  },
});

const App = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Detect and set region
        await detectRegion();
        await getRegions();
        const regions = await SettingsManager.getRegions();
        var region = await SettingsManager.getRegion();
        const regionData = regions.find((r: any) => r?.iso_3166_1 === region);
        await SettingsManager.setRegion(regionData);
        var region = await SettingsManager.getRegion();
        console.log('Region detected:', region);
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
