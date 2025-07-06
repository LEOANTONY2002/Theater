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
}

export const GradientButton: React.FC<GradientButtonProps> = ({
  onPress,
  title,
  style,
  textStyle,
  disabled = false,
  fullWidth = true,
  isIcon = true,
}) => {
  const styles = StyleSheet.create({
    container: {
      borderRadius: borderRadius.round,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
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
      color: colors.text.primary,
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
    },
    disabled: {
      opacity: 0.6,
    },
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.container,
        disabled && styles.disabled,
        {width: fullWidth ? '100%' : 200},
      ]}>
      <LinearGradient
        colors={[colors.primary, colors.secondary]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 0}}
        style={[styles.button, style]}>
        {isIcon && (
          <Ionicon name="play" size={24} color={colors.text.primary} />
        )}
        <Text style={[styles.text, textStyle]}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};
