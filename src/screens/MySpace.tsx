import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {Movie} from '../types/movie';
import {MovieList, ContentItem} from '../components/MovieList';
import {useNavigation} from '@react-navigation/native';
import {useUserContent} from '../hooks/useUserContent';
import {TVShow} from '../types/tvShow';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../types/navigation';
import {GradientBackground} from '../components/GradientBackground';
import {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
} from '../styles/theme';

type MySpaceScreenNavigationProp =
  NativeStackNavigationProp<RootStackParamList>;

type Section = 'watchlist' | 'history';

export const MySpaceScreen = () => {
  const navigation = useNavigation<MySpaceScreenNavigationProp>();
  const [activeSection, setActiveSection] = useState<Section>('watchlist');

  const {
    content: watchlist,
    isLoading: watchlistLoading,
    refresh: refreshWatchlist,
    removeItem: removeFromWatchlist,
    clearContent: clearWatchlist,
  } = useUserContent('watchlist');

  const {
    content: history,
    isLoading: historyLoading,
    refresh: refreshHistory,
    clearContent: clearHistory,
  } = useUserContent('history');

  const handleClearHistory = useCallback(async () => {
    await clearHistory();
  }, [clearHistory]);

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

  const renderEmptyState = (section: Section) => {
    const messages = {
      watchlist: 'Save movies and TV shows to watch later',
      history: 'Your recently viewed content will appear here',
    };

    const icons = {
      watchlist: 'bookmark-outline',
      history: 'time-outline',
    };

    if (loadingMap[section]) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.emptyStateText}>Loading...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Icon name={icons[section]} size={48} color={colors.text.secondary} />
        <Text style={styles.emptyStateText}>{messages[section]}</Text>
      </View>
    );
  };

  const contentMap = {
    watchlist,
    history,
  };

  const loadingMap = {
    watchlist: watchlistLoading,
    history: historyLoading,
  };

  const refreshMap = {
    watchlist: refreshWatchlist,
    history: refreshHistory,
  };

  return (
    <GradientBackground>
      <View style={styles.container}>
        <View style={styles.tabBar}>
          {(['watchlist', 'history'] as Section[]).map(section => (
            <TouchableOpacity
              key={section}
              style={[
                styles.tab,
                activeSection === section && styles.activeTab,
              ]}
              onPress={() => setActiveSection(section)}>
              <Text
                style={[
                  styles.tabText,
                  activeSection === section && styles.activeTabText,
                ]}>
                {section.charAt(0).toUpperCase() + section.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.content}>
          {activeSection === 'watchlist' && watchlist.length > 0 && (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Watchlist</Text>
              <TouchableOpacity onPress={handleClearWatchlist}>
                <Text style={styles.clearAllText}>Clear All</Text>
              </TouchableOpacity>
            </View>
          )}

          {activeSection === 'history' && history.length > 0 && (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recently Viewed</Text>
              <TouchableOpacity onPress={handleClearHistory}>
                <Text style={styles.clearAllText}>Clear All</Text>
              </TouchableOpacity>
            </View>
          )}

          {contentMap[activeSection].length > 0 ? (
            <MovieList
              key={`${activeSection}-${contentMap[activeSection].length}`}
              data={contentMap[activeSection]}
              onMoviePress={handleMoviePress}
              onLoadMore={() => {}}
              isLoading={loadingMap[activeSection]}
              onRefresh={refreshMap[activeSection]}
              onRemoveFromWatchlist={
                activeSection === 'watchlist'
                  ? handleRemoveFromWatchlist
                  : undefined
              }
            />
          ) : (
            renderEmptyState(activeSection)
          )}
        </View>
      </View>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: spacing.xxl,
  },
  title: {
    color: colors.text.primary,
    ...typography.h2,
  },
  tabBar: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  tab: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    color: colors.text.secondary,
    ...typography.body1,
  },
  activeTabText: {
    color: colors.text.primary,
  },
  content: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyStateText: {
    color: colors.text.secondary,
    ...typography.body1,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  sectionTitle: {
    color: colors.text.primary,
    ...typography.h3,
  },
  clearAllText: {
    color: colors.status.error,
    ...typography.body2,
  },
});
