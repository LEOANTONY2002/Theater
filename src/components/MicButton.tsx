import React, {useMemo} from 'react';
import {TouchableOpacity, View, StyleSheet, Platform} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useSpeechToText} from '../hooks/useSpeechToText';
import {colors, borderRadius} from '../styles/theme';
import VoiceCaptureModal from './VoiceCaptureModal';

export interface MicButtonProps {
  onFinalText?: (text: string) => void;
  onPartialText?: (text: string) => void;
  setIsHintVisible?: (isHintVisible: boolean) => void;
  size?: number;
  locale?: string; // e.g., 'en-US', 'en-IN'
  mode?: 'toggle' | 'hold';
  useModal?: boolean; // if true, open voice capture modal on tap (recommended UX)
}

export const MicButton: React.FC<MicButtonProps> = ({
  onFinalText,
  onPartialText,
  setIsHintVisible,
  size = 44,
  locale,
  mode = Platform.OS === 'android' ? 'hold' : 'toggle',
  useModal = true,
}) => {
  const {supported} = useSpeechToText(
    useModal
      ? {locale, onFinal: onFinalText}
      : {
          locale,
          onFinal: onFinalText,
          // Non-modal path deprecated in this setup
        },
  );
  const [voiceVisible, setVoiceVisible] = React.useState(false);

  const handlePress = async () => {
    if (!supported) return;
    setVoiceVisible(true);
  };

  // If speech is not supported on this device/build, hide the mic entirely to avoid confusing UX
  if (!supported) {
    return null;
  }

  const borderColor = colors.modal.border;
  const bgColor = 'transparent';
  const iconColor = colors.modal.active;

  return (
    <View style={{position: 'relative', overflow: 'visible'}}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.8}
        disabled={!supported}
        style={[
          styles.button,
          {
            borderRadius: borderRadius.round,
            borderColor,
            backgroundColor: bgColor,
            opacity: supported ? 1 : 0.4,
          },
        ]}>
        <Icon name={'mic-outline'} size={20} color={iconColor} />
      </TouchableOpacity>

      {/* Voice capture modal (pattern B) */}
      <VoiceCaptureModal
        visible={voiceVisible}
        locale={locale}
        onFinal={text => {
          setVoiceVisible(false);
          onFinalText?.(text);
        }}
        onNoResult={() => {
          // Keep modal open; VoiceCaptureModal shows inline message itself
        }}
        onCancel={() => setVoiceVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
});

export default MicButton;
