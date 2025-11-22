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
import Icon from 'react-native-vector-icons/Feather';
import Ionicon from 'react-native-vector-icons/Ionicons';
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
  name,
  type,
}: {
  focused: boolean;
  color: string;
  size?: number;
  name: string;
  type: string;
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
        {type === 'ion' ? (
          <Ionicon
            name={name}
            size={size || 20}
            color={color}
            suppressHighlighting={true}
          />
        ) : (
          <Icon
            name={name}
            size={size || 20}
            color={color}
            suppressHighlighting={true}
          />
        )}
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
          listeners={({navigation}) => ({
            tabPress: e => {
              // prevent the default behavior (which would activate the tab first)
              e.preventDefault();

              // Navigate to the tab and explicitly target its initial screen.
              // This causes the nested navigator to be at the root BEFORE the tab is shown.
              navigation.dispatch(
                CommonActions.navigate({
                  name: 'HomeTab',
                  params: {screen: 'HomeScreen'}, // initial screen name in HomeStackNavigator
                }),
              );
            },
          })}
          options={{
            title: 'Home',
            tabBarIcon: ({focused, color}: any) => (
              <TabIcon
                focused={focused}
                name="home"
                color={color}
                type="feather"
              />
            ),
            tabBarLabel: 'Home',
          }}
        />
        <Tab.Screen
          name="Search"
          component={SearchStackNavigator}
          listeners={({navigation}) => ({
            tabPress: e => {
              // prevent the default behavior (which would activate the tab first)
              e.preventDefault();

              // Navigate to the tab and explicitly target its initial screen.
              // This causes the nested navigator to be at the root BEFORE the tab is shown.
              navigation.dispatch(
                CommonActions.navigate({
                  name: 'Search',
                  params: {screen: 'SearchScreen'}, // initial screen name in SearchStackNavigator
                }),
              );
            },
          })}
          options={{
            tabBarIcon: ({focused, color}: any) => (
              <TabIcon
                focused={focused}
                name="search"
                color={color}
                type="feather"
              />
            ),
            tabBarLabel: 'Explore',
          }}
        />
        <Tab.Screen
          name="MoviesAndSeries"
          component={MoviesAndSeriesStackNavigator}
          listeners={({navigation}) => ({
            tabPress: e => {
              // prevent the default behavior (which would activate the tab first)
              e.preventDefault();
              // Navigate to the tab and explicitly target its initial screen.
              // This causes the nested navigator to be at the root BEFORE the tab is shown.
              navigation.dispatch(
                CommonActions.navigate({
                  name: 'MoviesAndSeries',
                  params: {screen: 'MoviesAndSeriesScreen'}, // initial screen name in MoviesAndSeriesStackNavigator
                }),
              );
            },
          })}
          options={{
            tabBarIcon: ({focused, color}: any) => (
              <TabIcon
                focused={focused}
                name="film"
                color={color}
                type="feather"
              />
            ),
            tabBarLabel: 'Browse',
          }}
        />
        <Tab.Screen
          name="Curation"
          component={CurationStackNavigator}
          listeners={({navigation}) => ({
            tabPress: e => {
              // prevent the default behavior (which would activate the tab first)
              e.preventDefault();
              // Navigate to the tab and explicitly target its initial screen.
              // This causes the nested navigator to be at the root BEFORE the tab is shown.
              navigation.dispatch(
                CommonActions.navigate({
                  name: 'Curation',
                  params: {screen: 'CurationScreen'}, // initial screen name in FiltersStackNavigator
                }),
              );
            },
          })}
          options={{
            tabBarIcon: ({focused, color}: any) => (
              <TabIcon
                focused={focused}
                name="layers"
                color={color}
                type="feather"
              />
            ),
            tabBarLabel: 'Curation',
          }}
        />
        <Tab.Screen
          name="MySpace"
          component={MySpaceStackNavigator}
          listeners={({navigation}) => ({
            tabPress: e => {
              // prevent the default behavior (which would activate the tab first)
              e.preventDefault();
              // Navigate to the tab and explicitly target its initial screen.
              // This causes the nested navigator to be at the root BEFORE the tab is shown.
              navigation.dispatch(
                CommonActions.navigate({
                  name: 'MySpace',
                  params: {screen: 'MySpaceScreen'}, // initial screen name in MySpaceStackNavigator
                }),
              );
            },
          })}
          options={({route}: any) => {
            const routeName =
              getFocusedRouteNameFromRoute(route) ?? 'MySpaceScreen';
            const shouldHide =
              routeName === 'OnlineAIScreen' ||
              routeName === 'CinemaInsightsScreen' ||
              routeName === 'AboutLegalScreen' ||
              routeName === 'AISettingsScreen' ||
              routeName === 'WatchlistsScreen' ||
              routeName === 'MyFiltersScreen';

            return {
              title: 'Profile',
              tabBarIcon: ({focused, color}: any) => (
                <TabIcon
                  focused={focused}
                  name="user"
                  color={color}
                  type="feather"
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
            };
          }}
        />
      </Tab.Navigator>
    </View>
  );
};
