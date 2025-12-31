import React from 'react';
import {View, StyleSheet, TouchableOpacity} from 'react-native';
import type {BottomTabBarButtonProps} from '@react-navigation/bottom-tabs';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {
  useNavigationState,
  NavigationState,
  getFocusedRouteNameFromRoute,
  CommonActions,
} from '@react-navigation/native';
import {Home as HomeBold} from '@solar-icons/react-native/dist/icons/ui/Bold/Home.mjs';
import {Home as HomeLinear} from '@solar-icons/react-native/dist/icons/ui/Linear/Home.mjs';
import {Magnifer as MagniferBold} from '@solar-icons/react-native/dist/icons/search/Bold/Magnifer.mjs';
import {Magnifer as MagniferLinear} from '@solar-icons/react-native/dist/icons/search/Linear/Magnifer.mjs';
import {Layers as LayersBold} from '@solar-icons/react-native/dist/icons/tools/Bold/Layers.mjs';
import {Layers as LayersLinear} from '@solar-icons/react-native/dist/icons/tools/Linear/Layers.mjs';
import {User as UserBold} from '@solar-icons/react-native/dist/icons/users/Bold/User.mjs';
import {User as UserLinear} from '@solar-icons/react-native/dist/icons/users/Linear/User.mjs';
import {TabParamList} from '../types/navigation';
import {
  HomeStackNavigator,
  SearchStackNavigator,
  MoviesAndSeriesStackNavigator,
  CurationStackNavigator,
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
  ActiveIcon,
  InactiveIcon,
}: {
  focused: boolean;
  color: string;
  size?: number;
  ActiveIcon: any;
  InactiveIcon: any;
}) => {
  const Icon = focused ? ActiveIcon : InactiveIcon;
  return (
    <View style={styles.iconContainer}>
      <View
        style={[
          styles.iconWrapper,
          {
            opacity: focused ? 1 : 0.7,
          },
        ]}>
        <Icon size={size || 24} color={color} />
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

  return <MaybeBlurView bottomBar />;
};

export const BottomTabNavigator = () => {
  // Use inside so rotation triggers rerenders
  const {isTablet, orientation} = useResponsive();

  return (
    <View style={styles.container}>
      <Tab.Navigator
        detachInactiveScreens={true}
        screenOptions={{
          // Use a custom button to avoid Android ripple/highlight around icons
          tabBarButton: (props: BottomTabBarButtonProps) => (
            <TabBarButton {...props} />
          ),
          tabBarActiveBackgroundColor: 'transparent',
          tabBarInactiveBackgroundColor: 'transparent',
          tabBarStyle: {
            // elevation: 10,
            backgroundColor: 'transparent',
            height: isTablet ? 90 : 70,
            borderTopWidth: 0,
            paddingTop: isTablet ? spacing.md : spacing.sm,
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
          // listeners={({navigation}) => ({
          //   tabPress: e => {
          //     e.preventDefault();
          //     navigation.dispatch(
          //       CommonActions.navigate({
          //         name: 'HomeTab',
          //         params: {screen: 'HomeScreen'},
          //       }),
          //     );
          //   },
          // })}
          options={({route}: any) => {
            const routeName =
              getFocusedRouteNameFromRoute(route) ?? 'HomeScreen';
            const shouldHide =
              routeName === 'CinemaScreen' ||
              routeName === 'ThematicGenreResults';

            return {
              title: 'Home',
              tabBarIcon: ({focused, color}: any) => (
                <TabIcon
                  focused={focused}
                  color={color}
                  ActiveIcon={HomeBold}
                  InactiveIcon={HomeLinear}
                />
              ),
              tabBarLabel: 'Home',
              tabBarStyle: shouldHide
                ? {display: 'none'}
                : {
                    backgroundColor: 'transparent',
                    height: isTablet ? 90 : 70,
                    borderTopWidth: 0,
                    paddingTop: isTablet ? spacing.md : spacing.sm,
                    position: 'absolute',
                    bottom: isTablet ? 30 : 24,
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
                  },
            };
          }}
        />
        <Tab.Screen
          name="Search"
          component={SearchStackNavigator}
          // listeners={({navigation}) => ({
          //   tabPress: e => {
          //     e.preventDefault();
          //     navigation.dispatch(
          //       CommonActions.navigate({
          //         name: 'Search',
          //         params: {screen: 'SearchScreen'},
          //       }),
          //     );
          //   },
          // })}
          options={({route}: any) => {
            const routeName =
              getFocusedRouteNameFromRoute(route) ?? 'SearchScreen';
            const shouldHide = routeName === 'CinemaScreen';

            return {
              tabBarIcon: ({focused, color}: any) => (
                <TabIcon
                  focused={focused}
                  color={color}
                  ActiveIcon={MagniferBold}
                  InactiveIcon={MagniferLinear}
                />
              ),
              tabBarLabel: 'Explore',
              tabBarStyle: shouldHide
                ? {display: 'none'}
                : {
                    backgroundColor: 'transparent',
                    height: isTablet ? 90 : 70,
                    borderTopWidth: 0,
                    paddingTop: isTablet ? spacing.md : spacing.sm,
                    position: 'absolute',
                    bottom: isTablet ? 30 : 24,
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
                  },
            };
          }}
        />

        <Tab.Screen
          name="Curation"
          component={CurationStackNavigator}
          // listeners={({navigation}) => ({
          //   tabPress: e => {
          //     e.preventDefault();
          //     navigation.dispatch(
          //       CommonActions.navigate({
          //         name: 'Curation',
          //         params: {screen: 'CurationScreen'},
          //       }),
          //     );
          //   },
          // })}
          options={({route}: any) => {
            const routeName =
              getFocusedRouteNameFromRoute(route) ?? 'CurationScreen';
            const shouldHide = routeName === 'CinemaScreen';

            return {
              tabBarIcon: ({focused, color}: any) => (
                <TabIcon
                  focused={focused}
                  color={color}
                  ActiveIcon={LayersBold}
                  InactiveIcon={LayersLinear}
                />
              ),
              tabBarLabel: 'Curation',
              tabBarStyle: shouldHide
                ? {display: 'none'}
                : {
                    backgroundColor: 'transparent',
                    height: isTablet ? 90 : 70,
                    borderTopWidth: 0,
                    paddingTop: isTablet ? spacing.md : spacing.sm,
                    position: 'absolute',
                    bottom: isTablet ? 30 : 24,
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
                  },
            };
          }}
        />
        <Tab.Screen
          name="MySpace"
          component={MySpaceStackNavigator}
          // listeners={({navigation}) => ({
          //   tabPress: e => {
          //     e.preventDefault();
          //     navigation.dispatch(
          //       CommonActions.navigate({
          //         name: 'MySpace',
          //         params: {screen: 'MySpaceScreen'},
          //       }),
          //     );
          //   },
          // })}
          options={({route}: any) => {
            const routeName =
              getFocusedRouteNameFromRoute(route) ?? 'MySpaceScreen';
            const shouldHide =
              routeName === 'OnlineAIScreen' ||
              routeName === 'CinemaInsightsScreen' ||
              routeName === 'AboutLegalScreen' ||
              routeName === 'AISettingsScreen' ||
              routeName === 'WatchlistsScreen' ||
              routeName === 'MyFiltersScreen' ||
              routeName === 'NotificationSettings' ||
              routeName === 'CinemaScreen';

            return {
              title: 'Profile',
              tabBarIcon: ({focused, color}: any) => (
                <TabIcon
                  focused={focused}
                  color={color}
                  ActiveIcon={UserBold}
                  InactiveIcon={UserLinear}
                />
              ),
              tabBarLabel: 'My space',
              tabBarStyle: shouldHide
                ? {display: 'none'}
                : {
                    backgroundColor: 'transparent',
                    height: isTablet ? 90 : 70,
                    borderTopWidth: 0,
                    paddingTop: isTablet ? spacing.md : spacing.sm,
                    position: 'absolute',
                    bottom: isTablet ? 30 : 24,
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
                  },
            };
          }}
        />
      </Tab.Navigator>
    </View>
  );
};
