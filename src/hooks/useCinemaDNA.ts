import {useQuery} from '@tanstack/react-query';
import {getCinemaDNA, CinemaDNA} from '../utils/cinemaDNA';
import {usePersonMovieCredits, usePersonTVCredits} from './usePersonCredits';

const CACHE_TIME = 1000 * 60 * 60; // 1 hour
const STALE_TIME = 1000 * 60 * 5; // 5 minutes

/**
 * Hook to get user's CinemaDNA (top director, actor, etc.)
 */
export const useCinemaDNA = () => {
  return useQuery<CinemaDNA | null>({
    queryKey: ['cinemaDNA'],
    queryFn: getCinemaDNA,
    gcTime: CACHE_TIME,
    staleTime: STALE_TIME,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
};

/**
 * Hook to get top director's content
 */
export const useTopDirectorContent = (enabled: boolean = true) => {
  const {data: cinemaDNA} = useCinemaDNA();
  
  const topDirector = cinemaDNA?.otherTop?.find(p => p.type === 'director');
  const directorId = topDirector?.id;

  const movieCredits = usePersonMovieCredits(directorId || 0);
  const tvCredits = usePersonTVCredits(directorId || 0);

  return {
    director: topDirector,
    movieCredits,
    tvCredits,
    isEnabled: enabled && !!directorId,
  };
};

/**
 * Hook to get top actor's content
 */
export const useTopActorContent = (enabled: boolean = true) => {
  const {data: cinemaDNA} = useCinemaDNA();
  
  const topActor = cinemaDNA?.otherTop?.find(p => p.type === 'actor');
  const actorId = topActor?.id;

  const movieCredits = usePersonMovieCredits(actorId || 0);
  const tvCredits = usePersonTVCredits(actorId || 0);

  return {
    actor: topActor,
    movieCredits,
    tvCredits,
    isEnabled: enabled && !!actorId,
  };
};
