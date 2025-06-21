import {QueryClient} from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Ultra-aggressive cache management to prevent memory bloat
      staleTime: 1000 * 30, // 30 seconds - very short
      gcTime: 1000 * 60, // 1 minute - very aggressive
      // Reduce retries to prevent excessive API calls
      retry: 0, // No retries to prevent blocking
      retryDelay: 0,
      // Disable all refetching to prevent FPS drops
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      // Prevent too many concurrent queries
      networkMode: 'online',
    },
    mutations: {
      retry: 0,
      retryDelay: 0,
    },
  },
});

// Ultra-aggressive cache cleanup to prevent memory bloat
setInterval(() => {
  queryClient.removeQueries({
    predicate: query => {
      // Remove queries older than 2 minutes
      const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
      return (
        !query.state.dataUpdatedAt || query.state.dataUpdatedAt < twoMinutesAgo
      );
    },
  });
}, 30 * 1000); // Run every 30 seconds - very aggressive

// Emergency cleanup when too many queries
setInterval(() => {
  const allQueries = queryClient.getQueryCache().getAll();
  if (allQueries.length > 20) {
    console.warn('Too many queries - clearing cache');
    queryClient.clear();
  }
}, 10 * 1000); // Check every 10 seconds

// Limit concurrent queries
queryClient.setDefaultOptions({
  queries: {
    ...queryClient.getDefaultOptions().queries,
    // Cancel previous queries when new ones start
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  },
});
