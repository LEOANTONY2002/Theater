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
} from 'react-native';
import {MaybeBlurView} from './MaybeBlurView';
import {colors, spacing, borderRadius, typography} from '../styles/theme';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {notificationService} from '../services/NotificationService';
import {useResponsive} from '../hooks/useResponsive';
import {BlurPreference} from '../store/blurPreference';
import {BlurView} from '@react-native-community/blur';
import {detectRegion} from '../services/regionDetection';

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
  const {isTablet} = useResponsive();
  const themeMode = BlurPreference.getMode();
  const isSolid = themeMode === 'normal';

  // State to track if global notifications are enabled (derived from 'all' topic basically)
  // Check if we have ANY topics subscribed.
  const isGlobalEnabled = subscribedTopics.length > 0;

  useEffect(() => {
    if (visible) {
      loadSubscriptions();
    }
  }, [visible]);

  const loadSubscriptions = async () => {
    setIsLoading(true);
    try {
      const topics = await notificationService.getSubscribedTopics();
      setSubscribedTopics(topics);
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
    if (isSubscribed) {
      success = await notificationService.unsubscribeFromTopic(topic);
      // If unsubscribing from 'all', also unsubscribe from region
      if (topic === 'all') {
        const region = await detectRegion();
        if (region) {
          await notificationService.unsubscribeFromTopic(region);
        }
      }
    } else {
      success = await notificationService.subscribeToTopic(topic);
      // If subscribing to 'all', also subscribe to region
      if (topic === 'all') {
        const region = await detectRegion();
        if (region) {
          await notificationService.subscribeToTopic(region);
        }
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
      await notificationService.subscribeToTopic('all');
      await notificationService.subscribeToTopic('trending');
      const region = await detectRegion();
      if (region) {
        await notificationService.subscribeToTopic(region);
      }
    } else {
      for (const topic of subscribedTopics) {
        await notificationService.unsubscribeFromTopic(topic);
      }
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
                  value={isGlobalEnabled}
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

              {/* Trending */}
              <View style={styles.row}>
                <View style={{flex: 1, paddingRight: spacing.md}}>
                  <Text style={styles.rowTitle}>Trending Now</Text>
                  <Text style={styles.rowSubtitle}>
                    Get updates on what's popular
                  </Text>
                </View>
                <Switch
                  value={subscribedTopics.includes('trending')}
                  onValueChange={() => toggleTopic('trending')}
                  trackColor={{
                    false: colors.background.tertiarySolid,
                    true: colors.accent,
                  }}
                  thumbColor={colors.text.primary}
                  ios_backgroundColor={colors.background.tertiarySolid}
                />
              </View>

              {/* General Updates */}
              <View style={styles.row}>
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
              </View>
            </ScrollView>
          )}
        </MaybeBlurView>
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
