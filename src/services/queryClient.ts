import {QueryClient} from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Netflix-style aggressive caching for smooth performance
      staleTime: 1000 * 60 * 30, // 30 minutes - keep data fresh longer
      gcTime: 1000 * 60 * 60, // 1 hour - keep in cache much longer
      // Smart retry strategy
      retry: 2, // Allow 2 retries for failed requests
      retryDelay: 500, // Faster retry
      // Netflix-style smart refetching
      refetchOnWindowFocus: false, // Don't refetch on focus
      refetchOnReconnect: true, // Refetch on reconnect for fresh data
      refetchOnMount: false, // Don't refetch on mount if data is fresh
      // Performance optimizations
      networkMode: 'online',
      // Netflix-style background updates
      refetchInterval: false, // No automatic refetching
      refetchIntervalInBackground: false,
    },
    mutations: {
      retry: 1,
      retryDelay: 500,
    },
  },
});

// Netflix-style aggressive cache management
setInterval(() => {
  queryClient.removeQueries({
    predicate: query => {
      // Remove queries older than 2 hours (increased from 15 minutes)
      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
      return (
        !query.state.dataUpdatedAt || query.state.dataUpdatedAt < twoHoursAgo
      );
    },
  });
}, 10 * 60 * 1000); // Run every 10 minutes (increased from 5 minutes)

// Netflix-style emergency cleanup
setInterval(() => {
  const allQueries = queryClient.getQueryCache().getAll();
  if (allQueries.length > 100) {
    // Increased threshold from 50
    console.warn('Too many queries - clearing cache');
    queryClient.clear();
  }
}, 60 * 1000); // Check every minute (increased from 30 seconds)

// Netflix-style prefetching for better UX
export const prefetchNextPage = (
  queryKey: any[],
  hasNextPage: boolean,
  fetchNextPage: () => void,
) => {
  if (hasNextPage) {
    // Prefetch next page in background
    setTimeout(() => {
      queryClient.prefetchInfiniteQuery({
        queryKey,
        queryFn: fetchNextPage,
      });
    }, 1000);
  }
};
