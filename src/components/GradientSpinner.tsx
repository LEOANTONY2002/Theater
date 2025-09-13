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
    colors?.[0] || color,
  );

  useEffect(() => {
    const id = setInterval(() => {
      if (colors && colors?.length > 0) {
        setCurrentColor(currentColor === colors[0] ? colors[1] : colors[0]);
      }
    }, 1200);
    return () => clearInterval(id);
  }, [currentColor]);

  return (
    <ActivityIndicator
      color={currentColor}
      size={size}
      style={[{borderRadius: 50}, style]}
    />
  );
};
