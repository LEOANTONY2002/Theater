import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {SearchScreen} from '../screens/Search';
import {MovieDetailsScreen} from '../screens/MovieDetails';
import {TVShowDetailsScreen} from '../screens/TVShowDetails';
import {PersonCreditsScreen} from '../screens/PersonCredits';
import {SearchStackParamList} from '../types/navigation';
import {colors} from '../theme';

const Stack = createNativeStackNavigator<SearchStackParamList>();

export const SearchNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: colors.background.primary,
        },
      }}>
      <Stack.Screen name="SearchScreen" component={SearchScreen} />
      <Stack.Screen name="MovieDetails" component={MovieDetailsScreen} />
      <Stack.Screen name="TVShowDetails" component={TVShowDetailsScreen} />
      <Stack.Screen name="PersonCredits" component={PersonCreditsScreen} />
    </Stack.Navigator>
  );
};
