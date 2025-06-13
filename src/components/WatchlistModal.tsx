import React, {useState} from 'react';
import {
  View,
  Modal,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import {BlurView} from '@react-native-community/blur';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors, spacing, borderRadius, typography} from '../styles/theme';
import {
  useWatchlists,
  useCreateWatchlist,
  useAddToWatchlist,
} from '../hooks/useWatchlists';
import {Watchlist} from '../store/watchlists';
import {Movie} from '../types/movie';
import {TVShow} from '../types/tvshow';

interface WatchlistModalProps {
  visible: boolean;
  onClose: () => void;
  item: Movie | TVShow;
  itemType: 'movie' | 'tv';
}

export const WatchlistModal: React.FC<WatchlistModalProps> = ({
  visible,
  onClose,
  item,
  itemType,
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState('');

  const {data: watchlists = [], isLoading} = useWatchlists();
  const createWatchlistMutation = useCreateWatchlist();
  const addToWatchlistMutation = useAddToWatchlist();

  const handleAddToWatchlist = async (watchlist: Watchlist) => {
    try {
      await addToWatchlistMutation.mutateAsync({
        watchlistId: watchlist.id,
        item,
        itemType,
      });
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to add to watchlist');
    }
  };

  const handleCreateWatchlist = async () => {
    if (!newWatchlistName.trim()) {
      Alert.alert('Error', 'Please enter a watchlist name');
      return;
    }

    try {
      const newWatchlist = await createWatchlistMutation.mutateAsync(
        newWatchlistName,
      );
      await addToWatchlistMutation.mutateAsync({
        watchlistId: newWatchlist.id,
        item,
        itemType,
      });
      setNewWatchlistName('');
      setShowCreateForm(false);
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to create watchlist');
    }
  };

  const handleClose = () => {
    setShowCreateForm(false);
    setNewWatchlistName('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent={true}
      transparent={true}
      onRequestClose={handleClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType="dark"
            blurAmount={10}
            overlayColor="rgba(23, 17, 42, 0.87)"
            reducedTransparencyFallbackColor="rgba(0, 0, 0, 0.5)"
          />

          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {showCreateForm ? 'Create New Watchlist' : 'Add to Watchlist'}
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            {showCreateForm ? (
              <View style={styles.createForm}>
                <Text style={styles.formLabel}>Watchlist Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={newWatchlistName}
                  onChangeText={setNewWatchlistName}
                  placeholder="Enter watchlist name"
                  placeholderTextColor={colors.text.muted}
                  autoFocus
                />
                <View style={styles.formButtons}>
                  <TouchableOpacity
                    style={[styles.button, styles.cancelButton]}
                    onPress={() => setShowCreateForm(false)}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, styles.createButton]}
                    onPress={handleCreateWatchlist}
                    disabled={
                      createWatchlistMutation.isPending ||
                      addToWatchlistMutation.isPending
                    }>
                    <Text style={styles.createButtonText}>
                      {createWatchlistMutation.isPending ||
                      addToWatchlistMutation.isPending
                        ? 'Creating...'
                        : 'Create & Add'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <ScrollView style={styles.watchlistList}>
                {watchlists.map(watchlist => (
                  <TouchableOpacity
                    key={watchlist.id}
                    style={styles.watchlistItem}
                    onPress={() => handleAddToWatchlist(watchlist)}>
                    <View style={styles.watchlistInfo}>
                      <Text style={styles.watchlistName}>{watchlist.name}</Text>
                      <Text style={styles.watchlistCount}>
                        {watchlist.itemCount}{' '}
                        {watchlist.itemCount === 1 ? 'item' : 'items'}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={colors.text.secondary}
                    />
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  style={styles.createNewButton}
                  onPress={() => setShowCreateForm(true)}>
                  <Ionicons
                    name="add-circle-outline"
                    size={24}
                    color={colors.accent}
                  />
                  <Text style={styles.createNewText}>Create New Watchlist</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(1, 19, 46, 0.1)',
  },
  modalContent: {
    flex: 1,
    marginTop: 60,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(170, 78, 255, 0.15)',
    backgroundColor: 'rgba(1, 19, 46, 0.1)',
  },
  modalTitle: {
    color: colors.text.primary,
    ...typography.h2,
  },
  modalBody: {
    flex: 1,
    padding: spacing.md,
  },
  watchlistList: {
    flex: 1,
  },
  watchlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.secondary,
  },
  watchlistInfo: {
    flex: 1,
  },
  watchlistName: {
    color: colors.text.primary,
    ...typography.body1,
    fontWeight: '600',
  },
  watchlistCount: {
    color: colors.text.secondary,
    ...typography.body2,
    marginTop: spacing.xs,
  },
  createNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  createNewText: {
    color: colors.accent,
    ...typography.body1,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  createForm: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  formLabel: {
    color: colors.text.primary,
    ...typography.body1,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  textInput: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text.primary,
    ...typography.body1,
    marginBottom: spacing.lg,
  },
  formButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.background.secondary,
  },
  cancelButtonText: {
    color: colors.text.primary,
    ...typography.body1,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: colors.accent,
  },
  createButtonText: {
    color: colors.background.primary,
    ...typography.body1,
    fontWeight: '600',
  },
});
