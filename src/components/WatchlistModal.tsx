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
import {BlurPreference} from '../store/blurPreference';

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
  const themeMode = BlurPreference.getMode();
  const isSolid = themeMode === 'normal';

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

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: isSolid ? 'rgba(0, 0, 0, 0.5)' : 'transparent',
    },
    modalContainer: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    modalContent: {
      margin: isTablet ? spacing.xl : spacing.md,
      borderRadius: borderRadius.xl,
      backgroundColor: 'transparent',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.md,
      marginBottom: isTablet ? spacing.lg : spacing.md,
      borderRadius: borderRadius.round,
      borderWidth: 1,
      borderColor: isSolid ? colors.modal.blur : colors.modal.border,
      backgroundColor: isSolid ? 'black' : colors.modal.content,
      zIndex: 1,
    },
    modalTitle: {
      color: colors.text.primary,
      ...typography.h3,
    },
    modalBodyWrapper: {
      minHeight: showCreateForm ? 200 : 180,
      maxHeight: 400,
      borderRadius: borderRadius.xl,
      borderWidth: isSolid ? 0 : 1,
      borderColor: isSolid ? colors.modal.blur : colors.modal.content,
    },
    modalBody: {
      flex: 1,
      minHeight: showCreateForm ? 200 : 180,
      maxHeight: 400,
      borderRadius: borderRadius.xl,
      backgroundColor: isSolid ? 'black' : colors.modal.blur,
      paddingTop: showCreateForm && !isSolid ? spacing.md : 0,
      marginBottom: 190,
    },
    watchlistList: {
      padding: spacing.md,
    },
    watchlistItem: {
      width: 150,
      height: 150,
      borderRadius: borderRadius.xl,
      backgroundColor: isSolid ? colors.modal.blur : colors.modal.border,
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
      paddingTop: showCreateForm && isSolid ? spacing.md : 0,
      paddingBottom: spacing.md,
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
      paddingTop: 50,
    },
    emptyStateTitle: {
      ...typography.h3,
      color: colors.text.primary,
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      backdropColor={isSolid ? 'transparent' : colors.modal.blurDark}
      statusBarTranslucent={true}
      onRequestClose={handleClose}>
      {!isSolid && (
        <BlurView
          blurType="dark"
          blurAmount={10}
          overlayColor={colors.modal.blurDark}
          style={{
            flex: 1,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />
      )}
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={handleClose}>
        <View style={styles.modalContainer}>
          <View
            style={[
              styles.modalContent,
              keyboardHeight > 0 && {
                marginBottom: keyboardHeight,
              },
            ]}>
            <MaybeBlurView header>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                }}>
                <Ionicons
                  name="bookmarks"
                  size={20}
                  color={colors.text.muted}
                />
                <Text style={styles.modalTitle}>Add to Watchlist</Text>
              </View>
              <TouchableOpacity
                onPress={handleClose}
                style={{
                  padding: spacing.sm,
                  backgroundColor: colors.modal.blur,
                  borderRadius: borderRadius.round,
                  borderTopWidth: 1,
                  borderLeftWidth: 1,
                  borderRightWidth: 1,
                  borderColor: colors.modal.content,
                }}>
                <Ionicons name="close" size={20} color={colors.text.primary} />
              </TouchableOpacity>
            </MaybeBlurView>

            <MaybeBlurView
              body
              radius={borderRadius.xl}
              style={styles.modalBody}>
              {showCreateForm ? (
                <View style={styles.createForm}>
                  <Text style={modalStyles.sectionTitle}>Watchlist Name</Text>
                  <TextInput
                    style={[
                      modalStyles.input,
                      {
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
                    style={{
                      flexDirection: 'row',
                      gap: spacing.md,
                      marginTop: spacing.md,
                      marginHorizontal: isTablet ? '25%' : spacing.md,
                    }}>
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
                      isWatchlist={true}
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
                  <CreateButton
                    onPress={() => {
                      setShowCreateForm(true);
                    }}
                    title="Create Your First Watchlist"
                    icon="add"
                  />
                </View>
              )}
            </MaybeBlurView>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

export default WatchlistModal;
