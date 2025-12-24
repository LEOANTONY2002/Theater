import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {HomeScreen} from '../screens/Home';
import {SearchScreen} from '../screens/Search';
import {MoviesAndSeriesScreen} from '../screens/MoviesAndSeries';
import {CurationScreen} from '../screens/Curation';
import {MySpaceScreen} from '../screens/MySpace';
import {MovieDetailsScreen} from '../screens/MovieDetails';
import {TVShowDetailsScreen} from '../screens/TVShowDetails';
import {CollectionScreen} from '../screens/Collection';
import {CategoryScreen} from '../screens/CategoryScreen';
import {PersonCreditsScreen} from '../screens/PersonCredits';
import {
  HomeStackParamList,
  SearchStackParamList,
  MoviesAndSeriesStackParamList,
  CurationStackParamList,
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
import {NotificationSettings} from '../screens/NotificationSettings';
import {MyCollectionsScreen} from '../screens/MyCollections';
import {MyCalendarScreen} from '../screens/MyCalendar';

const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const SearchStack = createNativeStackNavigator<SearchStackParamList>();
const MoviesAndSeriesStack =
  createNativeStackNavigator<MoviesAndSeriesStackParamList>();
const CurationStack = createNativeStackNavigator<CurationStackParamList>();
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
      name="Collection"
      component={CollectionScreen}
      options={slideFromRightOptions}
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
      options={{title: 'Search', animation: 'none'}}
    />
    <SearchStack.Screen
      name="MovieDetails"
      component={MovieDetailsScreen}
      options={{...modalScreenOptions, animation: 'none'}}
    />
    <SearchStack.Screen
      name="TVShowDetails"
      component={TVShowDetailsScreen}
      options={{...modalScreenOptions, animation: 'none'}}
    />
    <SearchStack.Screen
      name="Collection"
      component={CollectionScreen}
      options={slideFromRightOptions}
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
      name="Collection"
      component={CollectionScreen}
      options={slideFromRightOptions}
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

export const CurationStackNavigator = () => (
  <CurationStack.Navigator screenOptions={defaultScreenOptions}>
    <CurationStack.Screen
      name="CurationScreen"
      component={CurationScreen}
      options={{title: 'Curation'}}
    />
    <CurationStack.Screen
      name="MovieDetails"
      component={MovieDetailsScreen}
      options={modalScreenOptions}
    />
    <CurationStack.Screen
      name="TVShowDetails"
      component={TVShowDetailsScreen}
      options={modalScreenOptions}
    />
    <CurationStack.Screen
      name="Collection"
      component={CollectionScreen}
      options={slideFromRightOptions}
    />
    <CurationStack.Screen
      name="Category"
      component={CategoryScreen}
      options={slideFromRightOptions}
    />
    <CurationStack.Screen
      name="Genre"
      component={GenreScreen}
      options={slideFromRightOptions}
    />
    <CurationStack.Screen
      name="PersonCredits"
      component={PersonCreditsScreen}
      options={modalScreenOptions}
    />
    <CurationStack.Screen
      name="CinemaScreen"
      component={CinemaScreen}
      options={{
        orientation: 'landscape',
        animation: 'fade',
        presentation: 'fullScreenModal',
        contentStyle: {backgroundColor: '#000000'},
      }}
    />
  </CurationStack.Navigator>
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
      name="Collection"
      component={CollectionScreen}
      options={slideFromRightOptions}
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
      name="NotificationSettings"
      component={NotificationSettings}
      options={slideFromRightOptions}
    />
    <MySpaceStack.Screen
      name="MyCalendarScreen"
      component={MyCalendarScreen}
      options={slideFromRightOptions}
    />

    <MySpaceStack.Screen
      name="MyCollectionsScreen"
      component={MyCollectionsScreen}
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
