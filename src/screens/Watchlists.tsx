import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import {BlurView} from '@react-native-community/blur';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {
  useWatchlists,
  useCreateWatchlist,
  useWatchlistItems,
  useDeleteWatchlist,
} from '../hooks/useWatchlists';
import {HorizontalList} from '../components/HorizontalList';
import {ContentItem} from '../components/MovieList';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {MySpaceStackParamList} from '../types/navigation';
import {Movie} from '../types/movie';
import {TVShow} from '../types/tvshow';
import CreateButton from '../components/createButton';
import {modalStyles} from '../styles/styles';

type WatchlistsScreenNavigationProp =
  NativeStackNavigationProp<MySpaceStackParamList>;

const WatchlistSection: React.FC<{
  watchlistId: string;
  watchlistName: string;
  itemCount: number;
  onWatchlistPress: (watchlistId: string, watchlistName: string) => void;
  onItemPress: (item: ContentItem) => void;
}> = ({
  watchlistId,
  watchlistName,
  itemCount,
  onWatchlistPress,
  onItemPress,
}) => {
  const {data: items = [], isLoading} = useWatchlistItems(watchlistId);

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

  return (
    <View style={styles.watchlistSection}>
      <View style={styles.watchlistHeader}>
        <View style={styles.watchlistInfo}>
          <Text style={styles.watchlistName}>{watchlistName}</Text>
          {/* <Text style={styles.watchlistCount}>
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </Text> */}
        </View>
        <TouchableOpacity
          onPress={() => {
            onWatchlistPress(watchlistId, watchlistName);
          }}>
          <Ionicons name="close" size={20} color={colors.text.muted} />
        </TouchableOpacity>
      </View>

      {contentItems.length > 0 ? (
        <View style={styles.watchlistContent}>
          <HorizontalList
            title=""
            data={contentItems}
            onItemPress={onItemPress}
            isLoading={isLoading}
            isSeeAll={false}
          />
        </View>
      ) : (
        <View style={styles.emptyWatchlist}>
          <Text style={styles.emptyWatchlistTitle}>
            No items in this watchlist
          </Text>
        </View>
      )}
    </View>
  );
};

export const WatchlistsScreen: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState('');

  const {data: watchlists = [], isLoading} = useWatchlists();
  const createWatchlistMutation = useCreateWatchlist();
  const deleteWatchlistMutation = useDeleteWatchlist();
  const navigation = useNavigation<WatchlistsScreenNavigationProp>();

  const handleCreateWatchlist = async () => {
    if (!newWatchlistName.trim()) {
      Alert.alert('Error', 'Please enter a watchlist name');
      return;
    }

    try {
      await createWatchlistMutation.mutateAsync(newWatchlistName);
      setNewWatchlistName('');
      setShowCreateModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to create watchlist');
    }
  };

  const handleWatchlistPress = (watchlistId: string, watchlistName: string) => {
    // navigation.navigate('WatchlistDetails', {
    //   watchlistId,
    // });
    deleteWatchlistMutation.mutate(watchlistId);
  };

  const handleItemPress = (item: ContentItem) => {
    if (item.type === 'movie') {
      navigation.navigate('MovieDetails', {movie: item as Movie});
    } else {
      navigation.navigate('TVShowDetails', {show: item as TVShow});
    }
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setNewWatchlistName('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Watchlists</Text>
        {!showCreateModal && (
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => {
              setShowCreateModal(true);
            }}>
            <Ionicons name="add" size={24} color={colors.text.primary} />
            <Text style={styles.createButtonText}>Create New</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {watchlists.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No Watchlists Yet</Text>
            <Text style={styles.emptyStateText}>
              Create your first watchlist to start organizing your favorite
              movies and shows
            </Text>
            <CreateButton
              onPress={() => {
                setShowCreateModal(true);
              }}
              title="Create Your First Watchlist"
              icon="add"
            />
          </View>
        ) : (
          watchlists.map(watchlist => (
            <WatchlistSection
              key={watchlist.id}
              watchlistId={watchlist.id}
              watchlistName={watchlist.name}
              itemCount={watchlist.itemCount}
              onWatchlistPress={handleWatchlistPress}
              onItemPress={handleItemPress}
            />
          ))
        )}
      </ScrollView>

      <Modal
        visible={showCreateModal}
        animationType="slide"
        statusBarTranslucent={true}
        transparent={true}
        onRequestClose={handleCloseModal}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <BlurView
              style={StyleSheet.absoluteFill}
              blurType="dark"
              blurAmount={10}
              overlayColor={colors.modal.blur}
              reducedTransparencyFallbackColor={colors.modal.blur}
            />

            <View style={modalStyle.modalHeader}>
              <Text style={modalStyle.modalTitle}>Create New Watchlist</Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <View style={modalStyle.scrollContent}>
              <Text style={modalStyle.sectionTitle}>Watchlist Name</Text>
              <TextInput
                style={[
                  modalStyle.input,
                  {marginBottom: spacing.lg, height: 50, marginTop: spacing.sm},
                ]}
                value={newWatchlistName}
                onChangeText={setNewWatchlistName}
                placeholder="Enter watchlist name"
                placeholderTextColor={colors.text.muted}
                autoFocus
              />
              <View style={modalStyle.footer}>
                <TouchableOpacity
                  style={[modalStyle.footerButton, modalStyle.resetButton]}
                  onPress={handleCloseModal}>
                  <Text style={modalStyle.resetButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[modalStyle.footerButton, modalStyle.applyButton]}
                  onPress={handleCreateWatchlist}
                  disabled={createWatchlistMutation.isPending}>
                  <Text style={modalStyle.applyButtonText}>
                    {createWatchlistMutation.isPending
                      ? 'Creating...'
                      : 'Create'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.xxl,
    height: 100,
  },
  backButton: {
    padding: spacing.sm,
    marginRight: spacing.sm,
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    height: 40,
    backgroundColor: colors.modal.blur,
  },
  createButtonText: {
    ...typography.body2,
    color: colors.text.primary,
    fontWeight: '600',
  },
  content: {
    paddingTop: spacing.md,
  },
  watchlistSection: {},
  watchlistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    zIndex: 10,
    position: 'relative',
  },
  watchlistInfo: {
    flex: 1,
  },
  watchlistName: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  watchlistCount: {
    ...typography.body2,
    color: colors.text.secondary,
  },
  watchlistContent: {
    marginTop: -40,
    zIndex: 1,
  },
  emptyState: {
    flex: 1,
    height: 600,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  emptyStateTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptyStateText: {
    ...typography.body2,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  emptyStateButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  emptyStateButtonText: {
    ...typography.body2,
    color: colors.text.primary,
    fontWeight: '600',
  },
  emptyWatchlist: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  emptyWatchlistTitle: {
    ...typography.body2,
    color: colors.text.muted,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.xl,
  },
  modalContent: {
    marginTop: 60,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    overflow: 'hidden',
    width: '90%',
    height: 300,
    borderRadius: borderRadius.xl,
  },
});

const modalStyle: any = modalStyles;
