import React from 'react';
import {
  Modal,
  View,
  Text,
  Button,
  Platform,
  Linking,
  NativeModules,
} from 'react-native';

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
}: DNSInstructionsModalProps) => (
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
          backgroundColor: '#fff',
          padding: 24,
          borderRadius: 12,
          alignItems: 'center',
          maxWidth: 340,
        }}>
        <Text
          style={{
            fontSize: 18,
            fontWeight: 'bold',
            marginBottom: 12,
            textAlign: 'center',
          }}>
          TMDB Not Reachable
        </Text>
        <Text style={{marginBottom: 16, textAlign: 'center'}}>
          To use this app, please set your Private DNS to{' '}
          <Text style={{fontWeight: 'bold'}}>dns.google</Text> in your device
          settings.{'\n\n'}
          <Text style={{fontWeight: 'bold'}}>Steps:</Text>
          {'\n'}
          1. Open <Text style={{fontWeight: 'bold'}}>Settings</Text>
          {'\n'}
          2. Tap <Text style={{fontWeight: 'bold'}}>Network & Internet</Text>
          {'\n'}
          3. Tap <Text style={{fontWeight: 'bold'}}>Private DNS</Text>
          {'\n'}
          4. Select{' '}
          <Text style={{fontWeight: 'bold'}}>
            Private DNS provider hostname
          </Text>
          {'\n'}
          5. Enter: <Text style={{fontWeight: 'bold'}}>dns.google</Text>
          {'\n'}
          6. Save
        </Text>
        <Button title="Try Again" onPress={onTryAgain} />
        <Button title="Close" onPress={onClose} color="#888" />
      </View>
    </View>
  </Modal>
);
