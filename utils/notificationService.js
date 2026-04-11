import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { supabase } from '../supabase';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register for push notifications and get expo push token
 * @returns {Promise<string|null>} The expo push token
 */
export const registerForPushNotifications = async () => {
  if (!Device.isDevice) {
    console.log('Must use physical device for push notifications');
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return null;
  }
};

/**
 * Save expo push token to Supabase
 * @param {string} userId - The user ID
 * @param {string} expoPushToken - The expo push token
 */
export const savePushToken = async (userId, expoPushToken) => {
  if (!expoPushToken) return;

  try {
    const { error } = await supabase
      .from('expo_push_tokens')
      .upsert(
        {
          user_id: userId,
          expo_push_token: expoPushToken,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (error) {
      console.error('Error saving push token:', error);
    }
  } catch (error) {
    console.error('Error saving push token:', error);
  }
};

/**
 * Send a notification to the app
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Additional notification data
 */
export const sendLocalNotification = async (title, body, data = {}) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        badge: 1,
      },
      trigger: null, // Immediately
    });
  } catch (error) {
    console.error('Error sending local notification:', error);
  }
};

/**
 * Create a notification record in the database
 * @param {string} userId - The user ID to notify
 * @param {string} type - Type of notification (follow, comment, message, etc.)
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Additional data to store
 */
export const createNotification = async (userId, type, title, body, data = {}) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.warn('No active session, skipping notification');
      return null;
    }

    // ✅ Use RPC with SECURITY DEFINER — bypasses RLS completely
    const { error } = await supabase.rpc('create_notification', {
      p_user_id: userId,
      p_type: type,
      p_title: title,
      p_body: body,
      p_data: data,
    });

    if (error) {
      console.error('Error creating notification:', error);
      return null;
    }

    return true;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};
/**
 * Mark a notification as read
 * @param {string} notificationId - The notification ID
 */
export const markNotificationAsRead = async (notificationId) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
    }
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
};

/**
 * Mark all notifications as read for a user
 * @param {string} userId - The user ID
 */
export const markAllNotificationsAsRead = async (userId) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
    }
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
  }
};

/**
 * Get unread notification count for a user
 * @param {string} userId - The user ID
 */
export const getUnreadNotificationCount = async (userId) => {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
};

/**
 * Fetch notifications for a user
 * @param {string} userId - The user ID
 * @param {number} limit - Number of notifications to fetch
 * @param {number} offset - Offset for pagination
 */
export const fetchNotifications = async (userId, limit = 20, offset = 0) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
};

/**
 * Delete a notification
 * @param {string} notificationId - The notification ID
 */
export const deleteNotification = async (notificationId) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      console.error('Error deleting notification:', error);
    }
  } catch (error) {
    console.error('Error deleting notification:', error);
  }
};

/**
 * Delete all notifications for a user
 * @param {string} userId - The user ID
 */
export const deleteAllNotifications = async (userId) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting all notifications:', error);
    }
  } catch (error) {
    console.error('Error deleting all notifications:', error);
  }
};
