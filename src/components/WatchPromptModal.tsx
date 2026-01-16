import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import {BlurView} from '@react-native-community/blur';
import Icon from 'react-native-vector-icons/Ionicons';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import {useResponsive} from '../hooks/useResponsive';
import {PendingWatch} from '../services/WatchTrackingService';
import LinearGradient from 'react-native-linear-gradient';

interface WatchPromptModalProps {
  visible: boolean;
  watch: PendingWatch | null;
  onWatched: () => void;
  onPartial: () => void;
  onDismiss: () => void;
}

export const WatchPromptModal: React.FC<WatchPromptModalProps> = ({
  visible,
  watch,
  onWatched,
  onPartial,
  onDismiss,
}) => {
  const {isTablet} = useResponsive();

  if (!watch) return null;

  const posterUrl = watch.posterPath
    ? `https://image.tmdb.org/t/p/w200${watch.posterPath}`
    : null;

  return (
    <Modal
      visible={visible}
      statusBarTranslucent={true}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}>
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
                onPress={onDismiss}
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                style={styles.closeButton}>
                <Icon name="close" size={15} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {posterUrl && (
              <Image source={{uri: posterUrl}} style={styles.poster} />
            )}

            <Text style={styles.title}>Did you watch it?</Text>
            <Text style={styles.subtitle}>
              You opened <Text style={styles.highlight}>{watch.title}</Text> on{' '}
              {watch.platform}
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <LinearGradient
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              colors={[colors.primary, colors.secondary]}
              style={{borderRadius: borderRadius.round}}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={onWatched}>
                <Icon name="checkmark" size={20} color={colors.text.primary} />
                <Text style={styles.primaryButtonText}>Yes, I watched it</Text>
              </TouchableOpacity>
            </LinearGradient>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onPartial}>
              <Icon name="time-outline" size={20} color={colors.text.primary} />
              <Text style={styles.secondaryButtonText}>Partially watched</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.tertiaryButton} onPress={onDismiss}>
              <Text style={styles.tertiaryButtonText}>Not yet</Text>
            </TouchableOpacity>
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
  content: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  poster: {
    width: 100,
    height: 150,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  icon: {
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body1,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  highlight: {
    color: colors.accent,
    fontWeight: '600',
  },
  actions: {
    width: '100%',
    gap: spacing.sm,
  },
  primaryButton: {
    width: '100%',
    borderRadius: borderRadius.round,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  primaryButtonText: {
    ...typography.button,
    color: colors.text.primary,
    fontWeight: '600',
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
    flexDirection: 'row',
    gap: spacing.xs,
  },
  secondaryButtonText: {
    ...typography.button,
    color: colors.text.primary,
    fontSize: 14,
  },
  tertiaryButton: {
    width: '100%',
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tertiaryButtonText: {
    ...typography.caption,
    color: colors.text.muted,
  },
});
