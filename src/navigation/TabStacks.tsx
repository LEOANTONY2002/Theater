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
import {CinemaInsightsScreen} from '../screens/CinemaInsightsScreen';

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
  animation: 'fade_from_bottom' as const,
  presentation: 'card' as const,
  unmountOnBlur: true,
  detachInactiveScreens: true,
  headerShown: false,
};

const modalScreenOptions = {
  ...defaultScreenOptions,
  animation: 'slide_from_bottom' as const,
};

const slideFromRightOptions = {
  ...defaultScreenOptions,
  animation: 'slide_from_right' as const,
};

export const HomeStackNavigator = () => (
  <HomeStack.Navigator screenOptions={defaultScreenOptions}>
    <HomeStack.Screen
      name="HomeScreen"
      component={HomeScreen}
      options={{title: 'Home'}}
    />
    <HomeStack.Screen
      name="MovieDetails"
      component={MovieDetailsScreen}
      options={modalScreenOptions}
    />
    <HomeStack.Screen
      name="TVShowDetails"
      component={TVShowDetailsScreen}
      options={modalScreenOptions}
    />
    <HomeStack.Screen
      name="Category"
      component={CategoryScreen}
      options={slideFromRightOptions}
    />
    <HomeStack.Screen
      name="Genre"
      component={GenreScreen}
      options={slideFromRightOptions}
    />
    <HomeStack.Screen
      name="PersonCredits"
      component={PersonCreditsScreen}
      options={modalScreenOptions}
    />
    <HomeStack.Screen
      name="ThematicGenreResults"
      component={ThematicGenreResultsScreen}
      options={slideFromRightOptions}
    />
    <HomeStack.Screen
      name="OTTDetails"
      component={OTTDetailsScreen}
      options={slideFromRightOptions}
    />
    <HomeStack.Screen
      name="CinemaScreen"
      component={CinemaScreen}
      options={{
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
      options={{title: 'Search'}}
    />
    <SearchStack.Screen
      name="MovieDetails"
      component={MovieDetailsScreen}
      options={modalScreenOptions}
    />
    <SearchStack.Screen
      name="TVShowDetails"
      component={TVShowDetailsScreen}
      options={modalScreenOptions}
    />
    <SearchStack.Screen
      name="PersonCredits"
      component={PersonCreditsScreen}
      options={modalScreenOptions}
    />
    <SearchStack.Screen
      name="Category"
      component={CategoryScreen}
      options={slideFromRightOptions}
    />
    <SearchStack.Screen
      name="CinemaScreen"
      component={CinemaScreen}
      options={{
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
      options={{title: 'Browse'}}
    />
    <MoviesAndSeriesStack.Screen
      name="MovieDetails"
      component={MovieDetailsScreen}
      options={modalScreenOptions}
    />
    <MoviesAndSeriesStack.Screen
      name="TVShowDetails"
      component={TVShowDetailsScreen}
      options={modalScreenOptions}
    />
    <MoviesAndSeriesStack.Screen
      name="Category"
      component={CategoryScreen}
      options={slideFromRightOptions}
    />
    <MoviesAndSeriesStack.Screen
      name="Genre"
      component={GenreScreen}
      options={slideFromRightOptions}
    />
    <MoviesAndSeriesStack.Screen
      name="PersonCredits"
      component={PersonCreditsScreen}
      options={modalScreenOptions}
    />
    <MoviesAndSeriesStack.Screen
      name="EmotionalToneResults"
      component={EmotionalToneResultsScreen}
      options={slideFromRightOptions}
    />
    <MoviesAndSeriesStack.Screen
      name="CinemaScreen"
      component={CinemaScreen}
      options={{
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
      options={{title: 'My Filters'}}
    />
    <FiltersStack.Screen
      name="MovieDetails"
      component={MovieDetailsScreen}
      options={modalScreenOptions}
    />
    <FiltersStack.Screen
      name="TVShowDetails"
      component={TVShowDetailsScreen}
      options={modalScreenOptions}
    />
    <FiltersStack.Screen
      name="Category"
      component={CategoryScreen}
      options={slideFromRightOptions}
    />
    <FiltersStack.Screen
      name="Genre"
      component={GenreScreen}
      options={slideFromRightOptions}
    />
    <FiltersStack.Screen
      name="PersonCredits"
      component={PersonCreditsScreen}
      options={modalScreenOptions}
    />
    <FiltersStack.Screen
      name="CinemaScreen"
      component={CinemaScreen}
      options={{
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
      options={{title: 'My Space'}}
    />
    <MySpaceStack.Screen
      name="MovieDetails"
      component={MovieDetailsScreen}
      options={modalScreenOptions}
    />
    <MySpaceStack.Screen
      name="TVShowDetails"
      component={TVShowDetailsScreen}
      options={modalScreenOptions}
    />
    <MySpaceStack.Screen
      name="PersonCredits"
      component={PersonCreditsScreen}
      options={modalScreenOptions}
    />
    <MySpaceStack.Screen name="WatchlistsScreen" component={WatchlistsScreen} />
    <MySpaceStack.Screen name="MyFiltersScreen" component={MyFiltersScreen} />
    <MySpaceStack.Screen name="OnlineAIScreen" component={OnlineAIScreen} />
    <MySpaceStack.Screen name="AISettingsScreen" component={AISettingsScreen} />
    <MySpaceStack.Screen name="AboutLegalScreen" component={AboutLegalScreen} />
    <MySpaceStack.Screen
      name="CinemaScreen"
      component={CinemaScreen}
      options={{
        orientation: 'landscape',
        animation: 'fade',
        presentation: 'fullScreenModal',
        contentStyle: {backgroundColor: '#000000'},
      }}
    />
    <MySpaceStack.Screen
      name="CinemaInsightsScreen"
      component={CinemaInsightsScreen}
      options={{
        animation: 'fade',
      }}
    />
  </MySpaceStack.Navigator>
);
