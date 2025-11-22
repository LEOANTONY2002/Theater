import {useQuery} from '@tanstack/react-query';
import {getPersonalizedRecommendations} from '../services/gemini';
import {searchMovies, searchTVShows} from '../services/tmdb';
import {HistoryManager} from '../store/history';
import {useAIEnabled} from './useAIEnabled';
import {ContentItem} from '../components/MovieList';
import {AIPersonalizationCacheManager} from '../database/managers';
import {useRef, useEffect} from 'react';
import {AppState} from 'react-native';

// Track if API was called in current app session
let apiCalledInSession = false;
// Track last app state
let lastAppState = AppState.currentState;

export const usePersonalizedRecommendations = () => {
  const {isAIEnabled} = useAIEnabled();
  const appStateRef = useRef(AppState.currentState);

  // Reset session flag when app goes to background and comes back
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      // App coming from background to foreground - reset session flag
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        apiCalledInSession = false;
      }
      appStateRef.current = nextAppState;
      lastAppState = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return useQuery({
    queryKey: ['personalized_recommendations'],
    queryFn: async (): Promise<ContentItem[]> => {
      if (!isAIEnabled) {
        return [];
      }

      // Get user's watch history
      const history = await HistoryManager.getAll();

      // If no history, return empty (but don't count as API called)
      if (history.length === 0) {
        return [];
      }

      // Prepare top 10 history for comparison
      const top10History = history.slice(0, 10).map(item => ({
        id: item.id,
        type: item.type,
        title: (item as any).title || (item as any).name || '',
      }));

      // Check cache first
      const cache = await AIPersonalizationCacheManager.get();

      if (cache) {
        // Compare history
        const hasChanged = AIPersonalizationCacheManager.hasHistoryChanged(
          top10History,
          cache.inputHistoryIds,
        );

        // If history hasn't changed, always use cache
        if (!hasChanged) {
          return cache.aiRecommendations;
        }

        // History changed - check if we should call API
        if (apiCalledInSession) {
          // Already called API in this session, use cache even if history changed

          return cache.aiRecommendations;
        }
      } else {
      }

      // Mark that we're calling the API in this session
      apiCalledInSession = true;

      // Get AI recommendations (fresh call)
      const recommendations = await getPersonalizedRecommendations(history);

      if (!recommendations || recommendations.length === 0) {
        return [];
      }

      // Search TMDB for each recommendation and get full data
      const promises = recommendations.map(async rec => {
        try {
          // Try with year first
          let results =
            rec.type === 'movie'
              ? await searchMovies(`${rec.title} ${rec.year}`)
              : await searchTVShows(`${rec.title} ${rec.year}`);

          // If no results, try without year
          if (!results.results || results.results.length === 0) {
            results =
              rec.type === 'movie'
                ? await searchMovies(rec.title)
                : await searchTVShows(rec.title);
          }

          if (results.results && results.results.length > 0) {
            const item: any = {
              ...results.results[0],
              type: rec.type,
            };
            return item;
          } else {
            return null;
          }
        } catch (error) {
          console.error(`Error searching for ${rec.title}:`, error);
          return null;
        }
      });

      const results = await Promise.all(promises);
      const filtered = results.filter(
        (item): item is ContentItem => item !== null,
      );

      // Cache the results in Realm
      if (filtered.length > 0) {
        await AIPersonalizationCacheManager.set(top10History, filtered);
      }

      return filtered;
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours - rely on cache invalidation logic
    gcTime: 1000 * 60 * 60 * 24, // 24 hours memory cache
    enabled: !!isAIEnabled,
    retry: 2,
  });
};
