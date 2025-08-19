import { useMemo } from 'react';
import { useWindowDimensions, Platform } from 'react-native';

export type Orientation = 'portrait' | 'landscape';

export interface ResponsiveInfo {
  isTablet: boolean;
  width: number;
  height: number;
  orientation: Orientation;
}

/**
 * Basic responsive detector for phone vs tablet.
 * - Uses smallest dimension >= 600dp as tablet heuristic
 * - Also respects Platform.isPad on iOS
 */
export function useResponsive(): ResponsiveInfo {
  // useWindowDimensions re-renders on orientation change
  const { width, height } = useWindowDimensions();
  return useMemo(() => {
    const minDim = Math.min(width, height);
    const isPad = (Platform as any).isPad === true;
    const isTablet = isPad || minDim >= 600;
    const orientation: Orientation = width >= height ? 'landscape' : 'portrait';

    return { isTablet, width, height, orientation };
  }, [width, height]);
}
