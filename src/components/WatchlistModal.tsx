import React, {useState, useEffect} from 'react';
import {
  View,
  Modal,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Keyboard,
  Platform,
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
import {modalStyles} from '../styles/styles';
import CreateButton from './createButton';
import {useResponsive} from '../hooks/useResponsive';
import {Chip} from './Chip';
import {MaybeBlurView} from './MaybeBlurView';

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
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const {data: watchlists = [], isLoading} = useWatchlists();
  const createWatchlistMutation = useCreateWatchlist();
  const addToWatchlistMutation = useAddToWatchlist();
  const {isTablet} = useResponsive();

  // Handle keyboard show/hide events with height
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      event => {
        setKeyboardHeight(event.endCoordinates.height);
      },
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      },
    );

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

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
      backdropColor={colors.modal.blurDark}
      statusBarTranslucent={true}
      onRequestClose={handleClose}>
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={handleClose}>
        <View style={styles.modalContainer}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {}}
            style={[
              styles.modalContent,
              keyboardHeight > 0 && {
                marginTop: 0,
                marginBottom: keyboardHeight,
              },
            ]}>
            <MaybeBlurView
              style={StyleSheet.absoluteFill}
              blurType="dark"
              blurAmount={10}
              dialog
              radius={borderRadius.xl}
              overlayColor={colors.modal.blurDark}
            />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add to Watchlist</Text>
              <TouchableOpacity onPress={handleClose}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {showCreateForm ? (
                <View style={styles.createForm}>
                  <Text style={modalStyles.sectionTitle}>Watchlist Name</Text>
                  <TextInput
                    style={[
                      modalStyles.input,
                      {
                        marginBottom: 120,
                        height: 50,
                        marginTop: spacing.sm,
                      },
                    ]}
                    value={newWatchlistName}
                    onChangeText={setNewWatchlistName}
                    placeholder="Enter watchlist name"
                    placeholderTextColor={colors.text.muted}
                    autoFocus
                  />
                  <View
                    style={[
                      modalStyles.footer,
                      {
                        marginBottom: 20,
                        marginHorizontal: isTablet ? '25%' : spacing.md,
                      },
                    ]}>
                    <TouchableOpacity
                      style={[
                        modalStyles.footerButton,
                        modalStyles.resetButton,
                      ]}
                      onPress={() => setShowCreateForm(false)}>
                      <Text style={modalStyles.resetButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        modalStyles.footerButton,
                        modalStyles.applyButton,
                      ]}
                      onPress={handleCreateWatchlist}
                      disabled={
                        createWatchlistMutation.isPending ||
                        addToWatchlistMutation.isPending
                      }>
                      <Text style={modalStyles.applyButtonText}>
                        {createWatchlistMutation.isPending ||
                        addToWatchlistMutation.isPending
                          ? 'Creating...'
                          : 'Create & Add'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : watchlists.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{gap: spacing.md}}
                  style={styles.watchlistList}>
                  {watchlists.map(watchlist => (
                    <Chip
                      key={watchlist?.id}
                      label={watchlist.name}
                      onPress={() => handleAddToWatchlist(watchlist)}
                      selected={false}
                      width={150}
                      height={150}
                    />
                  ))}

                  <TouchableOpacity
                    style={styles.createNewButton}
                    onPress={() => setShowCreateForm(true)}>
                    <Ionicons
                      name="add"
                      size={24}
                      color={colors.text.secondary}
                    />
                    <Text style={styles.createNewText}>New Watchlist</Text>
                  </TouchableOpacity>
                </ScrollView>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateTitle}>No Watchlists Yet</Text>
                  <Text style={styles.emptyStateText}>
                    Create your first watchlist to start organizing your
                    favorite movies and shows
                  </Text>
                  <CreateButton
                    onPress={() => {
                      setShowCreateForm(true);
                    }}
                    title="Create Your First Watchlist"
                    icon="add"
                  />
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
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
    borderBottomColor: colors.background.secondary,
  },
  modalTitle: {
    color: colors.text.primary,
    ...typography.h2,
  },
  modalBody: {
    paddingVertical: spacing.md,
  },
  watchlistList: {
    paddingHorizontal: spacing.md,
  },
  watchlistItem: {
    width: 150,
    height: 150,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.modal.blur,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.modal.border,
  },
  watchlistGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.5,
    height: 150,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
  },
  watchlistName: {
    color: colors.text.tertiary,
    ...typography.h1,
    fontWeight: '900',
  },
  watchlistCount: {
    color: colors.text.tertiary,
    ...typography.body2,
    marginTop: spacing.xs,
  },
  createNewButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    width: 150,
    height: 150,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.background.secondary,
    opacity: 0.5,
    marginRight: spacing.xl,
  },
  createNewText: {
    color: colors.text.secondary,
    ...typography.body1,
  },
  createForm: {
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
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    paddingVertical: 100,
  },
  emptyStateTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptyStateText: {
    ...typography.body2,
    color: colors.text.secondary,
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
});

export default WatchlistModal;
