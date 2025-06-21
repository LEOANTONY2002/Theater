import {useCallback, useRef} from 'react';

export const useScrollOptimization = () => {
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isScrollingRef = useRef(false);

  // Simplified handlers to prevent FPS drops
  const handleScroll = useCallback(() => {
    // Do nothing - disable scroll handling to prevent FPS drops
  }, []);

  const handleScrollBeginDrag = useCallback(() => {
    // Do nothing - disable scroll handling to prevent FPS drops
  }, []);

  const handleScrollEndDrag = useCallback(() => {
    // Do nothing - disable scroll handling to prevent FPS drops
  }, []);

  const handleMomentumScrollEnd = useCallback(() => {
    // Do nothing - disable scroll handling to prevent FPS drops
  }, []);

  return {
    handleScroll,
    handleScrollBeginDrag,
    handleScrollEndDrag,
    handleMomentumScrollEnd,
  };
};
