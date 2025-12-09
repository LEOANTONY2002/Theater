import React, {useCallback, useState} from 'react';
import {View, Text, StyleSheet, FlatList, TouchableOpacity} from 'react-native';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {useWatchlists, useWatchlistItems} from '../hooks/useWatchlists';
import {HorizontalList} from '../components/HorizontalList';
import {ContentItem} from '../components/MovieList';
import {useNavigation} from '@react-navigation/native';
import {Movie} from '../types/movie';
import {TVShow} from '../types/tvshow';
import {useNavigationState} from '../hooks/useNavigationState';
import {useResponsive} from '../hooks/useResponsive';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {GradientButton} from '../components/GradientButton';
import {WatchlistAnalyzer} from '../components/WatchlistAnalyzer';
import {QuickDecision} from '../components/QuickDecision';
import {useAIEnabled} from '../hooks/useAIEnabled';

export const WatchlistsTabScreen: React.FC = () => {
  const {data: watchlists = [], isLoading} = useWatchlists();
  const navigation = useNavigation();
  const {navigateWithLimit} = useNavigationState();
  const {isTablet, orientation} = useResponsive();
  const [showQuickDecision, setShowQuickDecision] = useState(false);
  const [selectedItemsForComparison, setSelectedItemsForComparison] = useState<
    ContentItem[]
  >([]);
  const {isAIEnabled} = useAIEnabled();

  const handleItemPress = useCallback(
    (item: ContentItem) => {
      if (item.type === 'movie') {
        navigateWithLimit('MovieDetails', {movie: item as Movie});
      } else {
        navigateWithLimit('TVShowDetails', {show: item as TVShow});
      }
    },
    [navigateWithLimit],
  );

  const handleViewAll = useCallback(
    (watchlistId: string, watchlistName: string) => {
      (navigation as any).navigate('WatchlistsScreen');
    },
    [navigation],
  );

  const handleQuickDecisionOpen = (items: ContentItem[]) => {
    if (items.length >= 2) {
      setSelectedItemsForComparison(items);
      setShowQuickDecision(true);
    }
  };

  // Component to aggregate all watchlist items for analysis
  const AllWatchlistsAnalyzer: React.FC = () => {
    // Collect all items from all watchlists
    const allItemsData = watchlists.map(wl => {
      const {data: items = []} = useWatchlistItems(wl.id);
      return items;
    });

    const allItems = allItemsData.flat();

    if (!isAIEnabled || allItems.length < 3) {
      return null;
    }

    return <WatchlistAnalyzer watchlistItems={allItems} />;
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.primary,
    },
    contentContainer: {
      paddingBottom: spacing.xxl * 2,
      paddingTop: isTablet ? 120 : 100,
    },
    emptyContainer: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: orientation === 'landscape' ? '20%' : '50%',
    },
    emptyTitle: {
      ...typography.h2,
      color: colors.text.primary,
      marginBottom: spacing.sm,
    },
    emptyText: {
      ...typography.body1,
      color: colors.text.secondary,
      textAlign: 'center',
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xxl * 2,
      paddingTop: spacing.xl * 2,
    },
    loadingText: {
      color: colors.text.secondary,
      ...typography.body1,
    },
  });

  // Component to render each watchlist row with its own query
  const WatchlistRow = React.memo(
    ({
      watchlistId,
      watchlistName,
    }: {
      watchlistId: string;
      watchlistName: string;
    }) => {
      const {data: items = [], isLoading: itemsLoading} =
        useWatchlistItems(watchlistId);

      // Convert watchlist items to ContentItem format
      const contentItems: ContentItem[] = items.map(item => {
        if (item.type === 'movie') {
          return {
            id: item.id,
            title: item.title || '',
            originalTitle: item.originalTitle || '',
            overview: item.overview,
            poster_path: item.poster_path,
            backdrop_path: item.backdrop_path,
            vote_average: item.vote_average,
            release_date: item.release_date || '',
            genre_ids: item.genre_ids,
            popularity: item.popularity,
            original_language: item.original_language,
            type: 'movie' as const,
          };
        } else {
          return {
            id: item.id,
            name: item.name || '',
            overview: item.overview,
            poster_path: item.poster_path,
            backdrop_path: item.backdrop_path,
            vote_average: item.vote_average,
            first_air_date: item.first_air_date || '',
            genre_ids: item.genre_ids,
            origin_country: item.origin_country || [],
            popularity: item.popularity,
            original_language: item.original_language,
            type: 'tv' as const,
          };
        }
      });

      if (contentItems.length === 0) return null;

      return (
        <View style={{marginBottom: spacing.md}}>
          {isAIEnabled && contentItems.length >= 2 && (
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                paddingHorizontal: spacing.md,
              }}>
              <Text style={{...typography.h3, color: colors.text.primary}}>
                {watchlistName}
              </Text>
              <TouchableOpacity
                style={{
                  alignItems: 'center',
                  flexDirection: 'row',
                  gap: spacing.sm,
                  backgroundColor: colors.modal.blur,
                  borderRadius: borderRadius.round,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  borderColor: colors.modal.content,
                  borderWidth: 1,
                }}
                activeOpacity={0.9}
                onPress={() => handleQuickDecisionOpen(contentItems)}>
                <Ionicons name="sparkles" size={16} color={colors.accent} />
                <Text
                  style={{
                    ...typography.body2,
                    color: colors.text.primary,
                    fontSize: 10,
                  }}>
                  AI Compare
                </Text>
              </TouchableOpacity>
            </View>
          )}
          <HorizontalList
            title={isAIEnabled && contentItems.length >= 2 ? '' : watchlistName}
            data={contentItems}
            onItemPress={handleItemPress}
            onSeeAllPress={() => handleViewAll(watchlistId, watchlistName)}
            isSeeAll={false}
            isLoading={itemsLoading}
          />
        </View>
      );
    },
  );

  const renderWatchlistRow = useCallback(
    ({item}: {item: {id: string; name: string}}) => {
      return <WatchlistRow watchlistId={item.id} watchlistName={item.name} />;
    },
    [handleItemPress, handleViewAll],
  );

  const renderEmpty = useCallback(() => {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No Watchlists Yet</Text>
        <Text style={styles.emptyText}>
          Create your first watchlist to start organizing your favorite movies
          and shows
        </Text>
        <GradientButton
          onPress={() =>
            navigation.navigate('Main', {
              screen: 'MySpace',
              params: {screen: 'WatchlistsScreen'},
            })
          }
          title="Create Your First Watchlist"
          isIcon={false}
          style={{borderRadius: borderRadius.round, marginTop: spacing.lg}}
        />
      </View>
    );
  }, [navigation]);

  const keyExtractor = useCallback(
    (item: {id: string; name: string}) => item.id,
    [],
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading watchlists...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={watchlists}
        renderItem={renderWatchlistRow}
        keyExtractor={keyExtractor}
        ListHeaderComponent={<AllWatchlistsAnalyzer />}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      />

      {/* Quick Decision Modal */}
      <QuickDecision
        visible={showQuickDecision}
        onClose={() => setShowQuickDecision(false)}
        items={selectedItemsForComparison}
        onSelectItem={handleItemPress}
      />
    </View>
  );
};
