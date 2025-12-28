import {useQuery} from '@tanstack/react-query';
import {getContentAnalysis} from '../services/gemini';
import {useAIEnabled} from './useAIEnabled';

export const useContentAnalysis = ({
  title,
  year,
  overview,
  genres,
  type,
  contentId,
  enabled = true,
}: {
  title: string;
  year?: string;
  overview: string;
  genres: string;
  type: 'movie' | 'tv';
  contentId?: number;
  enabled?: boolean;
}) => {
  const {isAIEnabled} = useAIEnabled();

  // We use stable parsing for genres if it's an array
  const genresStr = Array.isArray(genres)
    ? genres.join(', ')
    : typeof genres === 'string'
    ? genres
    : '';

  return useQuery({
    queryKey: ['contentAnalysis', contentId, type],
    queryFn: async () => {
      // If AI disabled, we still might want to return cached data if it exists?
      // But the service handles cache checking first thing.
      // So we can call it even if "AI Disabled" technically, but we should respect the flag for the *network* call.
      // The service doesn't check isAIEnabled flag internally for network calls.

      if (!isAIEnabled) {
        // Check cache manually or just return null?
        // For now return null to respect the flag strictly
        return null;
      }

      return await getContentAnalysis({
        title,
        year,
        overview,
        genres: genresStr,
        type,
        contentId,
        skipImdb: false, // Use AI as backup/parallel source
      });
    },
    enabled: enabled && !!title && !!overview && !!contentId,
    staleTime: 1000 * 60 * 60 * 24, // Keep strictly fresh for 24h
    gcTime: 1000 * 60 * 60 * 24,
    retry: 2, // Retry failed requests twice
    retryDelay: 1000,
  });
};
