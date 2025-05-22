/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, {useState, useEffect} from 'react';
import {StatusBar} from 'react-native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {AppNavigator} from './src/navigation/AppNavigator';
import {LoadingScreen} from './src/components/LoadingScreen';

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
    // Simulate a delay to load resources
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor="#0A0A1A" />
        <LoadingScreen message="Getting things ready..." />
      </>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A1A" />
      <AppNavigator />
    </QueryClientProvider>
  );
};

export default App;
