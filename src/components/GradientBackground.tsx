import React, {useEffect} from 'react';
import {StyleSheet, View, Animated} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {colors} from '../styles/theme';

interface GradientBackgroundProps {
  children: React.ReactNode;
  variant?: 'default' | 'cinematic' | 'dark';
  animated?: boolean;
}

export const GradientBackground: React.FC<GradientBackgroundProps> = ({
  children,
  variant = 'default',
  animated = false,
}) => {
  // Get gradient colors based on variant
  const getGradientColors = () => {
    switch (variant) {
      case 'cinematic':
        return ['#0A0A1A', '#1F0A3A', '#12122A'];
      case 'dark':
        return ['#050510', '#0A0A1A', '#0F0F20'];
      default:
        return colors.background.gradient;
    }
  };

  const animatedValue = new Animated.Value(0);

  useEffect(() => {
    if (animated) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 10000,
            useNativeDriver: false,
          }),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: 10000,
            useNativeDriver: false,
          }),
        ]),
      ).start();
    }
  }, [animated, animatedValue]);

  // Render a simple gradient background without animation
  if (!animated) {
    return (
      <LinearGradient
        colors={getGradientColors()}
        style={styles.container}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}>
        {children}
      </LinearGradient>
    );
  }

  // Render an animated gradient
  return (
    <Animated.View style={styles.container}>
      <LinearGradient
        colors={getGradientColors()}
        style={StyleSheet.absoluteFill}
        start={{
          x: 0,
          y: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 0.5],
          }) as any,
        }}
        end={{
          x: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0.5],
          }) as any,
          y: 1,
        }}>
        <View style={[StyleSheet.absoluteFill, styles.overlay]} />
      </LinearGradient>
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    backgroundColor: 'rgba(10, 10, 26, 0.15)',
  },
});
