import messaging from '@react-native-firebase/messaging';
import {PermissionsAndroid, Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {navigate} from './NavigationService';
import notifee, {
  AndroidImportance,
  AndroidStyle,
  EventType,
} from '@notifee/react-native';

// Storage keys
const STORAGE_KEYS = {
  NOTIFICATION_HISTORY: 'notification_history',
};

// Valid navigation screens
const VALID_SCREENS = [
  'MovieDetails',
  'TVShowDetails',
  'Home',
  'Search',
  'Collections',
  'Profile',
  'AIChat',
] as const;

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

class NotificationService {
  /**
   * Create notification channel for Android
   */
  async createNotificationChannel() {
    if (Platform.OS === 'android') {
      await notifee.createChannel({
        id: 'la_theater',
        name: 'Main Notifications',
        importance: AndroidImportance.HIGH,
      });
    }
  }

  /**
   * Display notification with Notifee (supports images)
   */
  async displayNotification(remoteMessage: any) {
    try {
      await this.createNotificationChannel();

      // Support both notification payload and data-only payload
      const title =
        remoteMessage.notification?.title ||
        remoteMessage.data?.title ||
        'Notification';
      const body =
        remoteMessage.notification?.body || remoteMessage.data?.body || '';

      // Try multiple image URL sources
      const imageUrl =
        remoteMessage.data?.imageUrl || // Data-only payload (preferred)
        remoteMessage.notification?.image || // FCM notification payload
        remoteMessage.notification?.android?.imageUrl ||
        remoteMessage.notification?.ios?.imageUrl ||
        null;

      await notifee.displayNotification({
        title,
        body,
        data: {
          ...remoteMessage.data,
          messageId: remoteMessage.messageId,
        },
        android: {
          channelId: 'la_theater',
          importance: AndroidImportance.HIGH,
          smallIcon: 'ic_notification', // Explicitly use the transparent icon
          color: '#FFFFFF',
          colorized: true,
          circularLargeIcon: true,
          largeIcon: imageUrl || undefined,
          style: imageUrl
            ? ({
                type: AndroidStyle.BIGPICTURE,
                picture: imageUrl,
              } as any)
            : undefined,
          pressAction: {
            id: 'default',
          },
        },
      });

      console.log('✅ Notification displayed:', {title, hasImage: !!imageUrl});
    } catch (error) {
      console.error('Error displaying notification:', error);
    }
  }

  /**
   * Request notification permissions
   */
  async requestUserPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;
        return enabled;
      } else if (Platform.OS === 'android') {
        if (Platform.Version >= 33) {
          const result = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          );
          return result === PermissionsAndroid.RESULTS.GRANTED;
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  /**
   * Check STRICTLY the System/OS permission status
   */
  async checkSystemPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        return await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
      }
      const authStatus = await messaging().hasPermission();
      return (
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL
      );
    } catch (error) {
      console.error('Error checking system permission:', error);
      return false;
    }
  }

  /**
   * Check if user has opted in to notifications (app-level)
   */
  async isOptedIn(): Promise<boolean> {
    const topics = await this.getSubscribedTopics();
    return topics.length > 0;
  }

  /**
   * Check if notification permissions are granted (System + App Level)
   */
  async checkPermission(): Promise<boolean> {
    try {
      // 1. Check System Permission
      let systemGranted = false;
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        systemGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
      } else {
        const authStatus = await messaging().hasPermission();
        systemGranted =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      }

      if (!systemGranted) return false;

      // 2. Check App Level Preference (Opt-in)
      // If user turned off "Allow Notifications" in app settings, we treat it as no permission
      return await this.isOptedIn();
    } catch (error) {
      console.error('Error checking notification permission:', error);
      return false;
    }
  }

  /**
   * Handle notification navigation
   */
  handleNotificationNavigation = (remoteMessage: any) => {
    console.log(
      '🔍 Full remoteMessage:',
      JSON.stringify(remoteMessage, null, 2),
    );

    if (!remoteMessage?.data?.screen) {
      console.warn('⚠️ Notification missing screen data, cannot navigate');
      console.warn('Available data:', remoteMessage?.data);
      return;
    }

    const {screen, ...params} = remoteMessage.data;

    // Auto-correct common screen name variations (case-insensitive)
    let correctedScreen = screen;
    if (screen.toLowerCase() === 'tvshowdetails') {
      correctedScreen = 'TVShowDetails';
    } else if (screen.toLowerCase() === 'moviedetails') {
      correctedScreen = 'MovieDetails';
    }

    // Validate screen
    if (!VALID_SCREENS.includes(correctedScreen)) {
      console.warn(`⚠️ Invalid navigation screen: ${screen}`);
      console.warn('Valid screens:', VALID_SCREENS);
      return;
    }

    // Auto-convert numeric ID strings to numbers
    const cleanParams: any = {...params};
    if (cleanParams.movieId) {
      cleanParams.movieId = parseInt(cleanParams.movieId, 10);
    }
    if (cleanParams.id) {
      cleanParams.id = parseInt(cleanParams.id, 10);
    }
    if (cleanParams.tvShowId) {
      cleanParams.tvShowId = parseInt(cleanParams.tvShowId, 10);
    }

    // Validate required parameters for detail screens
    if (correctedScreen === 'MovieDetails' && !cleanParams.movieId) {
      console.error('❌ MovieDetails requires movieId parameter');
      console.error('Available params:', cleanParams);
      return;
    }
    if (correctedScreen === 'TVShowDetails' && !cleanParams.tvShowId) {
      console.error('❌ TVShowDetails requires tvShowId parameter');
      console.error('Available params:', cleanParams);
      return;
    }

    // Mark notification as read when tapped
    if (remoteMessage.messageId) {
      this.markNotificationAsRead(remoteMessage.messageId);
    }

    console.log(
      `🧭 Navigating to ${correctedScreen} with params:`,
      cleanParams,
    );
    try {
      navigate(correctedScreen as any, cleanParams);
      console.log('✅ Navigation successful');
    } catch (error) {
      console.error('❌ Navigation error:', error);
    }
  };

  /**
   * Save notification to history
   */
  private async saveNotificationToHistory(
    remoteMessage: any,
    state: 'foreground' | 'background' | 'quit',
  ) {
    try {
      const history = await this.getNotificationHistory();

      // Extract image URL from FCM notification or data payload
      const imageUrl =
        remoteMessage.data?.imageUrl || // Data-only payload (preferred)
        remoteMessage.notification?.image ||
        remoteMessage.notification?.android?.imageUrl ||
        remoteMessage.notification?.ios?.imageUrl ||
        null;

      const title =
        remoteMessage.notification?.title || remoteMessage.data?.title;
      const body = remoteMessage.notification?.body || remoteMessage.data?.body;

      // Skip invalid notifications
      if (!title && !body) {
        console.log(
          '⚠️ Skipping saving empty notification:',
          remoteMessage.messageId,
        );
        return;
      }

      const item: NotificationHistoryItem = {
        id: remoteMessage.messageId || Date.now().toString(),
        title,
        body,
        imageUrl: imageUrl,
        data: remoteMessage.data || {},
        receivedAt: new Date().toISOString(),
        opened: false,
        state,
      };

      // Check for duplicates - don't save if already exists
      const isDuplicate = history.some(h => h.id === item.id);
      if (isDuplicate) {
        console.log('⚠️ Skipping duplicate notification:', item.id);
        return;
      }

      history.unshift(item);
      const trimmed = history.slice(0, 50);
      await AsyncStorage.setItem(
        STORAGE_KEYS.NOTIFICATION_HISTORY,
        JSON.stringify(trimmed),
      );
    } catch (error) {
      console.error('Error saving notification:', error);
    }
  }

  /**
   * Get notification history
   */
  async getNotificationHistory(): Promise<NotificationHistoryItem[]> {
    try {
      const stored = await AsyncStorage.getItem(
        STORAGE_KEYS.NOTIFICATION_HISTORY,
      );
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    }
    return [];
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    try {
      const history = await this.getNotificationHistory();
      const updatedHistory = history.map(item => ({
        ...item,
        opened: true,
        openedAt: new Date().toISOString(),
      }));
      await AsyncStorage.setItem(
        STORAGE_KEYS.NOTIFICATION_HISTORY,
        JSON.stringify(updatedHistory),
      );
      console.log('✅ Marked all notifications as read');
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  }

  /**
   * Check if there are unread notifications
   */
  async hasUnreadNotifications(): Promise<boolean> {
    try {
      const history = await this.getNotificationHistory();
      return history.some(item => !item.opened);
    } catch (error) {
      console.error('Error checking unread notifications:', error);
      return false;
    }
  }

  /**
   * Clear all notification history
   */
  async clearAllNotifications(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.NOTIFICATION_HISTORY);
      console.log('✅ Cleared all notifications');
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }

  /**
   * Mark a specific notification as read
   */
  markNotificationAsRead = async (messageId: string): Promise<void> => {
    try {
      console.log('🔵 Attempting to mark as read:', messageId);
      const history = await this.getNotificationHistory();
      console.log('📋 Current history count:', history.length);
      console.log(
        '📋 History IDs:',
        history.map(h => h.id),
      );

      const updatedHistory = history.map(item => {
        if (item.id === messageId) {
          console.log('✅ Found matching notification:', item.title);
          return {...item, opened: true, openedAt: new Date().toISOString()};
        }
        return item;
      });

      await AsyncStorage.setItem(
        STORAGE_KEYS.NOTIFICATION_HISTORY,
        JSON.stringify(updatedHistory),
      );
      console.log('✅ Marked notification as read:', messageId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  /**
   * Listen for notifications
   */
  listen() {
    // Background messages - FCM auto-displays with image, we just save to history
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log('📨 Background notification received:', remoteMessage);
      // Don't display - FCM already shows it with image
      await this.saveNotificationToHistory(remoteMessage, 'background');
    });

    // Foreground messages - Display with Notifee (FCM doesn't show in foreground on Android)
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      console.log('📬 Foreground notification received:', remoteMessage);
      // Display with Notifee since FCM doesn't show in foreground
      await this.displayNotification(remoteMessage);
      await this.saveNotificationToHistory(remoteMessage, 'foreground');
    });

    // App opened from background - HANDLE NAVIGATION
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('👆 Notification opened from background:', remoteMessage);
      this.handleNotificationNavigation(remoteMessage);
    });

    // App opened from quit state - HANDLE NAVIGATION
    messaging()
      .getInitialNotification()
      .then(async remoteMessage => {
        if (remoteMessage) {
          console.log('🚀 Notification opened from quit:', remoteMessage);

          // Save to history (since background handler doesn't run when app is killed)
          await this.saveNotificationToHistory(remoteMessage, 'quit');

          // Mark as read
          if (remoteMessage.messageId) {
            this.markNotificationAsRead(remoteMessage.messageId);
          }
          // Delay navigation to ensure app is ready
          setTimeout(() => {
            this.handleNotificationNavigation(remoteMessage);
          }, 1000);
        }
      });

    return unsubscribe;
  }

  /**
   * Bootstrap
   */
  async onAppBootstrap() {
    try {
      if (Platform.OS === 'android') {
        await messaging().registerDeviceForRemoteMessages();
      }
      await this.createNotificationChannel();

      // Get and Log FCM Token
      const token = await messaging().getToken();
      console.log('🔥 FCM Token:', token);

      // Handle foreground Notifee events (when user taps notification while app is open)
      notifee.onForegroundEvent(({type, detail}) => {
        if (type === EventType.PRESS) {
          // PRESS
          console.log('👆 Notifee notification pressed (foreground):', detail);
          if (detail.notification?.data) {
            // Mark as read - extract messageId from data
            const messageId =
              detail.notification.id || detail.notification.data.messageId;
            if (messageId && typeof messageId === 'string') {
              this.markNotificationAsRead(messageId);
            }
            // Navigate AFTER a small delay to ensure navigation container is ready
            setTimeout(() => {
              this.handleNotificationNavigation({
                data: detail.notification?.data,
              });
            }, 500);
          }
        }
      });

      // Handle Background Launch (Cold Start via Notifee)
      const initialNotification = await notifee.getInitialNotification();
      if (initialNotification) {
        console.log(
          '🚀 App launched via Notifee notification:',
          initialNotification,
        );
        const {notification} = initialNotification;
        if (notification.data) {
          // Delay navigation slightly to allow app to hydrate
          setTimeout(() => {
            this.handleNotificationNavigation({data: notification.data});
          }, 1200);
        }
      }

      console.log('✅ Notification service initialized');
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  }

  /**
   * Subscribe to topic
   */
  async subscribeToTopic(topic: string): Promise<boolean> {
    try {
      await messaging().subscribeToTopic(topic);
      await this.saveSubscriptionState(topic, true);
      console.log(`✅ Subscribed to topic: ${topic}`);
      return true;
    } catch (error) {
      console.error(`Error subscribing to topic:`, error);
      return false;
    }
  }

  /**
   * Unsubscribe from topic
   */
  async unsubscribeFromTopic(topic: string): Promise<boolean> {
    try {
      await messaging().unsubscribeFromTopic(topic);
      await this.saveSubscriptionState(topic, false);
      console.log(`✅ Unsubscribed from topic: ${topic}`);
      return true;
    } catch (error) {
      console.error(`Error unsubscribing from topic:`, error);
      return false;
    }
  }

  /**
   * Save subscription state
   */
  private async saveSubscriptionState(topic: string, isSubscribed: boolean) {
    try {
      const subscriptions = await this.getSubscribedTopics();
      if (isSubscribed) {
        if (!subscriptions.includes(topic)) {
          subscriptions.push(topic);
        }
      } else {
        const index = subscriptions.indexOf(topic);
        if (index > -1) {
          subscriptions.splice(index, 1);
        }
      }
      await AsyncStorage.setItem(
        'notification_subscriptions',
        JSON.stringify(subscriptions),
      );
    } catch (error) {
      console.error('Error saving subscription state:', error);
    }
  }

  /**
   * Get all subscribed topics
   */
  async getSubscribedTopics(): Promise<string[]> {
    try {
      const stored = await AsyncStorage.getItem('notification_subscriptions');
      if (stored) {
        return JSON.parse(stored);
      }
      // Default subscriptions if nothing stored (first run)
      return ['all', 'trending'];
    } catch (error) {
      console.error('Error getting subscribed topics:', error);
      return [];
    }
  }

  /**
   * Check if subscribed to topic
   */
  async isSubscribedToTopic(topic: string): Promise<boolean> {
    const topics = await this.getSubscribedTopics();
    return topics.includes(topic);
  }

  /**
   * Initialize subscriptions on app launch, respecting user preferences
   */
  async initializeSubscriptions(region?: string) {
    const hasSystemPermission = await this.checkSystemPermission();
    let topics = await this.getSubscribedTopics();

    // Auto-subscribe if system permission is enabled but no topics subscribed
    if (hasSystemPermission && topics.length === 0) {
      console.log(
        'Auto-subscribing to defaults due to enabled system permission',
      );
      await this.subscribeToTopic('all');
      await this.subscribeToTopic('trending');
      if (region) {
        await this.subscribeToTopic(region);
      }
      // Refresh topics list after auto-subscription
      topics = await this.getSubscribedTopics();
    }

    // Standard Sync: Subscribe to stored topics
    for (const topic of topics) {
      await messaging().subscribeToTopic(topic);
    }

    // Handle region: Subscribe if "trending" is enabled
    // We treat region-specific updates as part of the "Trending" category now
    if (region && topics.includes('trending')) {
      await messaging().subscribeToTopic(region);
      console.log(`✅ Subscribed to region topic: ${region}`);
    }
  }
  /**
   * Schedule a notification for a future release
   */
  async scheduleReleaseNotification(
    id: string,
    title: string,
    body: string,
    date: Date,
    data: any,
    imageUrl?: string | null,
  ): Promise<string> {
    try {
      // Create a trigger notification
      const trigger: any = {
        type: 0, // TimestampTrigger in Notifee (TriggerType.TIMESTAMP = 0)
        timestamp: date.getTime(),
      };

      // Validate imageUrl - must be a valid HTTP/HTTPS URL
      const validImageUrl =
        imageUrl &&
        (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))
          ? imageUrl
          : undefined;

      await notifee.createTriggerNotification(
        {
          id,
          title,
          body,
          data,
          android: {
            channelId: 'la_theater', // Use existing channel
            importance: AndroidImportance.HIGH,
            smallIcon: 'ic_notification',
            color: '#FFFFFF',
            pressAction: {
              id: 'default',
            },
            largeIcon: validImageUrl,
            style: validImageUrl
              ? ({
                  type: AndroidStyle.BIGPICTURE,
                  picture: validImageUrl,
                } as any)
              : undefined,
          },
        },
        trigger,
      );

      console.log(`✅ Scheduled notification for ${date.toISOString()}`);
      return id;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      throw error;
    }
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelScheduledNotification(id: string): Promise<void> {
    try {
      await notifee.cancelNotification(id);
      console.log(`✅ Cancelled notification: ${id}`);
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  }

  /**
   * Schedule a notification (generic)
   */
  async scheduleNotification(
    title: string,
    body: string,
    delayMs: number = 0,
    data: any = {},
  ) {
    const date = new Date(Date.now() + delayMs);
    const trigger: any = {
      type: 0,
      timestamp: date.getTime(),
    };

    await notifee.createTriggerNotification(
      {
        title,
        body,
        data,
        android: {
          channelId: 'la_theater',
          importance: AndroidImportance.HIGH,
          smallIcon: 'ic_notification',
          color: '#FFFFFF',
          pressAction: {
            id: 'default',
          },
        },
      },
      trigger,
    );
  }
}

export const notificationService = new NotificationService();
