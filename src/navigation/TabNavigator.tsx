import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {HomeNavigator} from './HomeNavigator';
import {SearchNavigator} from './SearchNavigator';
import {MoviesNavigator} from './MoviesNavigator';
import {TVShowsNavigator} from './TVShowsNavigator';
import {MySpaceNavigator} from './MySpaceNavigator';
import {TabParamList} from '../types/navigation';
import {colors} from '../styles/theme';
import Ionicons from 'react-native-vector-icons/Ionicons';

const Tab = createBottomTabNavigator<TabParamList>();

export const TabNavigator = () => {
  return (
    <Tab.Navigator
      initialRouteName="MySpace"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background.secondary,
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text.secondary,
      }}>
      <Tab.Screen
        name="HomeTab"
        component={HomeNavigator}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({color, size}) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchNavigator}
        options={{
          tabBarLabel: 'Search',
          tabBarIcon: ({color, size}) => (
            <Ionicons name="search-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Movies"
        component={MoviesNavigator}
        options={{
          tabBarLabel: 'Movies',
          tabBarIcon: ({color, size}) => (
            <Ionicons name="film-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="TVShows"
        component={TVShowsNavigator}
        options={{
          tabBarLabel: 'TV Shows',
          tabBarIcon: ({color, size}) => (
            <Ionicons name="tv-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="MySpace"
        component={MySpaceNavigator}
        options={{
          tabBarLabel: 'My Space',
          tabBarIcon: ({color, size}) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};
