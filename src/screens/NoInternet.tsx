import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {colors, spacing, borderRadius, typography} from '../styles/theme';
import {Image} from 'react-native';
import {GradientSpinner} from '../components/GradientSpinner';
import {useResponsive} from '../hooks/useResponsive';

interface Props {
  onRetry: () => void;
  isRetrying?: boolean;
}

export const NoInternet: React.FC<Props> = ({onRetry, isRetrying}) => {
  const {isTablet} = useResponsive();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.primary,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
    },
    card: {
      width: '100%',
      alignItems: 'center',
      position: 'relative',
    },
    noResultsTitle: {
      color: colors.text.muted,
      fontSize: 60,
      opacity: 0.5,
      fontWeight: '900',
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    image: {
      width: isTablet ? 300 : 200,
      height: isTablet ? 300 : 200,
      objectFit: 'contain',
      marginBottom: spacing.xl,
      opacity: 0.3,
    },
    subtitle: {
      ...typography.body2,
      color: colors.text.secondary,
      textAlign: 'center',
      marginBottom: spacing.xl,
    },
    buttonWrap: {
      width: isTablet ? '50%' : '100%',
    },
    button: {
      height: 52,
      borderRadius: borderRadius.round,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: {
      ...typography.button,
      color: colors.text.primary,
      fontWeight: '600',
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Image source={require('../assets/offline.png')} style={styles.image} />
        <View style={{position: 'relative'}}>
          <LinearGradient
            style={{
              position: 'absolute',
              bottom: spacing.md,
              left: 0,
              right: 0,
              height: 60,
              zIndex: 1,
            }}
            colors={['transparent', colors.background.primary]}
          />
          <Text style={styles.noResultsTitle}>No Internet</Text>
        </View>
        <Text style={styles.subtitle}>
          You're offline. Check your connection and try again.
        </Text>
        <TouchableOpacity
          onPress={onRetry}
          disabled={!!isRetrying}
          activeOpacity={0.85}
          style={styles.buttonWrap}>
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.button}>
            {isRetrying ? (
              <GradientSpinner color={colors.text.primary} size={24} />
            ) : (
              <Text style={styles.buttonText}>Try Again</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default NoInternet;
