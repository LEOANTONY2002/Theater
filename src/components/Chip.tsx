import React from 'react';
import {TouchableOpacity, Text, StyleSheet, Image, View} from 'react-native';
import {colors, spacing, borderRadius, typography} from '../styles/theme';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  imageUrl?: string;
  imageOnly?: boolean;
}

export const Chip: React.FC<ChipProps> = ({label, selected, onPress, imageUrl, imageOnly = false}) => {
  return (
    <TouchableOpacity
      style={[
        styles.chip, 
        selected && styles.selectedChip,
        imageOnly && styles.imageOnlyChip
      ]}
      onPress={onPress}>
      {imageUrl ? (
        <View style={styles.chipContent}>
          <Image 
            source={{uri: `https://image.tmdb.org/t/p/w92${imageUrl}`}} 
            style={styles.chipImage}
            resizeMode="contain"
          />
          {!imageOnly && (
            <Text style={[styles.label, selected && styles.selectedLabel]}>
              {label}
            </Text>
          )}
        </View>
      ) : (
        <Text style={[styles.label, selected && styles.selectedLabel]}>
          {label}
        </Text>
      )}
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
  imageOnlyChip: {
    padding: spacing.sm,
    minWidth: 60,
    minHeight: 60,
  },
  selectedChip: {
    backgroundColor: colors.modal.active,
    borderColor: colors.modal.activeBorder,
  },
  chipContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  label: {
    color: colors.text.secondary,
    ...typography.body2,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  selectedLabel: {
    color: colors.accent,
  },
});
