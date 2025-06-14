import React from 'react';
import {StyleSheet, Text, TouchableOpacity} from 'react-native';
import {colors, spacing, typography} from '../styles/theme';
import LinearGradient from 'react-native-linear-gradient';
import {borderRadius} from '../styles/theme';
import Ionicons from 'react-native-vector-icons/Ionicons';

export const createButton = ({
  onPress,
  title,
  icon,
}: {
  onPress: () => void;
  title: string;
  icon: string;
}) => {
  return (
    <TouchableOpacity style={styles.addButtonContainer} onPress={onPress}>
      <LinearGradient
        start={{x: 0.5, y: 0.5}}
        end={{x: 1, y: 1}}
        colors={colors.gradient.tertiary}
        style={styles.addButton}>
        <Ionicons name={icon} size={25} color={colors.text.primary} />
        <Text style={styles.addButtonText}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  addButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    borderWidth: 0.5,
    borderColor: colors.text.tertiary,
    borderRadius: borderRadius.round,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    height: 60,
    borderRadius: borderRadius.round,
  },
  addButtonText: {
    ...typography.button,
    paddingRight: spacing.sm,
    color: colors.text.primary,
  },
});

export default createButton;
