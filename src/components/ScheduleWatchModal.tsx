import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {BlurView} from '@react-native-community/blur';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import Icon from 'react-native-vector-icons/Ionicons';
import {GradientButton} from './GradientButton';
import {useResponsive} from '../hooks/useResponsive';
import LinearGradient from 'react-native-linear-gradient';

interface ScheduleWatchModalProps {
  visible: boolean;
  onClose: () => void;
  onSchedule: (date: Date, type: 'release' | 'custom') => void;
  title: string;
  releaseDate?: Date | null;
  existingDate?: Date | null;
  onRemove?: () => void;
}

export const ScheduleWatchModal: React.FC<ScheduleWatchModalProps> = ({
  visible,
  onClose,
  onSchedule,
  title,
  releaseDate,
  existingDate,
  onRemove,
}) => {
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<'details' | 'picker'>('picker');

  // Android specific state
  const [mode, setMode] = useState<'date' | 'time'>('date');
  const [showPicker, setShowPicker] = useState(false);
  const {isTablet} = useResponsive();

  useEffect(() => {
    if (visible) {
      if (existingDate) {
        setView('details');
        setDate(existingDate);
      } else {
        setView('picker');
        // Default to release date @ 7AM if in future, otherwise now
        if (releaseDate && releaseDate > new Date()) {
          const defaultDate = new Date(releaseDate);
          defaultDate.setHours(7, 0, 0, 0);
          setDate(defaultDate);
        } else {
          setDate(new Date());
        }
      }
    }
  }, [visible, releaseDate, existingDate]);

  const handleConfirm = () => {
    onSchedule(date, 'custom');
    onClose();
  };

  const getMinDate = () => {
    return new Date();
  };

  const onAndroidChange = (event: any, selectedDate?: Date) => {
    if (event.type === 'dismissed') {
      setShowPicker(false);
      return;
    }

    const currentDate = selectedDate || date;
    setShowPicker(false);
    setDate(currentDate);
  };

  const showAndroidPicker = (currentMode: 'date' | 'time') => {
    setShowPicker(true);
    setMode(currentMode);
  };

  // Determine if back button should be shown
  const showBack = false;

  const handleBack = () => {
    // No back logic needed
  };

  const renderHeader = () => (
    <View style={styles.headerRow}>
      <View style={styles.headerLeft} />
      <Text style={styles.headerTitle}>
        {view === 'details' ? '' : 'Schedule Reminder'}
      </Text>
      <View style={styles.headerRight}>
        <TouchableOpacity
          onPress={onClose}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
          style={styles.backButton}>
          <Icon name="close" size={15} color={colors.text.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDetailsView = () => (
    <View style={styles.selectionContainer}>
      <View style={styles.iconContainer}>
        <Icon name="checkmark-circle" size={40} color={colors.text.muted} />
      </View>

      <Text
        style={{
          ...typography.body2,
          color: colors.text.secondary,
          textAlign: 'center',
        }}>
        Scheduled on
      </Text>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.md,
        }}>
        <Text style={styles.dateDisplay}>
          {existingDate?.toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </Text>
        <Text style={styles.dateDisplay}>
          {existingDate?.toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          onPress={() => {
            setView('picker');
            if (existingDate) {
              setDate(existingDate);
            }
          }}>
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={styles.button}>
            <Text style={{...typography.body2, color: colors.text.primary}}>
              Reschedule
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.androidPickerBtn,
            {
              alignItems: 'center',
              justifyContent: 'center',
              height: 50,
              borderRadius: borderRadius.round,
              borderWidth: 1,
              borderBottomWidth: 0,
              borderColor: colors.modal.header,
            },
          ]}
          onPress={() => {
            onClose();
            if (onRemove) onRemove();
          }}>
          <Text style={{...typography.body2, color: colors.text.primary}}>
            Remove Schedule
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPickerView = () => (
    <>
      <View style={styles.pickerContainer}>
        {Platform.OS === 'ios' ? (
          <DateTimePicker
            value={date}
            mode="datetime"
            display="spinner"
            onChange={(_, selectedDate) => {
              if (selectedDate) setDate(selectedDate);
            }}
            minimumDate={getMinDate()}
            textColor={colors.text.primary}
            themeVariant="dark"
          />
        ) : (
          <View style={styles.androidContainer}>
            <Text style={styles.dateDisplay}>
              {date.toLocaleString([], {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>

            <View style={styles.androidButtonRow}>
              <TouchableOpacity
                style={styles.androidPickerBtn}
                onPress={() => showAndroidPicker('date')}>
                <Icon
                  name="calendar-outline"
                  size={20}
                  color={colors.text.primary}
                />
                <Text style={styles.androidPickerText}>Set Date</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.androidPickerBtn}
                onPress={() => showAndroidPicker('time')}>
                <Icon
                  name="time-outline"
                  size={20}
                  color={colors.text.primary}
                />
                <Text style={styles.androidPickerText}>Set Time</Text>
              </TouchableOpacity>
            </View>

            {showPicker && (
              <DateTimePicker
                testID="dateTimePicker"
                value={date}
                mode={mode}
                is24Hour={true}
                display="default"
                onChange={onAndroidChange}
                minimumDate={getMinDate()}
              />
            )}
          </View>
        )}
      </View>

      <GradientButton
        title="Schedule Watch"
        onPress={handleConfirm}
        style={styles.confirmButton}
        isIcon={false}
        disabled={date.getTime() <= Date.now()}
      />
    </>
  );

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
        <View
          style={[
            styles.contentContainer,
            {
              padding: isTablet ? spacing.xl : spacing.md,
              margin: isTablet ? spacing.xl : spacing.xl,
            },
          ]}>
          {renderHeader()}

          {view !== 'details' && (
            <Text style={styles.subtitle}>Add "{title}" to my calendar.</Text>
          )}

          {view === 'details' ? renderDetailsView() : renderPickerView()}
        </View>
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
  contentContainer: {
    width: '95%',
    maxWidth: 400,
    backgroundColor: colors.modal.blur,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.modal.header,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
    width: '100%',
  },
  headerLeft: {
    width: 40,
    alignItems: 'flex-start',
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text.primary,
    flex: 1,
    textAlign: 'center',
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body2,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  pickerContainer: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  confirmButton: {
    width: '100%',
    borderRadius: borderRadius.round,
  },
  androidContainer: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.lg,
  },
  dateDisplay: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  androidButtonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'center',
    width: '100%',
  },
  androidPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.modal.blur,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.modal.header,
  },
  androidPickerText: {
    color: colors.text.primary,
    fontWeight: '500',
  },
  selectionContainer: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text.primary,
    textAlign: 'center',
    fontSize: 14,
    letterSpacing: 1,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    gap: spacing.md,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: 2,
    fontSize: 16,
  },
  optionSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 40,
    height: 40,
    borderRadius: borderRadius.round,
    backgroundColor: colors.modal.blur,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.modal.header,
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: spacing.md,
    backgroundColor: colors.modal.blur,
    padding: spacing.md,
    borderRadius: borderRadius.round,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
    backgroundColor: colors.background.tertiary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: borderRadius.md,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  dateText: {
    ...typography.body1,
    color: colors.text.primary,
    fontWeight: '500',
  },
  actions: {
    width: '100%',
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  button: {
    width: '100%',
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.modal.border,
  },
});
