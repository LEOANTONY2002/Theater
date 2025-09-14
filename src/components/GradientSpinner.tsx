import React, {useEffect, useState} from 'react';
import {ViewStyle, ActivityIndicator, Platform} from 'react-native';

interface GradientSpinnerProps {
  size?: number | 'small' | 'large';
  colors?: string[];
  style?: ViewStyle;
  color?: string;
}

export const GradientSpinner: React.FC<GradientSpinnerProps> = ({
  size = 60,
  colors,
  style,
  color = '#fff',
}) => {
  const [currentColor, setCurrentColor] = useState<string>(
    (colors && colors.length > 0 ? colors[0] : color) || color,
  );

  useEffect(() => {
    // If at least two colors are provided, alternate between the first two.
    if (colors && colors.length >= 2) {
      const id = setInterval(() => {
        setCurrentColor(prev => (prev === colors[0] ? colors[1] : colors[0]));
      }, 1200);
      return () => clearInterval(id);
    }

    // If only one color or none is provided, ensure we stick to a valid color
    setCurrentColor(colors && colors.length > 0 ? colors[0] : color);
    return () => {};
  }, [colors, color]);

  // On Android, ActivityIndicator only supports 'small' | 'large'
  const mappedSize = (() => {
    if (Platform.OS !== 'android') return size as any;
    if (typeof size === 'string') return size;
    // Map numeric size to small/large heuristically
    if (typeof size === 'number') return size > 30 ? 'large' : 'small';
    return 'small';
  })();

  return (
    <ActivityIndicator
      color={currentColor}
      size={mappedSize}
      style={[{borderRadius: 50}, style]}
    />
  );
};
