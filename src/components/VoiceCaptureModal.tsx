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
import {colors, borderRadius, spacing, typography} from '../styles/theme';
import {useResponsive} from '../hooks/useResponsive';
import {MaybeBlurView} from './MaybeBlurView';
import {BlurPreference} from '../store/blurPreference';
import LinearGradient from 'react-native-linear-gradient';

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
  const themeMode = BlurPreference.getMode();
  const isSolid = themeMode === 'normal';

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
    },
    blur: {
      ...StyleSheet.absoluteFillObject,
    },
    cardContainer: {
      width: isTablet ? '40%' : '85%',
      borderRadius: borderRadius.xl,
      overflow: 'hidden',
    },
    card: {
      padding: spacing.xl,
      backgroundColor: colors.modal.blur,
      borderRadius: borderRadius.xl,
      borderTopWidth: 1,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: colors.modal.content,
      alignItems: 'center',
    },
    solidCard: {
      padding: spacing.xl,
      backgroundColor: 'black',
      borderRadius: borderRadius.xl,
      borderWidth: 3,
      borderColor: 'rgba(0, 0, 0, 0.04)',
      alignItems: 'center',
    },
    micCircle: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: 'rgba(251, 228, 246, 0.1)',
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: colors.modal.activeBorder,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    hintText: {
      color: colors.text.secondary,
      fontSize: 14,
      marginTop: spacing.md,
      fontFamily: 'Inter_18pt-Regular',
      textAlign: 'center',
    },
    actions: {flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl},
    actionBtn: {
      flex: 1,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.round,
      alignItems: 'center',
      borderWidth: 1,
      borderTopWidth: 1,
      borderLeftWidth: 1,
      borderRightWidth: 1,
    },
    cancelBtn: {
      borderColor: colors.modal.content,
      backgroundColor: colors.modal.blur,
      borderBottomWidth: 0,
      borderWidth: 1,
    },
    actionText: {
      color: colors.text.primary,
      fontFamily: 'Inter_18pt-Regular',
      fontWeight: '500',
    },
  });

  const renderContent = () => {
    if (!isSolid) {
      // Blur mode
      return (
        <View style={styles.cardContainer}>
          <View style={styles.card}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={async () => {
                if (!supported) return;
                if (isRecording) {
                  await stop();
                } else {
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
      );
    } else {
      // Solid mode
      return (
        <View style={styles.cardContainer}>
          <LinearGradient
            colors={['rgba(111, 111, 111, 0.42)', 'rgba(20, 20, 20, 0.7)']}
            start={{x: 1, y: 0}}
            end={{x: 1, y: 1}}
            style={{borderRadius: borderRadius.xl}}>
            <View style={styles.solidCard}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={async () => {
                  if (!supported) return;
                  if (isRecording) {
                    await stop();
                  } else {
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
            <LinearGradient
              colors={['transparent', 'rgba(0, 0, 0, 0.5)']}
              style={{
                position: 'absolute',
                right: 0,
                height: isTablet ? '150%' : '100%',
                width: '180%',
                transform: [{rotate: isTablet ? '-10deg' : '-20deg'}],
                left: isTablet ? '-30%' : '-50%',
                bottom: isTablet ? '-20%' : '-30%',
                pointerEvents: 'none',
              }}
            />
          </LinearGradient>
        </View>
      );
    }
  };

  return (
    <Modal
      visible={visible}
      backdropColor={isSolid ? 'rgba(0, 0, 0, 0.8)' : colors.modal.blurDark}
      statusBarTranslucent
      animationType="fade"
      onRequestClose={onCancel}>
      {!isSolid && (
        <BlurView
          blurType="dark"
          blurAmount={10}
          overlayColor="rgba(0, 0, 0, 0.5)"
          style={styles.blur}
        />
      )}
      <View style={styles.overlay}>{renderContent()}</View>
    </Modal>
  );
};

export default VoiceCaptureModal;
