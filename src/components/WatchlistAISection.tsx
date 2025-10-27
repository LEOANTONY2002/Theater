import React, {useEffect, useState, useCallback, useMemo} from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {colors, spacing, borderRadius, typography} from '../styles/theme';
import {WatchlistInsightsManager} from '../store/watchlistInsights';
import {HorizontalList} from './HorizontalList';
import {useNavigationState} from '../hooks/useNavigationState';
import type {Movie} from '../types/movie';
import Icon from 'react-native-vector-icons/Ionicons';
import {useIsFocused} from '@react-navigation/native';
import {useWatchlists, useWatchlistItems} from '../hooks/useWatchlists';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const WatchlistAISection: React.FC = () => {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const {navigateWithLimit} = useNavigationState();
  const isFocused = useIsFocused();
  const {data: watchlists = []} = useWatchlists();

  // Collect all items from all watchlists using hooks
  const allWatchlistItems = useMemo(() => {
    const itemsArrays = watchlists.map(wl => {
      // Can't use hooks in array map, so we'll do this differently
      return [];
    });
    return itemsArrays.flat();
  }, [watchlists]);

  // Simple approach: Try to load from any existing analysis
  useEffect(() => {
    if (isFocused) {
      loadRecommendations();
    }
  }, [isFocused]);

  const loadRecommendations = async () => {
    try {
      setLoading(true);

      // Try to find any stored recommendations by checking storage keys
      // This is a simple approach - just look for the latest analysis
      const keys = await AsyncStorage.getAllKeys();
      const recKeys = keys.filter((key: string) =>
        key.startsWith('@watchlist_recommendations:'),
      );

      if (recKeys.length === 0) {
        setRecommendations([]);
        return;
      }

      // Get the most recent one
      const latestKey = recKeys[recKeys.length - 1];
      const data = await AsyncStorage.getItem(latestKey);

      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.items && parsed.items.length > 0) {
          console.log(
            '✅ Loaded',
            parsed.items.length,
            'AI recommendations for home',
          );
          setRecommendations(parsed.items);
        } else {
          setRecommendations([]);
        }
      } else {
        setRecommendations([]);
      }
    } catch (err) {
      console.error('Error loading AI recommendations:', err);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleItemPress = useCallback(
    (item: any) => {
      if (item.type === 'movie') {
        navigateWithLimit('MovieDetails', {movie: item as Movie});
      } else {
        navigateWithLimit('TVShowDetails', {show: item as any});
      }
    },
    [navigateWithLimit],
  );

  const handleSeeAll = useCallback(() => {
    navigateWithLimit('Watchlists');
  }, [navigateWithLimit]);

  // Don't render if no recommendations
  if (!loading && recommendations.length === 0) {
    return null;
  }

  return (
    <View>
      <View style={styles.titleRow}>
        <Icon name="sparkles" size={20} color={colors.accent} />
        <Text style={styles.title}>AI Picks Based on Your Watchlists</Text>
      </View>
      <HorizontalList
        title=""
        data={recommendations}
        onItemPress={handleItemPress}
        isLoading={loading}
        isSeeAll={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginLeft: spacing.md,
    marginBottom: -spacing.lg,
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
  },
  seeAll: {
    ...typography.body2,
    color: colors.accent,
    fontWeight: '600',
  },
});
