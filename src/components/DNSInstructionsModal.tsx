import React from 'react';
import {
  Modal,
  View,
  Text,
  Button,
  Platform,
  Linking,
  NativeModules,
  StyleSheet,
} from 'react-native';
import {borderRadius, colors, spacing, typography} from '../styles/theme';
import {GradientButton} from './GradientButton';
import LinearGradient from 'react-native-linear-gradient';

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
}

export const DNSInstructionsModal = ({
  visible,
  onClose,
  onTryAgain,
}: DNSInstructionsModalProps) => {
  const styles = StyleSheet.create({
    heading: {
      position: 'absolute',
      top: -60,
    },
    gradient: {
      position: 'absolute',
      left: 0,
      bottom: 70,
      height: 30,
      width: '100%',
      zIndex: 0,
    },
    headingText: {
      fontSize: 35,
      fontWeight: '900',
      color: colors.text.tertiary,
      textAlign: 'center',
      opacity: 0.7,
      zIndex: -1,
      width: '100%',
    },
  });

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.7)',
        }}>
        <View
          style={{
            backgroundColor: colors.modal.blur,
            padding: 24,
            borderRadius: 12,
            alignItems: 'center',
            maxWidth: 340,
          }}>
          <View style={styles.heading}>
            <LinearGradient
              colors={['transparent', colors.background.primary]}
              start={{x: 0.5, y: 0}}
              end={{x: 0.5, y: 1}}
              style={styles.gradient}
            />
            <Text style={styles.headingText}>TMDB Not Reachable</Text>
            <Text style={{marginBottom: 16, textAlign: 'center'}}></Text>
          </View>
          <Text
            style={{
              color: colors.text.primary,
              fontSize: 14,
              textAlign: 'center',
            }}>
            To use this app, please set your Private DNS to{' '}
            <Text
              style={{fontWeight: 'bold', color: 'rgba(224, 194, 248, 0.88)'}}>
              dns.google
            </Text>{' '}
            in your device settings.{'\n\n'}
          </Text>
          <Text
            style={{
              color: colors.text.muted,
              fontWeight: 100,
              fontSize: 12,
              marginBottom: 20,
              textAlign: 'center',
            }}>
            Go to Settings &gt; Network & Internet &gt; Private DNS &gt; Private
            DNS Provider &gt; Enter hostname of DNS Provider: dns.google &gt;
            Save
          </Text>
          <Text
            style={{
              marginBottom: 10,
              textAlign: 'center',
              fontWeight: 100,
              color: colors.text.secondary,
            }}>
            Setup completed?
          </Text>
          <GradientButton
            onPress={onTryAgain}
            title="Try Again"
            isIcon={false}
            style={{borderRadius: borderRadius.round}}
          />
        </View>
      </View>
    </Modal>
  );
};
