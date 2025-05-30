import React, {useState, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../types/navigation';
import {useUserContent} from '../hooks/useUserContent';
import {MovieList, ContentItem} from '../components/MovieList';
import {Movie} from '../types/movie';
import {TVShow} from '../types/tvshow';
import {colors, spacing, typography} from '../styles/theme';
import {LanguageSettings} from '../components/LanguageSettings';
import {SettingsManager} from '../store/settings';
import {useQueryClient} from '@tanstack/react-query';
import {BlurView} from '@react-native-community/blur';
import {MovieCard} from '../components/MovieCard';

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
      {/* <Icon
        name={icon}
        size={24}
        color={activeTab === tab ? colors.primary : colors.text.secondary}
      /> */}
      <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.tabsContainer}>
        <View style={styles.tabs}>
          <BlurView
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 50,
            }}
            blurRadius={10}
            overlayColor="rgba(43, 43, 63, 0.72)"
          />
          {renderTab('watchlist', 'Watchlist', 'bookmark-outline')}
          {renderTab('settings', 'Settings', 'settings-outline')}
        </View>
      </View>

      {activeTab === 'watchlist' ? (
        <>
          {/* {watchlist.length > 0 && (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Watchlist</Text>
              <TouchableOpacity onPress={handleClearWatchlist}>
                <Text style={styles.clearAllText}>Clear All</Text>
              </TouchableOpacity>
            </View>
          )} */}

          {watchlist.length > 0 ? (
            <View style={styles.watchlistContainer}>
              <FlatList
                data={watchlist}
                numColumns={3}
                renderItem={({item}) => (
                  <MovieCard item={item} onPress={handleMoviePress} />
                )}
              />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Your watchlist is empty</Text>
            </View>
          )}
        </>
      ) : (
        <LanguageSettings />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: spacing.lg,
    backgroundColor: colors.background.primary,
  },
  tabsContainer: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  tabs: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    overflow: 'hidden',
    borderRadius: 100,
    paddingHorizontal: spacing.lg,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  activeTab: {
    // borderBottomWidth: 2,
    // borderBottomColor: colors.text.primary,
  },
  tabText: {
    ...typography.body1,
    color: colors.text.muted,
  },
  activeTabText: {
    color: colors.text.primary,
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
  watchlistContainer: {
    flex: 1,
    paddingVertical: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: colors.text.muted,
    ...typography.body1,
  },
});
