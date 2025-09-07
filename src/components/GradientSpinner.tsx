import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  ActivityIndicator,
  Animated,
} from 'react-native';

interface GradientSpinnerProps {
  size?: number;
  thickness?: number;
  colors?: string[];
  style?: ViewStyle;
  mode?: 'default' | 'light' | 'ultraLight';
  isVisible?: boolean; // do not render or animate when false
  deferStart?: boolean; // start after interactions (smooth scroll)
  durationMs?: number; // rotation duration
  color?: string;
}

const GradientSpinnerComponent: React.FC<GradientSpinnerProps> = ({
  size = 60,
  thickness = 6,
  colors = ['#fff', '#fff', 'transparent'],
  style,
  mode = 'default',
  isVisible = true,
  deferStart = false,
  durationMs = 1000,
  color = '#fff',
}) => {
  return (
    <ActivityIndicator
      color={color}
      size={size}
      style={[{borderRadius: 20}, style]}
    />
  );
};

export const GradientSpinner = React.memo(GradientSpinnerComponent);
