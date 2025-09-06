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
  icon: string | null;
}) => {
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
      paddingVertical: 0,
      paddingHorizontal: spacing.md,
      height: 40,
      borderRadius: borderRadius.round,
    },
    addButtonText: {
      ...typography.button,
      fontSize: 12,
      paddingRight: icon ? spacing.sm : 0,
      color: colors.text.primary,
    },
  });

  return (
    <TouchableOpacity style={styles.addButtonContainer} onPress={onPress}>
      <LinearGradient
        start={{x: 0.5, y: 0.5}}
        end={{x: 1, y: 1}}
        colors={colors.gradient.tertiary}
        style={styles.addButton}>
        {icon && <Ionicons name={icon} size={20} color={colors.text.primary} />}
        <Text style={styles.addButtonText}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

export default createButton;
