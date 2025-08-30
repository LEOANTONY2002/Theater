import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {colors, spacing, typography} from '../styles/theme';
import {HorizontalList} from './HorizontalList';
import {ContentItem} from './MovieList';
import {getPersonalizedRecommendation} from '../services/gemini';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

type RootStackParamList = {
  MovieDetails: {movie: any};
  TVShowDetails: {show: any};
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const RECENT_ITEMS_KEY = '@recent_search_items';
const BECAUSE_YOU_WATCHED_KEY = '@because_you_watched_cache';
const CACHE_DURATION = 1000 * 60 * 60 * 2; // 2 hours

interface CachedRecommendations {
  recommendations: ContentItem[];
  timestamp: number;
  basedOnItems: string[];
}

export const BecauseYouWatched: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [recommendations, setRecommendations] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [basedOnTitle, setBasedOnTitle] = useState<string>('');

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    try {
      // Check cache first
      const cachedData = await AsyncStorage.getItem(BECAUSE_YOU_WATCHED_KEY);
      if (cachedData) {
        const parsed: CachedRecommendations = JSON.parse(cachedData);
        const isExpired = Date.now() - parsed.timestamp > CACHE_DURATION;

        if (!isExpired && parsed.recommendations.length > 0) {
          setRecommendations(parsed.recommendations);
          setBasedOnTitle(getBasedOnTitle(parsed.basedOnItems));
          return;
        }
      }

      // Load recent search items
      const recentItemsData = await AsyncStorage.getItem(RECENT_ITEMS_KEY);
      if (!recentItemsData) return;

      const recentItems: ContentItem[] = JSON.parse(recentItemsData);
      if (recentItems.length === 0) return;

      setIsLoading(true);

      // Get the most recent 3 items for analysis
      const recentForAnalysis = recentItems.slice(0, 3);
      const genres = extractGenresFromItems(recentForAnalysis);

      if (genres.length === 0) return;

      // Create feedback history from recent items (mark as liked)
      const feedbackHistory = recentForAnalysis.map(item => ({
        contentId: item.id,
        title: (item as any).title || (item as any).name || '',
        liked: true,
        genres: genres,
        timestamp: Date.now(),
      }));

      // Get multiple recommendations
      const recommendationPromises = Array(6)
        .fill(null)
        .map(() => getPersonalizedRecommendation(genres, feedbackHistory));

      const results = await Promise.all(recommendationPromises);
      const validRecommendations = results
        .filter(rec => rec && rec.id)
        .filter(
          (rec, index, self) =>
            // Remove duplicates and items already in recent searches
            index === self.findIndex(r => r.id === rec.id) &&
            !recentItems.some(recent => recent.id === rec.id),
        )
        .slice(0, 10);

      if (validRecommendations.length > 0) {
        setRecommendations(validRecommendations);

        const itemTitles = recentForAnalysis.map(
          item => (item as any).title || (item as any).name || '',
        );
        setBasedOnTitle(getBasedOnTitle(itemTitles));

        // Cache the results
        const cacheData: CachedRecommendations = {
          recommendations: validRecommendations,
          timestamp: Date.now(),
          basedOnItems: itemTitles,
        };
        await AsyncStorage.setItem(
          BECAUSE_YOU_WATCHED_KEY,
          JSON.stringify(cacheData),
        );
      }
    } catch (error) {
      console.error(
        'Error loading Because You Watched recommendations:',
        error,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const extractGenresFromItems = (items: ContentItem[]): string[] => {
    const genreMap: {[key: number]: string} = {
      28: 'Action',
      12: 'Adventure',
      16: 'Animation',
      35: 'Comedy',
      80: 'Crime',
      99: 'Documentary',
      18: 'Drama',
      10751: 'Family',
      14: 'Fantasy',
      36: 'History',
      27: 'Horror',
      10402: 'Music',
      9648: 'Mystery',
      10749: 'Romance',
      878: 'Sci-Fi',
      10770: 'TV Movie',
      53: 'Thriller',
      10752: 'War',
      37: 'Western',
    };

    const allGenres = items.flatMap(item =>
      (item.genre_ids || []).map(id => genreMap[id]).filter(Boolean),
    );

    // Get unique genres, prioritize most common ones
    const genreCounts = allGenres.reduce((acc, genre) => {
      acc[genre] = (acc[genre] || 0) + 1;
      return acc;
    }, {} as {[key: string]: number});

    return Object.entries(genreCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([genre]) => genre);
  };

  const getBasedOnTitle = (itemTitles: string[]): string => {
    if (itemTitles.length === 0) return '';
    if (itemTitles.length === 1) return itemTitles[0];
    if (itemTitles.length === 2) return `${itemTitles[0]} and ${itemTitles[1]}`;
    return `${itemTitles[0]}, ${itemTitles[1]} and others`;
  };

  const handleItemPress = (item: ContentItem) => {
    if ((item as any).media_type === 'movie' || item.type === 'movie') {
      navigation.navigate('MovieDetails', {movie: item});
    } else {
      navigation.navigate('TVShowDetails', {show: item});
    }
  };

  if (recommendations.length === 0 && !isLoading) {
    return null;
  }

  return (
    <View style={styles.container}>
      <HorizontalList
        title={
          basedOnTitle
            ? `Because you searched ${basedOnTitle}`
            : 'Recommended for You'
        }
        data={recommendations}
        onItemPress={handleItemPress}
        isLoading={isLoading}
        isSeeAll={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
  },
});
