import {useQuery} from '@tanstack/react-query';
import {getPersonalizedRecommendations} from '../services/gemini';
import {searchMovies, searchTVShows} from '../services/tmdb';
import {HistoryManager} from '../store/history';
import {useAIEnabled} from './useAIEnabled';
import {ContentItem} from '../components/MovieList';
import {AIPersonalizationCacheManager} from '../database/managers';

export const usePersonalizedRecommendations = () => {
  const {isAIEnabled} = useAIEnabled();

  return useQuery({
    queryKey: ['personalized_recommendations'],
    queryFn: async (): Promise<ContentItem[]> => {
      if (!isAIEnabled) {
        return [];
      }

      // Get user's watch history
      const history = await HistoryManager.getAll();

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

        if (!hasChanged) {
          console.log('[PersonalizedRecs] ✅ Using cached AI recommendations');
          return cache.aiRecommendations;
        }

        console.log('[PersonalizedRecs] 🔄 History changed, fetching new AI recommendations');
      } else {
        console.log('[PersonalizedRecs] 🆕 No cache, fetching AI recommendations');
      }

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
        console.log('[PersonalizedRecs] ✅ Cached new recommendations');
      }

      return filtered;
    },
    staleTime: 0, // Don't cache - Realm is the source of truth
    gcTime: 1000 * 60 * 5, // 5 min memory cache for active session
    enabled: !!isAIEnabled,
    retry: 2,
  });
};
