import React from 'react';
import {TouchableOpacity, Text, StyleSheet} from 'react-native';
import {colors, spacing, borderRadius, typography} from '../styles/theme';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export const Chip: React.FC<ChipProps> = ({label, selected, onPress}) => {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.selectedChip]}
      onPress={onPress}>
      <Text style={[styles.label, selected && styles.selectedLabel]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.round,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: spacing.xs,
  },
  selectedChip: {
    backgroundColor: colors.background.tertiary,
    borderColor: colors.accent,
  },
  label: {
    color: colors.text.secondary,
    ...typography.body2,
  },
  selectedLabel: {
    color: colors.accent,
  },
});
