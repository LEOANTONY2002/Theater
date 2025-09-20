import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {borderRadius, colors} from '../styles/theme';
import Ionicon from 'react-native-vector-icons/Ionicons';

interface GradientButtonProps {
  onPress: () => void;
  title: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
  fullWidth?: boolean;
  isIcon?: boolean;
  v2?: boolean;
}

export const GradientButton: React.FC<GradientButtonProps> = ({
  onPress,
  title,
  style,
  textStyle,
  disabled = false,
  fullWidth = true,
  isIcon = true,
  v2 = false,
}) => {
  const styles = StyleSheet.create({
    container: {
      borderRadius: borderRadius.round,
      flex: 1,
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    text: {
      color: !v2 ? colors.text.primary : colors.background.primary,
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
      fontFamily: 'Inter_18pt-Regular',
    },
    disabled: {
      opacity: 0.6,
    },
  });

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled}
      style={[styles.container, disabled && styles.disabled]}>
      <LinearGradient
        colors={
          !v2
            ? [colors.primary, colors.secondary]
            : ['rgb(255, 255, 255)', 'rgb(255, 255, 255)']
        }
        start={{x: 0, y: 0}}
        end={{x: 1, y: 0}}
        style={[styles.button, style]}>
        {isIcon && (
          <Ionicon
            name="play"
            size={24}
            color={!v2 ? colors.text.primary : colors.background.primary}
          />
        )}
        <Text style={[styles.text, textStyle]}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};
