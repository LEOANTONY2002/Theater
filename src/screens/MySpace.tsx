import React, {useState, useCallback, useEffect} from 'react';
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
import {LanguageSettings} from '../components/LanguageSettings';
import {SettingsManager} from '../store/settings';
import Icon from 'react-native-vector-icons/Ionicons';
import {useQueryClient} from '@tanstack/react-query';

type MySpaceScreenNavigationProp =
  NativeStackNavigationProp<RootStackParamList>;

type Tab = 'watchlist' | 'settings';

export const MySpaceScreen = () => {
  const navigation = useNavigation<MySpaceScreenNavigationProp>();
  const [activeTab, setActiveTab] = useState<Tab>('watchlist');
  const queryClient = useQueryClient();

  const {
    content: watchlist,
    isLoading: watchlistLoading,
    refresh: refreshWatchlist,
    removeItem: removeFromWatchlist,
    clearContent: clearWatchlist,
  } = useUserContent('watchlist');

  useEffect(() => {
    // Listen for language changes and invalidate queries to refetch data
    const handleLanguageChange = () => {
      // Invalidate all queries to refetch with new language settings
      queryClient.invalidateQueries();
    };

    SettingsManager.addChangeListener(handleLanguageChange);

    return () => {
      SettingsManager.removeChangeListener(handleLanguageChange);
    };
  }, [queryClient]);

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
          movie: item as Movie,
        });
      } else {
        navigation.navigate('TVShowDetails', {
          show: item as TVShow,
        });
      }
    },
    [navigation],
  );

  const renderTab = (tab: Tab, label: string, icon: string) => (
    <TouchableOpacity
      style={[styles.tab, activeTab === tab && styles.activeTab]}
      onPress={() => setActiveTab(tab)}>
      <Icon
        name={icon}
        size={24}
        color={activeTab === tab ? colors.primary : colors.text.secondary}
      />
      <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <GradientBackground>
      <View style={styles.container}>
        <View style={styles.tabs}>
          {renderTab('watchlist', 'Watchlist', 'bookmark-outline')}
          {renderTab('settings', 'Settings', 'settings-outline')}
        </View>

        {activeTab === 'watchlist' ? (
          <>
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
          </>
        ) : (
          <LanguageSettings />
        )}
      </View>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: spacing.lg,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    ...typography.body1,
    color: colors.text.secondary,
  },
  activeTabText: {
    color: colors.primary,
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
