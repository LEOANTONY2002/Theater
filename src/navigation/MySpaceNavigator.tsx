import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {MySpaceScreen} from '../screens/MySpace';
import {MovieDetailsScreen} from '../screens/MovieDetails';
import {TVShowDetailsScreen} from '../screens/TVShowDetails';
import {MyFiltersScreen} from '../screens/MyFilters';
import {SearchScreen} from '../screens/Search';
import {WatchlistsScreen} from '../screens/Watchlists';
import {MySpaceStackParamList} from '../types/navigation';
import {colors} from '../styles/theme';
import {OnlineAIScreen} from '../screens/OnlineAIScreen';

const Stack = createNativeStackNavigator<MySpaceStackParamList>();

export const MySpaceNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="MySpaceScreen"
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: colors.background.primary,
        },
        animation: 'slide_from_right',
      }}>
      <Stack.Screen
        name="WatchlistsScreen"
        component={WatchlistsScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="MySpaceScreen"
        component={MySpaceScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="MyFiltersScreen"
        component={MyFiltersScreen}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="MovieDetails"
        component={MovieDetailsScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="TVShowDetails"
        component={TVShowDetailsScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="SearchScreen"
        component={SearchScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="OnlineAIScreen"
        component={OnlineAIScreen}
        options={{
          headerShown: false,
          title: 'Ask AI',
        }}
      />
    </Stack.Navigator>
  );
};
