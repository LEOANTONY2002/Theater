import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {HomeScreen} from '../screens/Home';
import {SearchScreen} from '../screens/Search';
import {MoviesAndSeriesScreen} from '../screens/MoviesAndSeries';
import {FiltersScreen} from '../screens/Filters';
import {MySpaceScreen} from '../screens/MySpace';
import {MovieDetailsScreen} from '../screens/MovieDetails';
import {TVShowDetailsScreen} from '../screens/TVShowDetails';
import {CategoryScreen} from '../screens/CategoryScreen';
import {PersonCreditsScreen} from '../screens/PersonCredits';
import {
  HomeStackParamList,
  SearchStackParamList,
  MoviesAndSeriesStackParamList,
  FiltersStackParamList,
  MySpaceStackParamList,
} from '../types/navigation';
import {GenreScreen} from '../screens/Genre';
import {MyFiltersScreen} from '../screens/MyFilters';
import {WatchlistsScreen} from '../screens/Watchlists';
import {OnlineAIScreen} from '../screens/OnlineAIScreen';
import AISettingsScreen from '../screens/AISettings';
import AboutLegalScreen from '../screens/AboutLegal';
import {ThematicGenreResultsScreen} from '../screens/ThematicGenreResults';
import {EmotionalToneResultsScreen} from '../screens/EmotionalToneResults';
import {OTTDetailsScreen} from '../screens/OTTDetails';
import {CinemaScreen} from '../screens/CinemaScreen';

const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const SearchStack = createNativeStackNavigator<SearchStackParamList>();
const MoviesAndSeriesStack =
  createNativeStackNavigator<MoviesAndSeriesStackParamList>();
const FiltersStack = createNativeStackNavigator<FiltersStackParamList>();
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
    backgroundColor: '#000000',
  },
  animation: 'none' as const,
  presentation: 'card' as const,
  unmountOnBlur: true,
  detachInactiveScreens: true,
};

const modalScreenOptions = {
  ...defaultScreenOptions,
  presentation: 'card' as const,
  unmountOnBlur: true,
  detachInactiveScreens: true,
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
      component={GenreScreen}
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
    <HomeStack.Screen
      name="ThematicGenreResults"
      component={ThematicGenreResultsScreen}
      options={{
        headerShown: false,
        ...modalScreenOptions,
      }}
    />
    <HomeStack.Screen
      name="OTTDetails"
      component={OTTDetailsScreen}
      options={{
        headerShown: false,
        ...modalScreenOptions,
      }}
    />
    <HomeStack.Screen
      name="CinemaScreen"
      component={CinemaScreen}
      options={{
        headerShown: false,
        orientation: 'landscape',
        animation: 'fade',
        presentation: 'fullScreenModal',
        contentStyle: {backgroundColor: '#000000'},
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
    <SearchStack.Screen
      name="Category"
      component={CategoryScreen}
      options={{
        headerShown: false,
        ...modalScreenOptions,
      }}
    />
    <SearchStack.Screen
      name="CinemaScreen"
      component={CinemaScreen}
      options={{
        headerShown: false,
        orientation: 'landscape',
        animation: 'fade',
        presentation: 'fullScreenModal',
        contentStyle: {backgroundColor: '#000000'},
      }}
    />
  </SearchStack.Navigator>
);

export const MoviesAndSeriesStackNavigator = () => (
  <MoviesAndSeriesStack.Navigator screenOptions={defaultScreenOptions}>
    <MoviesAndSeriesStack.Screen
      name="MoviesAndSeriesScreen"
      component={MoviesAndSeriesScreen}
      options={{headerShown: false, title: 'Browse'}}
    />
    <MoviesAndSeriesStack.Screen
      name="MovieDetails"
      component={MovieDetailsScreen}
      options={{
        headerShown: false,
        ...modalScreenOptions,
      }}
    />
    <MoviesAndSeriesStack.Screen
      name="TVShowDetails"
      component={TVShowDetailsScreen}
      options={{
        headerShown: false,
        ...modalScreenOptions,
      }}
    />
    <MoviesAndSeriesStack.Screen
      name="Category"
      component={CategoryScreen}
      options={{
        headerShown: false,
        ...modalScreenOptions,
      }}
    />
    <MoviesAndSeriesStack.Screen
      name="Genre"
      component={GenreScreen}
      options={{
        headerShown: false,
        ...modalScreenOptions,
      }}
    />
    <MoviesAndSeriesStack.Screen
      name="PersonCredits"
      component={PersonCreditsScreen}
      options={{
        headerShown: false,
        ...modalScreenOptions,
      }}
    />
    <MoviesAndSeriesStack.Screen
      name="EmotionalToneResults"
      component={EmotionalToneResultsScreen}
      options={{
        headerShown: false,
        ...modalScreenOptions,
      }}
    />
    <MoviesAndSeriesStack.Screen
      name="CinemaScreen"
      component={CinemaScreen}
      options={{
        headerShown: false,
        orientation: 'landscape',
        animation: 'fade',
        presentation: 'fullScreenModal',
        contentStyle: {backgroundColor: '#000000'},
      }}
    />
  </MoviesAndSeriesStack.Navigator>
);

export const FiltersStackNavigator = () => (
  <FiltersStack.Navigator screenOptions={defaultScreenOptions}>
    <FiltersStack.Screen
      name="FiltersScreen"
      component={FiltersScreen}
      options={{headerShown: false, title: 'My Filters'}}
    />
    <FiltersStack.Screen
      name="MovieDetails"
      component={MovieDetailsScreen}
      options={{
        headerShown: false,
        ...modalScreenOptions,
      }}
    />
    <FiltersStack.Screen
      name="TVShowDetails"
      component={TVShowDetailsScreen}
      options={{
        headerShown: false,
        ...modalScreenOptions,
      }}
    />
    <FiltersStack.Screen
      name="Category"
      component={CategoryScreen}
      options={{
        headerShown: false,
        ...modalScreenOptions,
      }}
    />
    <FiltersStack.Screen
      name="Genre"
      component={GenreScreen}
      options={{
        headerShown: false,
        ...modalScreenOptions,
      }}
    />
    <FiltersStack.Screen
      name="PersonCredits"
      component={PersonCreditsScreen}
      options={{
        headerShown: false,
        ...modalScreenOptions,
      }}
    />
    <FiltersStack.Screen
      name="CinemaScreen"
      component={CinemaScreen}
      options={{
        headerShown: false,
        orientation: 'landscape',
        animation: 'fade',
        presentation: 'fullScreenModal',
        contentStyle: {backgroundColor: '#000000'},
      }}
    />
  </FiltersStack.Navigator>
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
      name="WatchlistsScreen"
      component={WatchlistsScreen}
      options={{headerShown: false}}
    />
    <MySpaceStack.Screen
      name="MyFiltersScreen"
      component={MyFiltersScreen}
      options={{headerShown: false}}
    />
    <MySpaceStack.Screen
      name="OnlineAIScreen"
      component={OnlineAIScreen}
      options={{headerShown: false}}
    />
    <MySpaceStack.Screen
      name="AISettingsScreen"
      component={AISettingsScreen}
      options={{headerShown: false}}
    />
    <MySpaceStack.Screen
      name="AboutLegalScreen"
      component={AboutLegalScreen}
      options={{headerShown: false}}
    />
    <MySpaceStack.Screen
      name="CinemaScreen"
      component={CinemaScreen}
      options={{
        headerShown: false,
        orientation: 'landscape',
        animation: 'fade',
        presentation: 'fullScreenModal',
        contentStyle: {backgroundColor: '#000000'},
      }}
    />
  </MySpaceStack.Navigator>
);
