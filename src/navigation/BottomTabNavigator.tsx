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

const TabBarBackground = () => (
  <View style={styles.blurWrapper}>
    <BlurView
      style={styles.blurContainer}
      blurType="dark"
      blurAmount={15}
      overlayColor="rgba(16, 14, 35, 0.43)"
      reducedTransparencyFallbackColor="rgba(15, 13, 33, 0.87)"
    />
  </View>
);

export const BottomTabNavigator = () => {
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
