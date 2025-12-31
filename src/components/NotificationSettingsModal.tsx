import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Switch,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import {PermissionModal} from './PermissionModal';
import {MaybeBlurView} from './MaybeBlurView';
import {colors, spacing, borderRadius, typography} from '../styles/theme';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {notificationService} from '../services/NotificationService';
import {useResponsive} from '../hooks/useResponsive';
import {BlurPreference} from '../store/blurPreference';
import {BlurView} from '@react-native-community/blur';
import {SettingsManager} from '../store/settings';

interface NotificationSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export const NotificationSettingsModal: React.FC<
  NotificationSettingsModalProps
> = ({visible, onClose, onUpdate}) => {
  const [subscribedTopics, setSubscribedTopics] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSystemPermission, setHasSystemPermission] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const {isTablet} = useResponsive();
  const themeMode = BlurPreference.getMode();
  const isSolid = themeMode === 'normal';

  // Master switch is ON only if:
  // 1. We have system permission
  // 2. We have at least one topic subscribed (OR we consider 'no topics' as off)
  // Actually, usually "Allow Notifications" means the capability is there.
  // But to align with "turning off master", we check if subscribedTopics > 0 too?
  // User wants: If hardware off -> master off.
  const isMasterSwitchOn = hasSystemPermission && subscribedTopics.length > 0;

  useEffect(() => {
    if (visible) {
      loadSubscriptions();
    }
  }, [visible]);

  const loadSubscriptions = async () => {
    setIsLoading(true);
    try {
      const [topics, sysPerm] = await Promise.all([
        notificationService.getSubscribedTopics(),
        notificationService.checkSystemPermission(),
      ]);
      setSubscribedTopics(topics);
      setHasSystemPermission(sysPerm);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTopic = async (topic: string) => {
    // Optimistic update
    const isSubscribed = subscribedTopics.includes(topic);
    const newTopics = isSubscribed
      ? subscribedTopics.filter(t => t !== topic)
      : [...subscribedTopics, topic];
    setSubscribedTopics(newTopics);

    let success = false;
    const settingsRegion = await SettingsManager.getRegion();
    const region = settingsRegion?.iso_3166_1;

    if (isSubscribed) {
      // Unsubscribing
      success = await notificationService.unsubscribeFromTopic(topic);
      // If unsubscribing from 'trending', also unsubscribe from region
      if (topic === 'trending' && region) {
        await notificationService.unsubscribeFromTopic(region);
      }
    } else {
      // Subscribing
      success = await notificationService.subscribeToTopic(topic);
      // If subscribing to 'trending', also subscribe to region
      if (topic === 'trending' && region) {
        await notificationService.subscribeToTopic(region);
      }
    }

    if (!success) {
      // Revert if failed
      setSubscribedTopics(subscribedTopics);
    } else {
      await loadSubscriptions(); // Reload to get the actual list including region
      onUpdate();
    }
  };

  const toggleAll = async (value: boolean) => {
    setIsLoading(true);

    if (value) {
      // User wants to turn ON
      // 1. Check System Permission first
      const hasPerm = await notificationService.checkSystemPermission();
      if (!hasPerm) {
        // Request it
        const granted = await notificationService.requestUserPermission();
        if (!granted) {
          // Denied -> Show Modal
          setShowPermissionModal(true);
          setIsLoading(false);
          return;
        }
        setHasSystemPermission(true);
      }

      // 2. Subscribe to defaults
      const settingsRegion = await SettingsManager.getRegion();
      const region = settingsRegion?.iso_3166_1;
      await notificationService.subscribeToTopic('trending');
      await notificationService.subscribeToTopic('all');
      if (region) {
        await notificationService.subscribeToTopic(region);
      }
    } else {
      // User wants to turn OFF
      // Unsubscribe everything (App Mute)
      const settingsRegion = await SettingsManager.getRegion();
      const region = settingsRegion?.iso_3166_1;
      for (const topic of subscribedTopics) {
        await notificationService.unsubscribeFromTopic(topic);
      }
      if (region) {
        await notificationService.unsubscribeFromTopic(region);
      }
      // Note: We cannot programmatically revoke system permission
    }

    await loadSubscriptions();
    onUpdate();
    setIsLoading(false);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      statusBarTranslucent={true}
      onRequestClose={onClose}>
      {!isSolid && (
        <BlurView
          blurType="dark"
          blurAmount={10}
          overlayColor={colors.modal.blurDark}
          style={StyleSheet.absoluteFill}
        />
      )}

      <View
        style={{
          flex: 1,
          margin: isTablet ? spacing.xl : spacing.md,
          borderRadius: borderRadius.xl,
          backgroundColor: 'transparent',
        }}>
        <MaybeBlurView
          header
          style={{
            marginTop: 20,
          }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
            }}>
            <Ionicons
              name="settings-outline"
              size={20}
              color={colors.text.muted}
            />
            <Text style={styles.modalTitle}>Notification Settings</Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={{
              padding: spacing.sm,
              backgroundColor: colors.modal.blur,
              borderRadius: borderRadius.round,
              borderTopWidth: 1,
              borderLeftWidth: 1,
              borderRightWidth: 1,
              borderColor: colors.modal.content,
            }}>
            <Ionicons name="close" size={20} color={colors.text.primary} />
          </TouchableOpacity>
        </MaybeBlurView>

        <MaybeBlurView body style={{flex: 1}}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : (
            <ScrollView
              style={{flex: 1}}
              contentContainerStyle={{padding: spacing.md}}
              showsVerticalScrollIndicator={false}>
              {/* Global Toggle */}
              <View style={styles.row}>
                <View style={{flex: 1, paddingRight: spacing.md}}>
                  <Text style={styles.rowTitle}>Allow Notifications</Text>
                  <Text style={styles.rowSubtitle}>
                    Turn all notifications on or off
                  </Text>
                </View>
                <Switch
                  value={isMasterSwitchOn}
                  onValueChange={toggleAll}
                  trackColor={{
                    false: colors.background.tertiarySolid,
                    true: colors.accent,
                  }}
                  thumbColor={colors.text.primary}
                  ios_backgroundColor={colors.background.tertiarySolid}
                />
              </View>

              <View style={styles.divider} />

              <Text style={styles.sectionHeader}>Topics</Text>

              <View style={styles.row}>
                <View style={{flex: 1, paddingRight: spacing.md}}>
                  <Text style={styles.rowTitle}>Weekly Trending</Text>
                  <Text style={styles.rowSubtitle}>
                    Get weekly updates on popular content in your region
                  </Text>
                </View>
                <Switch
                  value={subscribedTopics.includes('trending')}
                  disabled={!isMasterSwitchOn}
                  onValueChange={() => toggleTopic('trending')}
                  trackColor={{
                    false: colors.background.tertiarySolid,
                    true: isMasterSwitchOn
                      ? colors.accent
                      : colors.background.tertiarySolid,
                  }}
                  thumbColor={
                    isMasterSwitchOn
                      ? colors.text.primary
                      : colors.text.secondary
                  }
                  ios_backgroundColor={colors.background.tertiarySolid}
                />
              </View>

              {/* General Updates (Commented out for now) */}
              {/* <View style={styles.row}>
                <View style={{flex: 1, paddingRight: spacing.md}}>
                  <Text style={styles.rowTitle}>General Updates</Text>
                  <Text style={styles.rowSubtitle}>
                    App updates and announcements
                  </Text>
                </View>
                <Switch
                  value={subscribedTopics.includes('all')}
                  onValueChange={() => toggleTopic('all')}
                  trackColor={{
                    false: colors.background.tertiarySolid,
                    true: colors.accent,
                  }}
                  thumbColor={colors.text.primary}
                  ios_backgroundColor={colors.background.tertiarySolid}
                />
              </View> */}
            </ScrollView>
          )}
        </MaybeBlurView>
        <PermissionModal
          visible={showPermissionModal}
          onClose={() => setShowPermissionModal(false)}
          onRequestPermission={() =>
            notificationService.requestUserPermission()
          }
          onContinue={() => {
            // No custom action for "Proceed", settings is the only way for global fix
            // But if they clicked Continue, we just close.
            // Or we could re-check permission?
            // For now just close.
            setShowPermissionModal(false);
          }}
          showSkipOption={false}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    ...typography.h3,
    color: colors.text.primary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  rowTitle: {
    ...typography.body1,
    color: colors.text.primary,
    fontWeight: '600',
  },
  rowSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.modal.border,
    marginVertical: spacing.sm,
  },
  sectionHeader: {
    color: colors.text.muted,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 1,
    fontWeight: '600',
  },
});
