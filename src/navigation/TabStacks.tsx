import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {HomeScreen} from '../screens/Home';
import {SearchScreen} from '../screens/Search';
import {MoviesScreen} from '../screens/Movies';
import {TVShowsScreen} from '../screens/TVShows';
import {MySpaceScreen} from '../screens/MySpace';
import {MovieDetailsScreen} from '../screens/MovieDetails';
import {TVShowDetailsScreen} from '../screens/TVShowDetails';
import {CategoryScreen} from '../screens/CategoryScreen';
import {PersonCreditsScreen} from '../screens/PersonCredits';
import {
  HomeStackParamList,
  SearchStackParamList,
  MoviesStackParamList,
  TVShowsStackParamList,
  MySpaceStackParamList,
} from '../types/navigation';
import {Genre} from '../screens/Genre';
import {MyFiltersScreen} from '../screens/MyFilters';

const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const SearchStack = createNativeStackNavigator<SearchStackParamList>();
const MoviesStack = createNativeStackNavigator<MoviesStackParamList>();
const TVShowsStack = createNativeStackNavigator<TVShowsStackParamList>();
const MySpaceStack = createNativeStackNavigator<MySpaceStackParamList>();

const defaultScreenOptions = {
  headerStyle: {
    backgroundColor: 'transparent',
  },
  headerTintColor: '#fff',
  headerTitleStyle: {
    fontWeight: '600' as const,
  },
  contentStyle: {
    backgroundColor: 'transparent',
  },
  animation: 'slide_from_right' as const,
  presentation: 'transparentModal' as const,
};

const modalScreenOptions = {
  ...defaultScreenOptions,
  animation: 'slide_from_bottom' as const,
  presentation: 'transparentModal' as const,
};

export const HomeStackNavigator = () => (
  <HomeStack.Navigator screenOptions={defaultScreenOptions}>
    <HomeStack.Screen
      name="HomeScreen"
      component={HomeScreen}
      options={{headerShown: false, title: 'Home'}}
    />
    <HomeStack.Screen
      name="MovieDetails"
      component={MovieDetailsScreen}
      options={{
        headerShown: false,
        ...modalScreenOptions,
      }}
    />
    <HomeStack.Screen
      name="TVShowDetails"
      component={TVShowDetailsScreen}
      options={{
        headerShown: false,
        ...modalScreenOptions,
      }}
    />
    <HomeStack.Screen
      name="Category"
      component={CategoryScreen}
      options={{
        headerShown: false,
        ...modalScreenOptions,
      }}
    />
    <HomeStack.Screen
      name="Genre"
      component={Genre}
      options={{
        headerShown: false,
        ...modalScreenOptions,
      }}
    />
    <HomeStack.Screen
      name="PersonCredits"
      component={PersonCreditsScreen}
      options={{
        headerShown: false,
        ...modalScreenOptions,
      }}
    />
  </HomeStack.Navigator>
);

export const SearchStackNavigator = () => (
  <SearchStack.Navigator screenOptions={defaultScreenOptions}>
    <SearchStack.Screen
      name="SearchScreen"
      component={SearchScreen}
      options={{headerShown: false, title: 'Search'}}
    />
    <SearchStack.Screen
      name="MovieDetails"
      component={MovieDetailsScreen}
      options={{
        headerShown: false,
        ...modalScreenOptions,
      }}
    />
    <SearchStack.Screen
      name="TVShowDetails"
      component={TVShowDetailsScreen}
      options={{
        headerShown: false,
        ...modalScreenOptions,
      }}
    />
    <SearchStack.Screen
      name="PersonCredits"
      component={PersonCreditsScreen}
      options={{
        headerShown: false,
        ...modalScreenOptions,
      }}
    />
  </SearchStack.Navigator>
);

export const MoviesStackNavigator = () => (
  <MoviesStack.Navigator screenOptions={defaultScreenOptions}>
    <MoviesStack.Screen
      name="MoviesScreen"
      component={MoviesScreen}
      options={{headerShown: false, title: 'Movies'}}
    />
    <MoviesStack.Screen
      name="MovieDetails"
      component={MovieDetailsScreen}
      options={{
        headerShown: false,
        ...modalScreenOptions,
      }}
    />
    <MoviesStack.Screen
      name="Category"
      component={CategoryScreen}
      options={{
        headerShown: false,
        ...modalScreenOptions,
      }}
    />
    <MoviesStack.Screen
      name="Genre"
      component={Genre}
      options={{
        headerShown: false,
        ...modalScreenOptions,
      }}
    />
    <MoviesStack.Screen
      name="PersonCredits"
      component={PersonCreditsScreen}
      options={{
        headerShown: false,
        ...modalScreenOptions,
      }}
    />
  </MoviesStack.Navigator>
);

export const TVShowsStackNavigator = () => (
  <TVShowsStack.Navigator screenOptions={defaultScreenOptions}>
    <TVShowsStack.Screen
      name="TVShowsScreen"
      component={TVShowsScreen}
      options={{headerShown: false, title: 'TV Shows'}}
    />
    <TVShowsStack.Screen
      name="TVShowDetails"
      component={TVShowDetailsScreen}
      options={{
        headerShown: false,
        ...modalScreenOptions,
      }}
    />
    <TVShowsStack.Screen
      name="Genre"
      component={Genre}
      options={{
        headerShown: false,
        ...modalScreenOptions,
      }}
    />
    <TVShowsStack.Screen
      name="Category"
      component={CategoryScreen}
      options={{
        headerShown: false,
        ...modalScreenOptions,
      }}
    />
    <TVShowsStack.Screen
      name="PersonCredits"
      component={PersonCreditsScreen}
      options={{
        headerShown: false,
        ...modalScreenOptions,
      }}
    />
  </TVShowsStack.Navigator>
);

export const MySpaceStackNavigator = () => (
  <MySpaceStack.Navigator screenOptions={defaultScreenOptions}>
    <MySpaceStack.Screen
      name="MySpaceScreen"
      component={MySpaceScreen}
      options={{title: 'My Space', headerShown: false}}
    />
    <MySpaceStack.Screen
      name="MovieDetails"
      component={MovieDetailsScreen}
      options={{
        headerShown: false,
        ...modalScreenOptions,
      }}
    />
    <MySpaceStack.Screen
      name="TVShowDetails"
      component={TVShowDetailsScreen}
      options={{
        headerShown: false,
        ...modalScreenOptions,
      }}
    />
    <MySpaceStack.Screen
      name="PersonCredits"
      component={PersonCreditsScreen}
      options={{
        headerShown: false,
        ...modalScreenOptions,
      }}
    />
    <MySpaceStack.Screen
      name="MyFiltersScreen"
      component={MyFiltersScreen}
      options={{headerShown: false}}
    />
  </MySpaceStack.Navigator>
);
