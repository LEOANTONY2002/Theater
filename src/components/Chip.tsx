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
    padding: spacing.md,
    borderRadius: 10,
    backgroundColor: colors.modal.content,
    borderWidth: 1,
    borderColor: colors.modal.border,
    margin: 2,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedChip: {
    backgroundColor: colors.modal.active,
    borderColor: colors.modal.activeBorder,
  },
  label: {
    color: colors.text.secondary,
    ...typography.body2,
    textAlign: 'center',
  },
  selectedLabel: {
    color: colors.accent,
  },
});
