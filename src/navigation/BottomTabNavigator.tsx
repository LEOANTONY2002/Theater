import React, {useState, useEffect} from 'react';
import {View, StyleSheet, Platform, Animated} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useNavigation, useNavigationState} from '@react-navigation/native';
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
import {BlurView} from '@react-native-community/blur';

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

// Smart TabBarBackground that manages BlurView during navigation transitions
const TabBarBackground = () => {
  return (
    <View style={styles.blurWrapper}>
      <BlurView
        style={styles.blurContainer}
        blurType="dark"
        blurAmount={10}
        blurRadius={7}
        overlayColor={colors.modal.blur}
      />
    </View>
  );
};

export const BottomTabNavigator = () => {
  const navigationState = useNavigationState(state => state);

  // Function to check if we're currently on OnlineAI screen
  const isOnOnlineAIScreen = () => {
    if (!navigationState) return false;

    // Get the current route
    const currentRoute = navigationState.routes[navigationState.index];

    // Check if we're in MySpace tab and on OnlineAI screen
    if (currentRoute?.state && currentRoute?.state?.index === 4) {
      const mySpaceState =
        currentRoute?.state?.routes[currentRoute?.state?.index];
      const currentMySpaceRoute =
        mySpaceState?.state?.routes[mySpaceState?.state?.index];
      return currentMySpaceRoute?.name === 'OnlineAIScreen';
    }

    return false;
  };

  return (
    <View style={styles.container}>
      <Tab.Navigator
        screenOptions={{
          tabBarStyle: {
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            height: 70,
            position: 'absolute',
            bottom: 16,
            marginHorizontal: 24,
            borderRadius: borderRadius.round,
            alignItems: 'center',
            justifyContent: 'center',
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
            display: isOnOnlineAIScreen() ? 'none' : 'flex',
          },
          tabBarBackground: () => <TabBarBackground />,
          tabBarActiveTintColor: 'white',
          tabBarInactiveTintColor: colors.text.muted,
          headerShown: false,
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '400',
            opacity: 0.5,
          },
          tabBarHideOnKeyboard: true,
          tabBarShowLabel: true,
          tabBarVisibilityAnimationConfig: {
            show: {
              animation: 'timing',
              config: {
                duration: 200,
              },
            },
            hide: {
              animation: 'timing',
              config: {
                duration: 200,
              },
            },
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  blurWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    // marginHorizontal: 24,
    marginBottom: 10,
    borderRadius: borderRadius.round,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.11)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  blurContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xs,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
