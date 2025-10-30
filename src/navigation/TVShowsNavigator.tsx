import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {TVShowsScreen} from '../screens/TVShows';
import {TVShowDetailsScreen} from '../screens/TVShowDetails';
import {CategoryScreen} from '../screens/CategoryScreen';
import {GenreScreen} from '../screens/Genre';
import {PersonCreditsScreen} from '../screens/PersonCredits';
import {EmotionalToneResultsScreen} from '../screens/EmotionalToneResults';
import {TVShowsStackParamList} from '../types/navigation';
import {colors} from '../styles/theme';

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
      <Stack.Screen
        name="Category"
        component={CategoryScreen}
        options={({route}: any) => ({
          gestureEnabled: route?.params?.fromSearch ? false : true,
        })}
      />
      <Stack.Screen name="Genre" component={GenreScreen} />
      <Stack.Screen name="PersonCredits" component={PersonCreditsScreen} />
      <Stack.Screen name="EmotionalToneResults" component={EmotionalToneResultsScreen} />
    </Stack.Navigator>
  );
};
