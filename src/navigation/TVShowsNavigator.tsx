import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {TVShowsScreen} from '../screens/TVShows';
import {TVShowDetailsScreen} from '../screens/TVShowDetails';
import {CategoryScreen} from '../screens/Category';
import {GenreScreen} from '../screens/Genre';
import {PersonCreditsScreen} from '../screens/PersonCredits';
import {TVShowsStackParamList} from '../types/navigation';
import {colors} from '../theme';

const Stack = createNativeStackNavigator<TVShowsStackParamList>();

export const TVShowsNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: colors.background.primary,
        },
      }}>
      <Stack.Screen name="TVShowsScreen" component={TVShowsScreen} />
      <Stack.Screen name="TVShowDetails" component={TVShowDetailsScreen} />
      <Stack.Screen name="Category" component={CategoryScreen} />
      <Stack.Screen name="Genre" component={GenreScreen} />
      <Stack.Screen name="PersonCredits" component={PersonCreditsScreen} />
    </Stack.Navigator>
  );
};
