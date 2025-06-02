import {useQuery} from '@tanstack/react-query';
import {SettingsManager} from '../store/settings';

export const useRegion = () => {
  return useQuery({
    queryKey: ['region'],
    queryFn: () => SettingsManager.getRegion(),
  });
};
