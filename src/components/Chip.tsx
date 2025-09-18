import React from 'react';
import {TouchableOpacity, Text, StyleSheet, Image, View} from 'react-native';
import {colors, spacing, borderRadius, typography} from '../styles/theme';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  imageUrl?: string;
  imageOnly?: boolean;
  width?: number;
  height?: number;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  selected,
  onPress,
  imageUrl,
  imageOnly = false,
  width = 120,
  height = 100,
}) => {
  const styles = StyleSheet.create({
    chip: {
      backgroundColor: colors.modal.blur,
      borderRadius: borderRadius.lg,
      width: width,
      height: height,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      padding: spacing.md,
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
      zIndex: 2,
    },
    selectedLabel: {
      color: colors.accent,
      fontFamily: 'Inter_18pt-Regular',
    },
  });

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[
        styles.chip,
        selected && styles.selectedChip,
        imageOnly && styles.imageOnlyChip,
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
        <>
          <Text
            style={{
              position: 'absolute',
              zIndex: 1,
              color: colors.text.primary,
              opacity: 0.08,
              fontSize: 60,
              fontWeight: '900',
              fontFamily: 'Inter_28pt-ExtraBold',
            }}>
            {label?.slice(0, 2).toString()}
          </Text>
          <Text style={[styles.label, selected && styles.selectedLabel]}>
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};
