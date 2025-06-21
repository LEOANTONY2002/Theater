import {QueryClient} from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutes - even shorter
      gcTime: 1 * 60 * 1000, // 1 minute - very aggressive
      retry: 1, // Reduce retries
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      // Prevent too many concurrent queries
      networkMode: 'online',
    },
    mutations: {
      retry: 1,
    },
  },
});

// Very aggressive cache cleanup to prevent memory bloat
setInterval(() => {
  // Remove queries older than 1 minute
  queryClient.removeQueries({
    predicate: query => {
      const isOld =
        !query.state.dataUpdatedAt ||
        Date.now() - query.state.dataUpdatedAt > 1 * 60 * 1000;
      return isOld;
    },
  });
}, 10000); // Every 10 seconds - very aggressive

// Emergency cleanup when too many queries
let queryCount = 0;
const originalFetchQuery = queryClient.fetchQuery.bind(queryClient);
queryClient.fetchQuery = (...args) => {
  queryCount++;
  if (queryCount > 15) {
    // Lower threshold
    // Emergency cleanup
    queryClient.removeQueries();
    queryCount = 0;
  }
  return originalFetchQuery(...args);
};

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
