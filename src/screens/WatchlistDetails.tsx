import React, {useCallback} from 'react';
import {View, Text, StyleSheet, FlatList, TouchableOpacity} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {MySpaceStackParamList} from '../types/navigation';
import {colors, spacing, typography} from '../styles/theme';
import {
  useWatchlistItems,
  useRemoveFromWatchlist,
} from '../hooks/useWatchlists';
import {ContentCard} from '../components/ContentCard';
import {Movie} from '../types/movie';
import {TVShow} from '../types/tvshow';
import {ContentItem} from '../components/MovieList';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {HorizontalListSkeleton} from '../components/LoadingSkeleton';
import {useNavigationState} from '../hooks/useNavigationState';

type WatchlistDetailsScreenNavigationProp =
  NativeStackNavigationProp<MySpaceStackParamList>;

interface WatchlistDetailsScreenProps {
  route: {
    params: {
      watchlistId: string;
    };
  };
}

export const WatchlistDetailsScreen: React.FC<WatchlistDetailsScreenProps> = ({
  route,
}) => {
  const navigation = useNavigation<WatchlistDetailsScreenNavigationProp>();
  const {watchlistId} = route.params;
  const {navigateWithLimit} = useNavigationState();

  const {data: watchlistItems = [], isLoading} = useWatchlistItems(watchlistId);
  const removeFromWatchlistMutation = useRemoveFromWatchlist();

  const handleItemPress = useCallback(
    (item: ContentItem) => {
      if (item.type === 'movie') {
        navigateWithLimit('MovieDetails', {
          movie: item as Movie,
        });
      } else {
        navigateWithLimit('TVShowDetails', {
          show: item as TVShow,
        });
      }
    },
    [navigateWithLimit],
  );

  const handleRemoveItem = useCallback(
    async (itemId: number) => {
      try {
        await removeFromWatchlistMutation.mutateAsync({
          watchlistId,
          itemId,
        });
      } catch (error) {
        console.error('Error removing item from watchlist:', error);
      }
    },
    [watchlistId, removeFromWatchlistMutation],
  );

  const renderItem = useCallback(
    ({item}: {item: any}) => (
      <View style={styles.itemContainer}>
        <ContentCard item={item} onPress={handleItemPress} />
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveItem(item.id)}>
          <Ionicons name="close-circle" size={24} color={colors.status.error} />
        </TouchableOpacity>
      </View>
    ),
    [handleItemPress, handleRemoveItem],
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Watchlist</Text>
          <View style={styles.placeholder} />
        </View>
        <HorizontalListSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Watchlist</Text>
        <View style={styles.placeholder} />
      </View>

      {watchlistItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="list-outline" size={64} color={colors.text.muted} />
          <Text style={styles.emptyTitle}>No items in watchlist</Text>
          <Text style={styles.emptySubtitle}>
            Add movies and TV shows to your watchlist to see them here
          </Text>
        </View>
      ) : (
        <FlatList
          data={watchlistItems}
          renderItem={renderItem}
          keyExtractor={item => `${item.id}-${item.type}`}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={10}
          getItemLayout={undefined}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.secondary,
  },
  title: {
    color: colors.text.primary,
    ...typography.h2,
  },
  placeholder: {
    width: 24,
  },
  listContent: {
    padding: spacing.md,
  },
  itemContainer: {
    marginBottom: spacing.md,
  },
  removeButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    color: colors.text.primary,
    ...typography.h3,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    color: colors.text.secondary,
    ...typography.body1,
    textAlign: 'center',
  },
});
