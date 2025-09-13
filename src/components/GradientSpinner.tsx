import React, {useEffect, useState} from 'react';
import {ViewStyle, ActivityIndicator} from 'react-native';

interface GradientSpinnerProps {
  size?: number;
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

  return (
    <ActivityIndicator
      color={currentColor}
      size={size}
      style={[{borderRadius: 50}, style]}
    />
  );
};
