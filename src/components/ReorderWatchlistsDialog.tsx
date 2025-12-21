import React, {useState, useEffect} from 'react';
import {
  View,
  Modal,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {MaybeBlurView} from './MaybeBlurView';
import {BlurView} from '@react-native-community/blur';
import {colors, spacing, borderRadius, typography} from '../styles/theme';
import {Watchlist} from '../store/watchlists';
import {useResponsive} from '../hooks/useResponsive';
import {BlurPreference} from '../store/blurPreference';
import {modalStyles} from '../styles/styles';

interface ReorderWatchlistsDialogProps {
  visible: boolean;
  onClose: () => void;
  watchlists: Watchlist[];
  onReorder: (reorderedWatchlists: Watchlist[]) => void;
}

export const ReorderWatchlistsDialog: React.FC<
  ReorderWatchlistsDialogProps
> = ({visible, onClose, watchlists, onReorder}) => {
  const [localWatchlists, setLocalWatchlists] = useState<Watchlist[]>([]);
  const {isTablet} = useResponsive();

  const themeMode = BlurPreference.getMode();
  const isSolid = themeMode === 'normal';

  useEffect(() => {
    if (visible) {
      setLocalWatchlists([...watchlists]);
    }
  }, [visible, watchlists]);

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newWatchlists = [...localWatchlists];
    const temp = newWatchlists[index];
    newWatchlists[index] = newWatchlists[index - 1];
    newWatchlists[index - 1] = temp;
    setLocalWatchlists(newWatchlists);
  };

  const moveDown = (index: number) => {
    if (index === localWatchlists.length - 1) return;
    const newWatchlists = [...localWatchlists];
    const temp = newWatchlists[index];
    newWatchlists[index] = newWatchlists[index + 1];
    newWatchlists[index + 1] = temp;
    setLocalWatchlists(newWatchlists);
  };

  const handleSave = () => {
    onReorder(localWatchlists);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent={true}
      transparent={true}
      onRequestClose={onClose}>
      {!isSolid && (
        <BlurView
          blurType="dark"
          blurAmount={10}
          overlayColor={colors.modal.blurDark}
          style={StyleSheet.absoluteFill}
        />
      )}

      <View
        style={{
          flex: 1,
          margin: isTablet ? spacing.xl : spacing.md,
          borderRadius: borderRadius.xl,
          backgroundColor: 'transparent',
        }}>
        {/* Header */}
        <MaybeBlurView
          header
          style={{
            marginTop: 20,
          }}>
          <View style={modalStyles.modalHeader}>
            <Text style={modalStyles.modalTitle}>Reorder Watchlists</Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
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

        <MaybeBlurView body style={{flex: 1}}>
          <View style={{flex: 1, padding: spacing.md}}>
            <ScrollView
              style={{flex: 1}}
              contentContainerStyle={{paddingBottom: 100}}>
              {localWatchlists.map((watchlist, index) => (
                <View key={watchlist.id} style={styles.itemContainer}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {watchlist.name}
                  </Text>
                  <View style={styles.controls}>
                    <TouchableOpacity
                      onPress={() => moveUp(index)}
                      disabled={index === 0}
                      style={[
                        styles.controlButton,
                        index === 0 && styles.disabledButton,
                      ]}>
                      <Ionicons
                        name="chevron-up"
                        size={20}
                        color={
                          index === 0 ? colors.text.muted : colors.text.primary
                        }
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => moveDown(index)}
                      disabled={index === localWatchlists.length - 1}
                      style={[
                        styles.controlButton,
                        index === localWatchlists.length - 1 &&
                          styles.disabledButton,
                      ]}>
                      <Ionicons
                        name="chevron-down"
                        size={20}
                        color={
                          index === localWatchlists.length - 1
                            ? colors.text.muted
                            : colors.text.primary
                        }
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Footer */}
            <View
              style={[
                modalStyles.footer,
                {
                  alignItems: 'center',
                  marginHorizontal: isTablet ? '25%' : spacing.md,
                },
              ]}>
              <TouchableOpacity
                style={[modalStyles.footerButton, modalStyles.resetButton]}
                onPress={onClose}>
                <Text style={modalStyles.resetButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[modalStyles.footerButton, modalStyles.saveButton]}
                onPress={handleSave}>
                <Text style={modalStyles.saveButtonText}>Save Order</Text>
              </TouchableOpacity>
            </View>
          </View>
        </MaybeBlurView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.modal.blur,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.modal.header,
  },
  itemName: {
    ...typography.body1,
    color: colors.text.primary,
    flex: 1,
    marginRight: spacing.md,
  },
  controls: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  controlButton: {
    padding: spacing.sm,
    backgroundColor: colors.modal.blur,
    borderRadius: borderRadius.sm,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.modal.header,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.3,
  },
});
