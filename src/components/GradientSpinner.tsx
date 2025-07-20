import React, {useEffect} from 'react';
import {View, StyleSheet, ViewStyle} from 'react-native';
import Svg, {Circle, Defs, LinearGradient, Stop} from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
} from 'react-native-reanimated';

interface GradientSpinnerProps {
  size?: number;
  thickness?: number;
  colors?: string[];
  style?: ViewStyle;
}

const AnimatedView = Animated.createAnimatedComponent(View);

export const GradientSpinner: React.FC<GradientSpinnerProps> = ({
  size = 60,
  thickness = 6,
  colors = ['#ff6b6b', '#feca57', '#transparent'],
  style,
}) => {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 1000,
        easing: Easing.linear,
      }),
      -1, // infinite
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{rotate: `${rotation.value}deg`}],
  }));

  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <AnimatedView
      style={[
        styles.container,
        style,
        {width: size, height: size},
        animatedStyle,
      ]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <LinearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            {colors.map((color, index) => (
              <Stop
                key={index}
                offset={`${(index / (colors.length - 1)) * 100}%`}
                stopColor={color}
              />
            ))}
          </LinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#grad)"
          strokeWidth={thickness}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * 0.25}
        />
      </Svg>
    </AnimatedView>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
