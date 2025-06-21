import {useState, useCallback} from 'react';
import {useFocusEffect} from '@react-navigation/native';

export const useNavigationState = () => {
  const [isNavigating, setIsNavigating] = useState(false);
  const [isScreenFocused, setIsScreenFocused] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);
      setIsNavigating(false);

      return () => {
        setIsScreenFocused(false);
        setIsNavigating(true);
      };
    }, []),
  );

  const handleNavigation = useCallback((navigationFunction: () => void) => {
    setIsNavigating(true);
    // Small delay to ensure the navigation state is set before the actual navigation
    setTimeout(() => {
      navigationFunction();
    }, 10);
  }, []);

  return {
    isNavigating,
    isScreenFocused,
    handleNavigation,
  };
};
