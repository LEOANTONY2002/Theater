import React, {useEffect} from 'react';
import {NavigationContainer, DarkTheme} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {BottomTabNavigator} from './BottomTabNavigator';
import {RootStackParamList} from '../types/navigation';
import {queryClient} from '../services/queryClient';
import {colors} from '../styles/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
  useEffect(() => {
    // Monitor navigation state changes
    const unsubscribe = (global as any).__navigationRef?.addListener?.(
      'state',
      (e: any) => {
        console.log('Navigation state changed:', e.data.state?.routes?.length);

        // If we have too many routes in the stack, clear cache to prevent glitches
        if (e.data.state?.routes?.length > 10) {
          console.warn('Too many navigation routes - clearing cache');
          queryClient.clear();
        }
      },
    );

    return unsubscribe;
  }, []);

  return (
    <NavigationContainer
      theme={{
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          background: colors.background.primary,
          card: colors.background.primary,
        },
      }}
      ref={ref => {
        (global as any).__navigationRef = ref;
      }}>
      <Stack.Navigator
        screenOptions={{
          contentStyle: {backgroundColor: colors.background.primary},
        }}>
        <Stack.Screen
          name="Main"
          component={BottomTabNavigator}
          options={{headerShown: false}}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
