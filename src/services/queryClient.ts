import {QueryClient} from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Balanced caching for mobile performance
      staleTime: 1000 * 60 * 5, // 5 minutes - keep data fresh but not stale for too long
      gcTime: 1000 * 60 * 15, // 15 minutes - free up memory faster than 1 hour
      // Smart retry strategy
      retry: 2, // Allow 2 retries for failed requests
      retryDelay: 1000, // Standard retry delay
      // Smart refetching
      refetchOnWindowFocus: false, // Don't refetch on focus to save data/battery
      refetchOnReconnect: true, // Refetch on reconnect for fresh data
      refetchOnMount: false, // Don't refetch on mount if data is fresh
      // Performance optimizations
      networkMode: 'online',
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});
