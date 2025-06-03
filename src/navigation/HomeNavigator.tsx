import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {HomeScreen} from '../screens/Home';
import {MovieDetailsScreen} from '../screens/MovieDetails';
import {TVShowDetailsScreen} from '../screens/TVShowDetails';
import {CategoryScreen} from '../screens/Category';
import {GenreScreen} from '../screens/Genre';
import {PersonCreditsScreen} from '../screens/PersonCredits';
import {HomeStackParamList} from '../types/navigation';
import {colors} from '../theme';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export const HomeNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: colors.background.primary,
        },
      }}>
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen name="MovieDetails" component={MovieDetailsScreen} />
      <Stack.Screen name="TVShowDetails" component={TVShowDetailsScreen} />
      <Stack.Screen name="Category" component={CategoryScreen} />
      <Stack.Screen name="Genre" component={GenreScreen} />
      <Stack.Screen name="PersonCredits" component={PersonCreditsScreen} />
    </Stack.Navigator>
  );
};
