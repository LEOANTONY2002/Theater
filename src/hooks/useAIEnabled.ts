import {useQuery} from '@tanstack/react-query';
import {AISettingsManager} from '../store/aiSettings';

export const useAIEnabled = () => {
  const {data: aiSettings} = useQuery({
    queryKey: ['aiSettings'],
    queryFn: AISettingsManager.getSettings,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const isAIEnabled = aiSettings?.apiKey && aiSettings.apiKey.trim() !== '';

  return {
    isAIEnabled,
    aiSettings,
  };
};
