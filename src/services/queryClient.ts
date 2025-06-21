import {QueryClient} from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Better cache management for improved performance
      staleTime: 1000 * 60 * 5, // 5 minutes - reasonable cache time
      gcTime: 1000 * 60 * 10, // 10 minutes - keep in cache longer
      // Reduce retries to prevent excessive API calls
      retry: 1, // Allow 1 retry for failed requests
      retryDelay: 1000,
      // Smart refetching to balance freshness and performance
      refetchOnWindowFocus: false,
      refetchOnReconnect: true, // Refetch on reconnect for fresh data
      refetchOnMount: false, // Don't refetch on mount if data is fresh
      // Prevent too many concurrent queries
      networkMode: 'online',
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

// Moderate cache cleanup to prevent memory bloat
setInterval(() => {
  queryClient.removeQueries({
    predicate: query => {
      // Remove queries older than 15 minutes (increased from 2 minutes)
      const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
      return (
        !query.state.dataUpdatedAt ||
        query.state.dataUpdatedAt < fifteenMinutesAgo
      );
    },
  });
}, 5 * 60 * 1000); // Run every 5 minutes (increased from 30 seconds)

// Emergency cleanup when too many queries
setInterval(() => {
  const allQueries = queryClient.getQueryCache().getAll();
  if (allQueries.length > 50) {
    // Increased threshold from 20
    console.warn('Too many queries - clearing cache');
    queryClient.clear();
  }
}, 30 * 1000); // Check every 30 seconds (increased from 10 seconds)
