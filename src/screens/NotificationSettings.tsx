import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ImageBackground,
  Image,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import {notificationService} from '../services/NotificationService';
import {navigate} from '../services/NavigationService';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import {useResponsive} from '../hooks/useResponsive';
import {BlurPreference} from '../store/blurPreference';
import {detectRegion} from '../services/regionDetection';
import {NotificationSettingsModal} from '../components/NotificationSettingsModal';

interface NotificationHistoryItem {
  id: string;
  title?: string;
  body?: string;
  imageUrl?: string | null;
  data?: any;
  receivedAt: string;
  opened: boolean;
  openedAt?: string;
  state: 'foreground' | 'background' | 'quit';
}

export const NotificationSettings: React.FC = () => {
  const navigation = useNavigation();
  const [history, setHistory] = useState<NotificationHistoryItem[]>([]);
  const [hasPermission, setHasPermission] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);
  const {isTablet} = useResponsive();
  const themeMode = BlurPreference.getMode();
  const isSolid = themeMode === 'normal';
  const {width} = useWindowDimensions();

  const loadData = async () => {
    try {
      const perm = await notificationService.checkPermission();
      const subscribedTopics = await notificationService.getSubscribedTopics();
      const hasAnySubscription = subscribedTopics.length > 0;

      // If permission is strictly missing from OS, it's disabled.
      // If permission exists but user unsubscribed from ALL topics, treat as disabled in UI.
      setHasPermission(perm && hasAnySubscription);

      const notifHistory = await notificationService.getNotificationHistory();
      console.log(
        '📋 Loaded notification history:',
        notifHistory.length,
        'items',
      );
      if (notifHistory.length > 0) {
        console.log('📋 First notification:', notifHistory[0]);
        console.log('📋 Image URL:', notifHistory[0].imageUrl);
      }
      setHistory(notifHistory);
    } catch (error) {
      console.error('Error loading notification data:', error);
    }
  };

  useEffect(() => {
    // Mark all as read when screen opens
    notificationService.markAllAsRead();
    loadData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const groupNotificationsByDate = (
    notifications: NotificationHistoryItem[],
  ) => {
    const groups: {[key: string]: NotificationHistoryItem[]} = {};

    notifications.forEach(notif => {
      const date = new Date(notif.receivedAt);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let groupKey: string;
      if (date.toDateString() === today.toDateString()) {
        groupKey = 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupKey = 'Yesterday';
      } else {
        groupKey = date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year:
            date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
        });
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(notif);
    });

    return groups;
  };

  const groupedNotifications = groupNotificationsByDate(history);

  const handleEnableNotifications = async () => {
    setIsEnabling(true);
    try {
      const enabled = await notificationService.requestUserPermission();
      // Don't set state immediately. Wait for subscriptions to complete.
      if (enabled) {
        // Subscribe to topics if enabled
        await notificationService.subscribeToTopic('all');
        await notificationService.subscribeToTopic('trending');
        const region = await detectRegion();
        if (region) {
          await notificationService.subscribeToTopic(region);
        }
        // loadData will check for 'all' subscription and update hasPermission state
        await loadData();
      }
    } finally {
      setIsEnabling(false);
    }
  };

  const handleClearAll = async () => {
    await notificationService.clearAllNotifications();
    setHistory([]);
  };

  return (
    <View style={styles.container}>
      {/* Fixed Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.actionsScroll}
          contentContainerStyle={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowSettingsModal(true)}>
            <Icon
              name="settings-outline"
              size={18}
              color={colors.text.primary}
            />
            <Text style={styles.actionButtonText}>Settings</Text>
          </TouchableOpacity>
          {history.length > 0 && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleClearAll}>
              <Icon
                name="trash-outline"
                size={18}
                color={colors.text.primary}
              />
              <Text style={styles.actionButtonText}>Delete All</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* Notification List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }>
        {history.length > 0 ? (
          Object.entries(groupedNotifications).map(
            ([dateGroup, notifications]) => (
              <View key={dateGroup} style={styles.dateGroup}>
                <Text style={styles.dateGroupTitle}>{dateGroup}</Text>
                {notifications.map(item => {
                  const imageUrl = item.imageUrl;

                  const handlePress = () => {
                    if (item.data?.screen) {
                      const {screen, ...params} = item.data;

                      // Auto-correct screen name (same as NotificationService)
                      let correctedScreen = screen;
                      if (screen.toLowerCase() === 'tvshowdetails') {
                        correctedScreen = 'TVShowDetails';
                      } else if (screen.toLowerCase() === 'moviedetails') {
                        correctedScreen = 'MovieDetails';
                      }

                      // Convert IDs to numbers
                      const cleanParams: any = {...params};
                      if (cleanParams.movieId) {
                        cleanParams.movieId = parseInt(cleanParams.movieId, 10);
                      }
                      if (cleanParams.tvShowId) {
                        cleanParams.tvShowId = parseInt(
                          cleanParams.tvShowId,
                          10,
                        );
                      }
                      if (cleanParams.id) {
                        cleanParams.id = parseInt(cleanParams.id, 10);
                      }

                      // Navigate using NavigationService (handles nested navigators)
                      navigate(correctedScreen as any, cleanParams);
                    }
                  };

                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.notificationCard}
                      onPress={handlePress}
                      activeOpacity={1}>
                      {imageUrl ? (
                        // Card with image background
                        <ImageBackground
                          source={{uri: imageUrl}}
                          style={styles.notificationWithImage}
                          imageStyle={styles.backgroundImage}>
                          <LinearGradient
                            colors={[colors.background.primary, 'transparent']}
                            useAngle
                            angle={90}
                            style={styles.gradientOverlay}
                          />

                          <View style={styles.notificationHeader}>
                            <View style={styles.notificationContent}>
                              <Text
                                style={[
                                  styles.notificationTitle,
                                  !item.opened &&
                                    styles.notificationTitleUnread,
                                ]}
                                numberOfLines={2}>
                                {item.title || 'Notification'}
                              </Text>
                              {item.body && (
                                <Text
                                  style={styles.notificationBody}
                                  numberOfLines={3}>
                                  {item.body}
                                </Text>
                              )}
                              <View style={styles.notificationFooter}>
                                <Text style={styles.notificationTime}>
                                  {formatDate(item.receivedAt)}
                                </Text>
                              </View>
                            </View>
                          </View>
                        </ImageBackground>
                      ) : (
                        // Card without image
                        <View style={styles.notificationHeader}>
                          <View style={styles.notificationContent}>
                            <Text
                              style={[
                                styles.notificationTitle,
                                !item.opened && styles.notificationTitleUnread,
                              ]}
                              numberOfLines={2}>
                              {item.title || 'Notification'}
                            </Text>
                            {item.body && (
                              <Text
                                style={styles.notificationBody}
                                numberOfLines={3}>
                                {item.body}
                              </Text>
                            )}
                            <View style={styles.notificationFooter}>
                              <Text style={styles.notificationTime}>
                                {formatDate(item.receivedAt)}
                              </Text>
                            </View>
                          </View>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ),
          )
        ) : (
          <View style={styles.emptyState}>
            <Image
              source={require('../assets/notificationOff.png')}
              style={{
                width: isTablet ? width / 3 : width / 2,
                height: isTablet ? width / 3 : width / 2,
              }}
            />
            <Text style={styles.emptyTitle}>
              {hasPermission ? 'No notifications yet' : 'Let the bell ring'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {hasPermission
                ? "You'll see your notifications here when you receive them"
                : 'Turn on the notification to get your cherry picks, updates and more'}
            </Text>

            {!hasPermission && (
              <TouchableOpacity
                style={styles.enableButton}
                onPress={handleEnableNotifications}
                disabled={isEnabling}>
                {isEnabling ? (
                  <ActivityIndicator size="small" color={colors.text.primary} />
                ) : (
                  <Text style={styles.enableButtonText}>
                    Turn On Notifications
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
        <View style={styles.footer} />
      </ScrollView>
      <NotificationSettingsModal
        visible={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onUpdate={loadData}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  header: {
    paddingHorizontal: spacing.md,
    marginTop: 60, // Match MyFilters
    marginBottom: spacing.md,
    zIndex: 10,
  },
  headerTitle: {
    color: colors.text.primary,
    ...typography.h2,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: 4,
    marginLeft: -4,
  },
  actionsScroll: {
    flexGrow: 0,
  },
  actionsContainer: {
    gap: spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.modal.blur,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12, // Match MyFilters/Watchlists
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.modal.content,
    gap: 8,
  },
  actionButtonText: {
    color: colors.text.primary,
    ...typography.button,
    fontSize: 14,
  },
  iconButtonDisabled: {
    opacity: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  dateGroup: {
    marginTop: spacing.lg,
  },
  dateGroupTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notificationCard: {
    backgroundColor: colors.background.primary,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.modal.content,
    overflow: 'hidden',
  },
  notificationWithImage: {
    width: '100%',
    position: 'relative',
  },
  backgroundImage: {
    borderRadius: borderRadius.md,
    width: '60%',
    left: '40%',
    opacity: 0.5,
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '40%', // Start from image start
    width: '100%', // Match image width
  },
  notificationHeader: {
    flexDirection: 'row',
    padding: spacing.md,
  },
  notificationIconContainer: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
  notificationTitleUnread: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  notificationBody: {
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  notificationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notificationTime: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 3,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.secondary,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    height: 40,
  },
  enableButton: {
    marginTop: spacing.xl,
    backgroundColor: colors.modal.blur,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.modal.content,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.round,
  },
  enableButtonText: {
    color: colors.text.primary,
    fontWeight: '600',
    fontSize: 12,
  },
});
