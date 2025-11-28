import React from 'react';
import {
  Modal,
  View,
  Text,
  Platform,
  Linking,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import {borderRadius, colors, spacing, typography} from '../styles/theme';
import {GradientSpinner} from './GradientSpinner';
import LinearGradient from 'react-native-linear-gradient';
import {useResponsive} from '../hooks/useResponsive';

export const openDNSSettings = () => {
  if (Platform.OS === 'android') {
    Linking.openSettings(); // Open general settings
  } else {
    Linking.openSettings();
  }
};

interface DNSInstructionsModalProps {
  visible: boolean;
  onClose: () => void;
  onTryAgain: () => void;
  isRetrying?: boolean;
}

export const DNSInstructionsModal = ({
  visible,
  onClose,
  onTryAgain,
  isRetrying,
}: DNSInstructionsModalProps) => {
  const {isTablet} = useResponsive();

  if (!visible) {
    return null;
  }

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
      fontSize: isTablet ? 60 : 40,
      opacity: 0.5,
      fontWeight: '900',
      textAlign: 'center',
      marginBottom: spacing.sm,
      fontFamily: 'Inter_28pt-ExtraBold',
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
      marginBottom: spacing.md,
      fontFamily: 'Inter_18pt-Regular',
    },
    instructions: {
      ...typography.body2,
      color: colors.text.secondary,
      textAlign: 'left',
      marginBottom: spacing.xl,
      fontSize: 12,
    },
    buttonWrap: {
      width: isTablet ? '50%' : '100%',
    },
    button: {
      height: isTablet ? 60 : 50,
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
      <TouchableOpacity
        onPress={onTryAgain}
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
  );
};
