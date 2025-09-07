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
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.container}>
        <View style={styles.card}>
          <Image
            source={require('../assets/search.png')}
            style={styles.image}
          />
          <View style={{position: 'relative'}}>
            <LinearGradient
              style={{
                position: 'absolute',
                bottom: spacing.md,
                left: 0,
                right: 0,
                height: isTablet ? 60 : 30,
                zIndex: 1,
              }}
              colors={['transparent', colors.background.primary]}
            />
            <Text style={styles.noResultsTitle}>DNS Issue</Text>
          </View>
          <Text style={styles.subtitle}>
            To use this app, please set your Private DNS to{' '}
            <Text style={{fontWeight: 'bold', color: colors.primary}}>
              dns.google
            </Text>{' '}
            in your device settings.
          </Text>
          <Text style={styles.instructions}>
            {`1. Go to Settings\n2. Go to Network & Internet\n3. Go to Private DNS\n4. Go to Private DNS Provider\n5. Enter hostname: dns.google\n6. Click Save`}
          </Text>
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
      </View>
    </Modal>
  );
};
