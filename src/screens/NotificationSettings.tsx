import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ImageBackground,
} from 'react-native';
import {notificationService} from '../services/NotificationService';
import {navigate} from '../services/NavigationService';
import {colors, spacing, typography, borderRadius} from '../styles/theme';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import {useResponsive} from '../hooks/useResponsive';
import {BlurPreference} from '../store/blurPreference';

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
  const [refreshing, setRefreshing] = useState(false);
  const {isTablet} = useResponsive();
  const themeMode = BlurPreference.getMode();
  const isSolid = themeMode === 'normal';

  const loadData = async () => {
    try {
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

  const handleClearAll = async () => {
    await notificationService.clearAllNotifications();
    setHistory([]);
  };

  return (
    <View style={styles.container}>
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
        {/* Header (Inside ScrollView) */}
        <View style={styles.header}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              zIndex: 1,
            }}>
            <TouchableOpacity
              activeOpacity={1}
              style={{
                backgroundColor: isSolid
                  ? colors.modal.blur
                  : 'rgba(122, 122, 122, 0.25)',
                padding: isTablet ? 12 : 10,
                borderRadius: borderRadius.round,
                borderColor: colors.modal.content,
                borderWidth: 1,
                borderBottomWidth: 0,
              }}
              onPress={() => navigation.goBack()}>
              <Icon
                name="chevron-back-outline"
                size={isTablet ? 20 : 16}
                color={colors.text.primary}
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Notifications</Text>
            <TouchableOpacity
              activeOpacity={1}
              style={{
                backgroundColor: isSolid
                  ? colors.modal.blur
                  : 'rgba(122, 122, 122, 0.25)',
                padding: isTablet ? 12 : 10,
                borderRadius: borderRadius.round,
                borderColor: colors.modal.content,
                borderWidth: 1,
                borderBottomWidth: 0,
              }}
              onPress={handleClearAll}>
              <Icon
                name="trash-outline"
                size={isTablet ? 20 : 16}
                color={colors.text.primary}
              />
            </TouchableOpacity>
          </View>
        </View>

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
            <Icon
              name="notifications-off-outline"
              size={64}
              color={colors.text.tertiary}
            />
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySubtitle}>
              You'll see your notifications here when you receive them
            </Text>
          </View>
        )}
        <View style={styles.footer} />
      </ScrollView>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    marginTop: 50, // Match MyFilters marginTop
    marginBottom: spacing.md,
  },
  headerTitle: {
    flex: 1,
    ...typography.h2,
    textAlign: 'center', // Center title like MyFilters
    color: colors.text.primary,
  },
  iconButton: {
    backgroundColor: colors.modal.blur,
    padding: 10,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.modal.content,
    alignItems: 'center',
    justifyContent: 'center',
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
    color: colors.text.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    height: 40,
  },
});
