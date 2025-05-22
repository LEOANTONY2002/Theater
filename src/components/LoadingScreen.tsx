import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import {colors, typography, spacing} from '../styles/theme';
import Icon from 'react-native-vector-icons/Ionicons';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading...',
}) => {
  // Create animated value for pulsing effect
  const pulseAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulseAnim]);

  const iconScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.2],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.iconContainer,
          {
            transform: [{scale: iconScale}],
          },
        ]}>
        <Icon name="film" size={60} color={colors.primary} />
      </Animated.View>
      <Text style={styles.title}>THEATER</Text>
      <ActivityIndicator
        color={colors.primary}
        size="large"
        style={styles.loader}
      />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
  iconContainer: {
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h1,
    color: colors.text.primary,
    fontWeight: '700',
    marginBottom: spacing.xl,
  },
  loader: {
    marginVertical: spacing.md,
  },
  message: {
    ...typography.body1,
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },
});
