import messaging from '@react-native-firebase/messaging';
import {PermissionsAndroid, Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {navigate} from './NavigationService';
import notifee, {AndroidImportance, AndroidStyle} from '@notifee/react-native';

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
        id: 'la_theater_v13',
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
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('🚀 Notification opened from quit:', remoteMessage);
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
        if (type === 1) {
          // PRESS
          console.log('👆 Notifee notification pressed (foreground):', detail);
          if (detail.notification?.data) {
            // Mark as read - extract messageId from data
            const messageId =
              detail.notification.id || detail.notification.data.messageId;
            if (messageId && typeof messageId === 'string') {
              this.markNotificationAsRead(messageId);
            }
            this.handleNotificationNavigation({data: detail.notification.data});
          }
        }
      });

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
      console.log(`✅ Subscribed to topic: ${topic}`);
      return true;
    } catch (error) {
      console.error(`Error subscribing to topic:`, error);
      return false;
    }
  }
}

export const notificationService = new NotificationService();
