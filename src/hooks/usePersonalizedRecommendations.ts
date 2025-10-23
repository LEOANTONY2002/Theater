import {useQuery} from '@tanstack/react-query';
import {getPersonalizedRecommendations} from '../services/gemini';
import {searchMovies, searchTVShows} from '../services/tmdb';
import {HistoryManager} from '../store/history';
import {useAIEnabled} from './useAIEnabled';
import {ContentItem} from '../components/MovieList';

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

      // Get AI recommendations
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
      return filtered;
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours - matches AI cache
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
    enabled: !!isAIEnabled,
    retry: 2,
  });
};
