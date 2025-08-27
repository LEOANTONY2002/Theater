import {useState, useCallback, useEffect} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';

export const useNavigationState = () => {
  const [isNavigating, setIsNavigating] = useState(false);
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  const [hasBeenFocused, setHasBeenFocused] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);
      setIsNavigating(false);

      // Mark that this screen has been focused at least once
      if (!hasBeenFocused) {
        setHasBeenFocused(true);
      }

      return () => {
        setIsScreenFocused(false);
        setIsNavigating(true);
      };
    }, [hasBeenFocused]),
  );

  const handleNavigation = useCallback((navigationFunction: () => void) => {
    setIsNavigating(true);
    // Small delay to ensure the navigation state is set before the actual navigation
    setTimeout(() => {
      navigationFunction();
    }, 10);
  }, []);

  // Function to enforce 2-screen limit
  const navigateWithLimit = useCallback(
    (routeName: string, params?: any) => {
      const state = navigation.getState();
      if (!state) return;

      const routes = state.routes;

      // Special handling for PersonCredits - always navigate normally
      if (routeName === 'PersonCredits') {
        navigation.navigate(routeName as any, params);
        return;
      }

      // Special handling for details screens - always navigate normally to preserve back navigation
      if (routeName === 'MovieDetails' || routeName === 'TVShowDetails') {
        navigation.navigate(routeName as any, params);
        return;
      }

      // If we already have 2 or more screens, use replace instead of navigate
      if (false) {
        (navigation as any).replace(routeName, params);
      } else {
        navigation.navigate(routeName as any, params);
      }
    },
    [navigation],
  );

  return {
    isNavigating,
    isScreenFocused,
    hasBeenFocused,
    handleNavigation,
    navigateWithLimit,
  };
};
