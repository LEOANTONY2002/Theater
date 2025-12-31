import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import {BlurView} from '@react-native-community/blur';
import Icon from 'react-native-vector-icons/Ionicons';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {useResponsive} from '../hooks/useResponsive';
import {GradientButton} from './GradientButton';

interface PermissionModalProps {
  visible: boolean;
  onClose: () => void;
  onContinue: () => void;
  onRequestPermission?: () => Promise<boolean>;
  showSkipOption?: boolean;
}

export const PermissionModal: React.FC<PermissionModalProps> = ({
  visible,
  onClose,
  onContinue,
  onRequestPermission,
  showSkipOption = true,
}) => {
  const {isTablet} = useResponsive();

  const handlePrimaryAction = async () => {
    if (onRequestPermission) {
      const granted = await onRequestPermission();
      if (granted) {
        onClose();
        return;
      }
    }
    // If no request function or request denied, open settings
    Linking.openSettings();
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      statusBarTranslucent={true}
      transparent
      animationType="fade"
      backdropColor={colors.modal.blurDark}
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType="dark"
          blurAmount={10}
          overlayColor={colors.modal.blurDark}
        />
        <View
          style={[
            styles.contentContainer,
            {
              padding: isTablet ? spacing.xl : spacing.md,
              margin: isTablet ? spacing.xl : spacing.xl,
            },
          ]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft} />
            <View style={styles.headerRight}>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                style={styles.closeButton}>
                <Icon name="close" size={15} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Icon */}
          <View style={styles.iconContainer}>
            <Icon
              name="notifications-off-outline"
              size={40}
              color={colors.accent}
            />
          </View>

          <Text style={styles.headerTitle}>Enable Notifications</Text>

          {/* Description */}
          <Text style={styles.description}>
            Turn on notifications to get updates regarding your favorite movies
            and shows.
          </Text>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={handlePrimaryAction}
              style={styles.actionButton}>
              <Text style={{...typography.button, fontWeight: 'bold'}}>
                Turn On Notifications
              </Text>
            </TouchableOpacity>

            {showSkipOption && (
              <TouchableOpacity
                onPress={() => {
                  onContinue();
                  onClose();
                }}
                style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>
                  Continue without Alert
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  contentContainer: {
    width: '95%',
    maxWidth: 400,
    backgroundColor: colors.modal.blur,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.modal.header,
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    width: '100%',
  },
  headerLeft: {
    width: 40,
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text.primary,
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 40,
    height: 40,
    borderRadius: borderRadius.round,
    backgroundColor: colors.modal.blur,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.modal.header,
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: spacing.md,
    backgroundColor: colors.modal.blur,
    opacity: 0.5,
    padding: spacing.lg,
    borderRadius: borderRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: {
    ...typography.body1,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  actions: {
    width: '100%',
    gap: spacing.md,
  },
  actionButton: {
    width: '100%',
    borderRadius: borderRadius.round,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    margin: spacing.sm,
  },
  secondaryButton: {
    width: '100%',
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.round,
    borderWidth: 1,
    backgroundColor: colors.modal.blur,
    borderBottomWidth: 0,
    borderColor: colors.modal.header,
  },
  secondaryButtonText: {
    ...typography.button,
    color: colors.text.primary,
    fontSize: 14,
  },
});
