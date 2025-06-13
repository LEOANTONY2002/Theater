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
    <TouchableOpacity
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: spacing.md,
      }}
      onPress={onPress}>
      <LinearGradient
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        colors={colors.gradient.tertiary}
        style={[
          styles.addButton,
          {height: 60, borderRadius: borderRadius.round},
        ]}>
        <Ionicons name={icon} size={25} color={colors.background.secondary} />
        <Text
          style={{
            ...typography.button,
            paddingRight: spacing.sm,
            color: colors.background.secondary,
          }}>
          {title}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    height: 40,
  },
});

export default createButton;
