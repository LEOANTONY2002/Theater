import {useQuery} from '@tanstack/react-query';
import {useAIEnabled} from './useAIEnabled';
import {ThematicTagsManager} from '../store/thematicTags';
import {useIsFocused} from '@react-navigation/native';

/**
 * Hook to get top thematic tags from storage
 * Tags are generated incrementally on details screens
 */
export function useThematicGenres(limit: number = 10) {
  const {isAIEnabled} = useAIEnabled();
  const isFocused = useIsFocused();

  return useQuery({
    queryKey: ['thematic_genres', limit],
    queryFn: async () => {
      if (!isAIEnabled) {
        return null;
      }

      // Get top thematic tags from storage (instant, no AI call)
      const tags = await ThematicTagsManager.getTopTags(limit, 'thematic');

      if (tags.length === 0) {
        return null;
      }

      return {
        thematicTags: tags.map(t => ({
          tag: t.tag,
          description: t.description,
          confidence: t.confidence,
          poster_path: t.poster_path,
        })),
      };
    },
    staleTime: 0, // Always consider stale so it refetches on focus
    gcTime: 1000 * 60 * 60, // 1 hour
    enabled: !!isAIEnabled && isFocused,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook to get top emotional tags from storage
 */
export function useEmotionalTags(limit: number = 10) {
  const {isAIEnabled} = useAIEnabled();
  const isFocused = useIsFocused();

  return useQuery({
    queryKey: ['emotional_tags', limit],
    queryFn: async () => {
      if (!isAIEnabled) {
        return null;
      }

      // Get top emotional tags from storage
      const tags = await ThematicTagsManager.getTopTags(limit, 'emotional');

      if (tags.length === 0) {
        return null;
      }

      return {
        emotionalTags: tags.map(t => ({
          tag: t.tag,
          description: t.description,
          confidence: t.confidence,
          poster_path: t.poster_path,
        })),
      };
    },
    staleTime: 0, // Always consider stale so it refetches on focus
    gcTime: 1000 * 60 * 60, // 1 hour
    enabled: !!isAIEnabled && isFocused,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}
