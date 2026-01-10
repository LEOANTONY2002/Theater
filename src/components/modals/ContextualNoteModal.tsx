import React, {useState, useEffect} from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from 'react-native';
import {BlurView} from '@react-native-community/blur';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors, spacing, borderRadius, typography} from '../../styles/theme';
import {useResponsive} from '../../hooks/useResponsive';
import {GradientButton} from '../GradientButton';

interface ContextualNoteModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (note: string) => void;
  title: string;
  initialNote?: string;
}

export const ContextualNoteModal: React.FC<ContextualNoteModalProps> = ({
  visible,
  onClose,
  onSave,
  title,
  initialNote = '',
}) => {
  const {isTablet} = useResponsive();
  const [note, setNote] = useState(initialNote);

  useEffect(() => {
    if (visible) {
      setNote(initialNote);
    }
  }, [visible, initialNote]);

  const handleSave = () => {
    onSave(note);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      statusBarTranslucent={true}
      transparent
      animationType="fade"
      backdropColor={colors.modal.blurDark}
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType="dark"
          blurAmount={10}
          overlayColor={colors.modal.blurDark}
        />
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardView}>
            <View
              style={[
                styles.contentContainer,
                {
                  padding: isTablet ? spacing.xl : spacing.md,
                  margin: isTablet ? spacing.xl : spacing.xl,
                },
              ]}>
              <View style={styles.headerRow}>
                <View style={styles.headerLeft} />
                <Text style={styles.headerTitle}>Entry Notes</Text>
                <TouchableOpacity
                  onPress={onClose}
                  hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                  style={styles.backButton}>
                  <Ionicons
                    name="close"
                    size={15}
                    color={colors.text.primary}
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{paddingVertical: spacing.md}}>
                <View style={styles.section}>
                  <Text style={styles.label}>Diary Note</Text>
                  <TextInput
                    style={styles.textArea}
                    placeholder="Add notes for this entry..."
                    placeholderTextColor={colors.text.muted}
                    multiline
                    numberOfLines={4}
                    value={note}
                    onChangeText={setNote}
                    autoFocus
                  />
                </View>
              </ScrollView>

              <View style={{gap: spacing.md}}>
                <GradientButton
                  title="Save Note"
                  onPress={handleSave}
                  style={{width: '100%', borderRadius: borderRadius.round}}
                  isIcon={false}
                />
              </View>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  keyboardView: {
    width: '100%',
    alignItems: 'center',
  },
  contentContainer: {
    width: '95%',
    maxWidth: 400,
    backgroundColor: colors.modal.blur,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.modal.header,
    maxHeight: '90%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
    width: '100%',
  },
  headerLeft: {width: 40},
  headerTitle: {
    ...typography.h3,
    color: colors.text.primary,
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 32,
    height: 32,
    borderRadius: borderRadius.round,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.lg,
    textAlign: 'center',
    opacity: 0.9,
  },
  section: {
    marginBottom: spacing.xl,
  },
  label: {
    ...typography.body2,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  textArea: {
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    color: colors.text.primary,
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    ...typography.body1,
  },
});
