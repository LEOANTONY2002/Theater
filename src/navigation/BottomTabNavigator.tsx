import React from 'react';
import {View, StyleSheet, Platform, Animated} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Feather';
import {TabParamList} from '../types/navigation';
import {
  HomeStackNavigator,
  SearchStackNavigator,
  MoviesStackNavigator,
  TVShowsStackNavigator,
  MySpaceStackNavigator,
} from './TabStacks';
import {colors, spacing, borderRadius, shadows} from '../styles/theme';

const Tab = createBottomTabNavigator<TabParamList>();

interface TabIconProps {
  focused: boolean;
  name: string;
  color: string;
}

// Custom tab icon with animation
const TabIcon = ({focused, name, color}: TabIconProps) => {
  return (
    <View style={styles.iconContainer}>
      <View
        style={[
          styles.iconWrapper,
          {
            opacity: focused ? 1 : 0.7,
          },
        ]}>
        <Icon name={name} size={20} color={color} />
      </View>
    </View>
  );
};

export const BottomTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.background.primary,
          borderTopWidth: 0,
          height: 70,
          position: 'absolute',
          bottom: 16,
          marginHorizontal: 24,
          borderRadius: borderRadius.round,
          ...shadows.large,
          ...(Platform.OS === 'ios'
            ? {
                shadowColor: colors.primary,
                shadowOffset: {width: 0, height: 0},
                shadowOpacity: 0.15,
                shadowRadius: 12,
              }
            : {
                elevation: 12,
              }),
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text.muted,
        headerShown: false,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '400',
          opacity: 0.5,
        },
        tabBarItemStyle: {
          paddingVertical: spacing.xs,
        },
      }}>
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{
          title: 'Home',
          tabBarIcon: ({focused, color}) => (
            <TabIcon focused={focused} name="home" color={color} />
          ),
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchStackNavigator}
        options={{
          tabBarIcon: ({focused, color}) => (
            <TabIcon focused={focused} name="search" color={color} />
          ),
          tabBarLabel: 'Search',
        }}
      />
      <Tab.Screen
        name="Movies"
        component={MoviesStackNavigator}
        options={{
          tabBarIcon: ({focused, color}) => (
            <TabIcon focused={focused} name="film" color={color} />
          ),
          tabBarLabel: 'Movies',
        }}
      />
      <Tab.Screen
        name="TVShows"
        component={TVShowsStackNavigator}
        options={{
          title: 'TV Shows',
          tabBarIcon: ({focused, color}) => (
            <TabIcon focused={focused} name="tv" color={color} />
          ),
          tabBarLabel: 'Shows',
        }}
      />
      <Tab.Screen
        name="MySpace"
        component={MySpaceStackNavigator}
        options={{
          title: 'Profile',
          tabBarIcon: ({focused, color}) => (
            <TabIcon focused={focused} name="user" color={color} />
          ),
          tabBarLabel: 'My space',
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xs,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 4,
  },
});
