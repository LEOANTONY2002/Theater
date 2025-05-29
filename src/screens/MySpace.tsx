import React, {useCallback} from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../types/navigation';
import {useUserContent} from '../hooks/useUserContent';
import {MovieList, ContentItem} from '../components/MovieList';
import {Movie} from '../types/movie';
import {TVShow} from '../types/tvshow';
import {colors, spacing, typography} from '../styles/theme';
import {GradientBackground} from '../components/GradientBackground';

type MySpaceScreenNavigationProp =
  NativeStackNavigationProp<RootStackParamList>;

export const MySpaceScreen = () => {
  const navigation = useNavigation<MySpaceScreenNavigationProp>();

  const {
    content: watchlist,
    isLoading: watchlistLoading,
    refresh: refreshWatchlist,
    removeItem: removeFromWatchlist,
    clearContent: clearWatchlist,
  } = useUserContent('watchlist');

  const handleClearWatchlist = useCallback(async () => {
    await clearWatchlist();
  }, [clearWatchlist]);

  const handleRemoveFromWatchlist = useCallback(
    async (itemId: number) => {
      await removeFromWatchlist(itemId);
    },
    [removeFromWatchlist],
  );

  const handleMoviePress = useCallback(
    (item: ContentItem) => {
      if (item.type === 'movie') {
        navigation.navigate('MovieDetails', {
          movie: item as unknown as Movie,
        });
      } else {
        navigation.navigate('TVShowDetails', {
          show: item as unknown as TVShow,
        });
      }
    },
    [navigation],
  );

  return (
    <GradientBackground>
      <View style={styles.container}>
        {watchlist.length > 0 && (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Watchlist</Text>
            <TouchableOpacity onPress={handleClearWatchlist}>
              <Text style={styles.clearAllText}>Clear All</Text>
            </TouchableOpacity>
          </View>
        )}

        <MovieList
          data={watchlist}
          isLoading={watchlistLoading}
          onMoviePress={handleMoviePress}
          onRefresh={refreshWatchlist}
          onRemove={handleRemoveFromWatchlist}
          emptyText="Your watchlist is empty"
          emptySubtext="Add movies and TV shows to your watchlist to keep track of what you want to watch"
        />
      </View>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.text.primary,
    ...typography.h2,
  },
  clearAllText: {
    color: colors.text.muted,
    ...typography.body2,
  },
});
