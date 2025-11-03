import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {MoviesScreen} from '../screens/Movies';
import {MovieDetailsScreen} from '../screens/MovieDetails';
import {CategoryScreen} from '../screens/CategoryScreen';
import {GenreScreen} from '../screens/Genre';
import {PersonCreditsScreen} from '../screens/PersonCredits';
import {EmotionalToneResultsScreen} from '../screens/EmotionalToneResults';
import {CinemaScreen} from '../screens/CinemaScreen';
import {MoviesStackParamList} from '../types/navigation';
import {colors} from '../styles/theme';

const Stack = createNativeStackNavigator<MoviesStackParamList>();

export const MoviesNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: colors.background.primary,
        },
      }}>
      <Stack.Screen name="MovieDetails" component={MovieDetailsScreen} />
      <Stack.Screen
        name="Category"
        component={CategoryScreen}
        options={({route}: any) => ({
          gestureEnabled: route?.params?.fromSearch ? false : true,
        })}
      />
      <Stack.Screen name="Genre" component={GenreScreen} />
      <Stack.Screen name="PersonCredits" component={PersonCreditsScreen} />
      <Stack.Screen
        name="EmotionalToneResults"
        component={EmotionalToneResultsScreen}
      />
      <Stack.Screen
        name="CinemaScreen"
        component={CinemaScreen}
        options={{
          orientation: 'landscape',
          animation: 'fade',
          presentation: 'fullScreenModal',
          contentStyle: {backgroundColor: '#000000'},
        }}
      />
    </Stack.Navigator>
  );
};
