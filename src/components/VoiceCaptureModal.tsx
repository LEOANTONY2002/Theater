import React, {useEffect, useMemo, useState} from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
  Platform,
} from 'react-native';
import {BlurView} from '@react-native-community/blur';
import Icon from 'react-native-vector-icons/Ionicons';
import {useSpeechToText} from '../hooks/useSpeechToText';
import {colors, borderRadius} from '../styles/theme';
import {useResponsive} from '../hooks/useResponsive';

interface VoiceCaptureModalProps {
  visible: boolean;
  locale?: string;
  onFinal: (text: string) => void;
  onNoResult: () => void;
  onCancel: () => void;
}

export const VoiceCaptureModal: React.FC<VoiceCaptureModalProps> = ({
  visible,
  locale,
  onFinal,
  onNoResult,
  onCancel,
}) => {
  const pulse = useMemo(() => new Animated.Value(1), []);
  const [hint, setHint] = useState<string>('Tap to Speak');
  const {isTablet} = useResponsive();

  const {start, stop, isRecording, supported} = useSpeechToText({
    locale,
    onFinal: (t: string) => {
      onFinal(t);
    },
    onNoResult: () => {
      // Keep modal open and show inline retry hint
      setHint("We couldn't catch that. Try again.");
      onNoResult();
    },
  });

  useEffect(() => {
    if (!visible) return;
    // Pulse only when recording
    let loop: Animated.CompositeAnimation | null = null;
    if (isRecording) {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1.1,
            duration: 500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 1.0,
            duration: 500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
    }
    return () => {
      if (loop) loop.stop();
    };
  }, [visible, isRecording, pulse]);

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.81)',
    },
    blur: {
      ...StyleSheet.absoluteFillObject,
    },
    card: {
      width: isTablet ? 320 : 250,
      borderRadius: 50,
      backgroundColor: colors.modal.blurDark,
      paddingHorizontal: 20,
      paddingVertical: 60,
      alignItems: 'center',
    },
    micCircle: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: 'rgba(251, 228, 246, 0.1)',
      borderWidth: 1,
      borderColor: colors.modal.activeBorder,
      justifyContent: 'center',
      alignItems: 'center',
    },
    hintText: {
      color: colors.text.secondary,
      fontSize: 14,
      marginTop: 16,
      fontFamily: 'Inter_18pt-Regular',
    },
    actions: {flexDirection: 'row', gap: 12, marginTop: 20},
    actionBtn: {
      minWidth: 110,
      paddingVertical: 10,
      borderRadius: borderRadius.round,
      alignItems: 'center',
      borderWidth: 1,
    },
    cancelBtn: {
      borderColor: colors.modal.border,
      backgroundColor: 'transparent',
    },
    actionText: {color: colors.text.primary, fontFamily: 'Inter_18pt-Regular'},
  });

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={{borderRadius: 50, overflow: 'hidden'}}>
          <BlurView style={styles.blur} blurType={'dark'} blurAmount={10} />
          <View style={styles.card}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={async () => {
                if (!supported) return;
                if (isRecording) {
                  await stop();
                } else {
                  // Reset hint to default before starting
                  setHint('Tap to Speak');
                  await start();
                }
              }}>
              <Animated.View
                style={[
                  styles.micCircle,
                  {transform: [{scale: isRecording ? pulse : 1}]},
                ]}>
                <Icon
                  name={isRecording ? 'mic' : 'mic-outline'}
                  size={42}
                  color={colors.text.primary}
                />
              </Animated.View>
            </TouchableOpacity>

            <Text style={styles.hintText}>
              {isRecording ? 'Listening…' : hint}
            </Text>

            <View style={styles.actions}>
              <TouchableOpacity
                onPress={onCancel}
                style={[styles.actionBtn, styles.cancelBtn]}>
                <Text style={styles.actionText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default VoiceCaptureModal;
