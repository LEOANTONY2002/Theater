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
import {
  HomeStackParamList,
  SearchStackParamList,
  MoviesStackParamList,
  TVShowsStackParamList,
  MySpaceStackParamList,
} from '../types/navigation';

const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const SearchStack = createNativeStackNavigator<SearchStackParamList>();
const MoviesStack = createNativeStackNavigator<MoviesStackParamList>();
const TVShowsStack = createNativeStackNavigator<TVShowsStackParamList>();
const MySpaceStack = createNativeStackNavigator<MySpaceStackParamList>();

const screenOptions = {
  headerStyle: {
    backgroundColor: '#121212',
  },
  headerTintColor: '#fff',
  headerTitleStyle: {
    fontWeight: '600' as const,
  },
};

export const HomeStackNavigator = () => (
  <HomeStack.Navigator screenOptions={screenOptions}>
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
      }}
    />
    <HomeStack.Screen
      name="TVShowDetails"
      component={TVShowDetailsScreen}
      options={{
        headerShown: false,
      }}
    />
    <HomeStack.Screen
      name="Category"
      component={CategoryScreen}
      options={{
        headerShown: false,
      }}
    />
  </HomeStack.Navigator>
);

export const SearchStackNavigator = () => (
  <SearchStack.Navigator screenOptions={screenOptions}>
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
      }}
    />
    <SearchStack.Screen
      name="TVShowDetails"
      component={TVShowDetailsScreen}
      options={{
        headerShown: false,
      }}
    />
  </SearchStack.Navigator>
);

export const MoviesStackNavigator = () => (
  <MoviesStack.Navigator screenOptions={screenOptions}>
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
      }}
    />
    <MoviesStack.Screen
      name="Category"
      component={CategoryScreen}
      options={{
        headerShown: false,
      }}
    />
  </MoviesStack.Navigator>
);

export const TVShowsStackNavigator = () => (
  <TVShowsStack.Navigator screenOptions={screenOptions}>
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
      }}
    />
    <TVShowsStack.Screen
      name="Category"
      component={CategoryScreen}
      options={{
        headerShown: false,
      }}
    />
  </TVShowsStack.Navigator>
);

export const MySpaceStackNavigator = () => (
  <MySpaceStack.Navigator screenOptions={screenOptions}>
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
      }}
    />
    <MySpaceStack.Screen
      name="TVShowDetails"
      component={TVShowDetailsScreen}
      options={{
        headerShown: false,
      }}
    />
  </MySpaceStack.Navigator>
);
