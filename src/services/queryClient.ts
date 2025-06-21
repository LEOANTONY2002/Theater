import {QueryClient} from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 15, // 15 minutes - longer cache
      gcTime: 1000 * 60 * 30, // 30 minutes - longer garbage collection
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true, // Allow reconnect refetching
      refetchInterval: false,
      refetchIntervalInBackground: false,
      networkMode: 'online',
    },
  },
});
