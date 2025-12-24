import React from 'react';
import {View, Text, Modal, StyleSheet, TouchableOpacity} from 'react-native';
import {BlurView} from '@react-native-community/blur';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import Icon from 'react-native-vector-icons/Ionicons';
import {GradientButton} from './GradientButton';

interface ScheduledDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  onReschedule: () => void;
  onRemove: () => void;
  title: string;
  date: Date | null;
}

export const ScheduledDetailsModal: React.FC<ScheduledDetailsModalProps> = ({
  visible,
  onClose,
  onReschedule,
  onRemove,
  title,
  date,
}) => {
  if (!date) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType="dark"
          blurAmount={10}
          reducedTransparencyFallbackColor="black"
        />
        <View style={styles.contentContainer}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Icon name="close" size={24} color={colors.text.primary} />
          </TouchableOpacity>

          <View style={styles.iconContainer}>
            <Icon name="checkmark-circle" size={48} color={colors.primary} />
          </View>

          <Text style={styles.title}>Scheduled!</Text>
          <Text style={styles.subtitle}>
            You have scheduled to watch "{title}" on:
          </Text>

          <View style={styles.dateContainer}>
            <Icon name="calendar" size={20} color={colors.text.secondary} />
            <Text style={styles.dateText}>
              {date.toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>
          <View style={styles.dateContainer}>
            <Icon name="time" size={20} color={colors.text.secondary} />
            <Text style={styles.dateText}>
              {date.toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>

          <View style={styles.actions}>
            <GradientButton
              title="Reschedule"
              onPress={() => {
                onClose();
                onReschedule();
              }}
              style={styles.button}
              isIcon={false}
            />

            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => {
                onClose();
                onRemove();
              }}>
              <Text style={styles.removeText}>Remove Schedule</Text>
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: spacing.md,
  },
  contentContainer: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.modal.border,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
    zIndex: 1,
  },
  iconContainer: {
    marginBottom: spacing.md,
    backgroundColor: 'rgba(170, 78, 255, 0.1)',
    padding: spacing.md,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: 'rgba(170, 78, 255, 0.3)',
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body2,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
    backgroundColor: colors.background.tertiary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: borderRadius.md,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.modal.border,
  },
  dateText: {
    ...typography.body1,
    color: colors.text.primary,
    fontWeight: '500',
  },
  actions: {
    width: '100%',
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  button: {
    width: '100%',
  },
  removeButton: {
    padding: spacing.md,
    alignItems: 'center',
  },
  removeText: {
    color: colors.status.error,
    fontWeight: '600',
  },
});
