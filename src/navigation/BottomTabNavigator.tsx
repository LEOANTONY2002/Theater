import React from 'react';
import {View, StyleSheet, TouchableOpacity} from 'react-native';
import type {BottomTabBarButtonProps} from '@react-navigation/bottom-tabs';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useNavigationState, NavigationState} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import {TabParamList} from '../types/navigation';
import {
  HomeStackNavigator,
  SearchStackNavigator,
  MoviesStackNavigator,
  TVShowsStackNavigator,
  MySpaceStackNavigator,
} from './TabStacks';
import {colors, spacing, borderRadius} from '../styles/theme';
import {MaybeBlurView} from '../components/MaybeBlurView';
import {useResponsive} from '../hooks/useResponsive';

const Tab = createBottomTabNavigator<TabParamList>();

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  blurWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    // Height/marginBottom set in TabBarBackground for live updates
    borderRadius: borderRadius.round,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0)',
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

// Custom tab icon with animation
const TabIcon = ({
  focused,
  color,
  size,
  name,
}: {
  focused: boolean;
  color: string;
  size?: number;
  name: string;
}) => {
  return (
    <View style={styles.iconContainer}>
      <View
        style={[
          styles.iconWrapper,
          {
            opacity: focused ? 1 : 0.7,
          },
        ]}>
        <Icon
          name={name}
          size={size || 20}
          color={color}
          suppressHighlighting={true}
        />
      </View>
    </View>
  );
};

// Custom button to avoid native ripple/highlight artifacts on Android
const TabBarButton = ({
  onPress,
  onLongPress,
  accessibilityState,
  accessibilityRole,
  accessibilityLabel,
  testID,
  children,
  style,
}: BottomTabBarButtonProps) => {
  return (
    <TouchableOpacity
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      testID={testID}
      activeOpacity={0.7}
      onPress={onPress ?? undefined}
      onLongPress={onLongPress ?? undefined}
      style={style}>
      {children}
    </TouchableOpacity>
  );
};

// Smart TabBarBackground that manages BlurView during navigation transitions
const TabBarBackground = () => {
  const {isTablet} = useResponsive();

  return (
    <View
      style={[
        styles.blurWrapper,
        {
          height: isTablet ? 90 : 70,
          marginBottom: isTablet ? 15 : 10,
          borderWidth: 1,
          borderColor: colors.modal.blur,
        },
      ]}>
      <MaybeBlurView
        blurType="light"
        blurAmount={10}
        style={styles.blurContainer}
        overlayColor={colors.modal.blurDark}
        bottomBar
        gradientColors={['rgba(111, 111, 111, 0.42)', 'rgba(20, 20, 20, 0.5)']}
      />
    </View>
  );
};

export const BottomTabNavigator = () => {
  const navigationState = useNavigationState((state: NavigationState) => state);
  // Use inside so rotation triggers rerenders
  const {isTablet, orientation} = useResponsive();

  // Function to check if we're currently on OnlineAI screen
  const isOnOnlineAIScreen = (): boolean => {
    try {
      if (!navigationState) return false;
      const tabIndex = navigationState.index ?? 0;
      const currentTab = navigationState.routes?.[tabIndex];
      if (!currentTab || typeof currentTab !== 'object') return false;

      // MySpace tab is the 5th tab (index 4)
      const tabState = (currentTab as any).state;
      if (!tabState || tabState.index !== 4) return false;

      const mySpaceStack = tabState.routes?.[tabState.index];
      const mySpaceState = mySpaceStack?.state;
      if (!mySpaceState || typeof mySpaceState.index !== 'number') return false;

      const currentMySpaceRoute = mySpaceState.routes?.[mySpaceState.index];
      return currentMySpaceRoute?.name === 'OnlineAIScreen';
    } catch {
      return false;
    }
  };

  return (
    <View style={styles.container}>
      <Tab.Navigator
        screenOptions={{
          // Use a custom button to avoid Android ripple/highlight around icons
          tabBarButton: (props: BottomTabBarButtonProps) => (
            <TabBarButton {...props} />
          ),
          tabBarActiveBackgroundColor: 'transparent',
          tabBarInactiveBackgroundColor: 'transparent',
          tabBarStyle: {
            elevation: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            height: isTablet ? 90 : 70,
            position: 'absolute',
            bottom: isTablet ? 30 : 16,
            shadowOpacity: 0,
            marginHorizontal:
              isTablet && orientation === 'portrait'
                ? '18%'
                : isTablet && orientation === 'landscape'
                ? '27%'
                : !isTablet && orientation === 'landscape'
                ? '24%'
                : 24,
            borderRadius: borderRadius.round,
            alignItems: 'center',
            justifyContent:
              orientation === 'landscape' ? 'space-between' : 'center',
            display: isOnOnlineAIScreen() ? 'none' : 'flex',
          },
          // Keep label under icon even on tablets (avoids beside-icon layout)
          tabBarLabelPosition: 'below-icon',
          tabBarBackground: () => <TabBarBackground />,
          tabBarActiveTintColor: 'white',
          tabBarInactiveTintColor: colors.text.muted,
          headerShown: false,
          tabBarLabelStyle: {
            fontSize: isTablet ? 12 : 10,
            fontWeight: '400',
            opacity: isTablet ? 0.8 : 0.5,
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
            tabBarIcon: ({focused, color}: any) => (
              <TabIcon focused={focused} name="home" color={color} />
            ),
            tabBarLabel: 'Home',
          }}
        />
        <Tab.Screen
          name="Search"
          component={SearchStackNavigator}
          options={{
            tabBarIcon: ({focused, color}: any) => (
              <TabIcon focused={focused} name="search" color={color} />
            ),
            tabBarLabel: 'Explore',
          }}
        />
        <Tab.Screen
          name="Movies"
          component={MoviesStackNavigator}
          options={{
            tabBarIcon: ({focused, color}: any) => (
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
            tabBarIcon: ({focused, color}: any) => (
              <TabIcon focused={focused} name="monitor" color={color} />
            ),
            tabBarLabel: 'Shows',
          }}
        />
        <Tab.Screen
          name="MySpace"
          component={MySpaceStackNavigator}
          listeners={({navigation}: any) => ({
            tabPress: (e: any) => {
              // Reset the MySpace stack to initial screen when tab is pressed
              navigation.reset({
                index: 0,
                routes: [{name: 'MySpace'}],
              });
            },
          })}
          options={{
            title: 'Profile',
            tabBarIcon: ({focused, color}: any) => (
              <TabIcon focused={focused} name="user" color={color} />
            ),
            tabBarLabel: 'My space',
          }}
        />
      </Tab.Navigator>
    </View>
  );
};
