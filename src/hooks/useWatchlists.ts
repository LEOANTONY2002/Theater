import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {watchlistManager, Watchlist, WatchlistItem} from '../store/watchlists';
import {Movie} from '../types/movie';
import {TVShow} from '../types/tvshow';

export const useWatchlists = () => {
  return useQuery({
    queryKey: ['watchlists'],
    queryFn: () => watchlistManager.getWatchlists(),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
};

export const useWatchlistItems = (watchlistId: string) => {
  return useQuery({
    queryKey: ['watchlist', watchlistId],
    queryFn: () => watchlistManager.getWatchlistItems(watchlistId),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
};

export const useCreateWatchlist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => watchlistManager.createWatchlist(name),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['watchlists']});
    },
  });
};

export const useUpdateWatchlist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({id, name}: {id: string; name: string}) =>
      watchlistManager.updateWatchlist(id, name),
    onSuccess: (_, {id}) => {
      queryClient.invalidateQueries({queryKey: ['watchlists']});
      queryClient.invalidateQueries({queryKey: ['watchlist', id]});
    },
  });
};

export const useDeleteWatchlist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await watchlistManager.deleteWatchlist(id);
      return result;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({queryKey: ['watchlists']});
      queryClient.invalidateQueries({queryKey: ['watchlist', id]});
    },
    onError: (error, id) => {
      console.error('useDeleteWatchlist onError called for id:', id, error);
    },
  });
};

export const useAddToWatchlist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      watchlistId,
      item,
      itemType,
    }: {
      watchlistId: string;
      item: Movie | TVShow;
      itemType: 'movie' | 'tv';
    }) => watchlistManager.addItemToWatchlist(watchlistId, item, itemType),
    onSuccess: (_, {watchlistId, item}) => {
      queryClient.invalidateQueries({queryKey: ['watchlists']});
      queryClient.invalidateQueries({queryKey: ['watchlist', watchlistId]});
      queryClient.invalidateQueries({
        queryKey: ['isItemInAnyWatchlist', item.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['watchlistContainingItem', item.id],
      });
    },
  });
};

export const useRemoveFromWatchlist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      watchlistId,
      itemId,
    }: {
      watchlistId: string;
      itemId: number;
    }) => watchlistManager.removeItemFromWatchlist(watchlistId, itemId),
    onSuccess: (_, {watchlistId, itemId}) => {
      queryClient.invalidateQueries({queryKey: ['watchlists']});
      queryClient.invalidateQueries({queryKey: ['watchlist', watchlistId]});
      queryClient.invalidateQueries({
        queryKey: ['isItemInAnyWatchlist', itemId],
      });
      queryClient.invalidateQueries({
        queryKey: ['watchlistContainingItem', itemId],
      });
    },
  });
};

export const useIsItemInWatchlist = (watchlistId: string, itemId: number) => {
  return useQuery({
    queryKey: ['isItemInWatchlist', watchlistId, itemId],
    queryFn: () => watchlistManager.isItemInWatchlist(watchlistId, itemId),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

export const useIsItemInAnyWatchlist = (itemId: number) => {
  return useQuery({
    queryKey: ['isItemInAnyWatchlist', itemId],
    queryFn: () => watchlistManager.isItemInAnyWatchlist(itemId),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

export const useWatchlistContainingItem = (itemId: number) => {
  return useQuery({
    queryKey: ['watchlistContainingItem', itemId],
    queryFn: () => watchlistManager.getWatchlistContainingItem(itemId),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};
