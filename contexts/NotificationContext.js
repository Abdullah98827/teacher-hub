import * as Notifications from 'expo-notifications';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase';
import {
  deleteAllNotifications,
  deleteNotification,
  fetchNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  registerForPushNotifications,
  savePushToken,
} from '../utils/notificationService';

const NotificationContext = createContext({
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  fetchUserNotifications: async () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  deleteNotif: async () => {},
  deleteAll: async () => {},
  refreshNotifications: async () => {},
});

export const NotificationProvider = ({ children, userId }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Setup push notifications and real-time listeners
  useEffect(() => {
    if (!userId) return;

    const setupNotifications = async () => {
      try {
        // Register for push notifications
        const token = await registerForPushNotifications();
        if (token) {
          await savePushToken(userId, token);
        }

        // Initial fetch of notifications
        setLoading(true);
        try {
          const data = await fetchNotifications(userId, 20, 0);
          setNotifications(data);
          const count = await getUnreadNotificationCount(userId);
          setUnreadCount(count);
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }

        // Subscribe to notification changes in real-time
        const subscription = supabase
          .channel(`notifications:user:${userId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${userId}`,
            },
            async (payload) => {
              if (payload.eventType === 'INSERT') {
                setNotifications((prev) => [payload.new, ...prev]);
                setUnreadCount((prev) => prev + 1);
              } else if (payload.eventType === 'UPDATE') {
                setNotifications((prev) =>
                  prev.map((n) =>
                    n.id === payload.new.id ? payload.new : n
                  )
                );
                // Update unread count if is_read status changed
                if (payload.old.is_read !== payload.new.is_read) {
                  setUnreadCount((prev) =>
                    payload.new.is_read ? Math.max(0, prev - 1) : prev + 1
                  );
                }
              } else if (payload.eventType === 'DELETE') {
                setNotifications((prev) =>
                  prev.filter((n) => n.id !== payload.old.id)
                );
              }
            }
          )
          .subscribe();

        return () => {
          subscription.unsubscribe();
        };
      } catch (err) {
        setError(err.message);
        console.error('Error setting up notifications:', err);
      }
    };

    setupNotifications();
  }, [userId]);

  // Handle incoming notifications when app is in foreground
  useEffect(() => {
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
      }
    );

    const responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification response:', response);
        // Handle notification tap
      }
    );

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  const fetchUserNotifications = useCallback(
    async (limit = 20, offset = 0) => {
      if (!userId) return;
      setLoading(true);
      try {
        const data = await fetchNotifications(userId, limit, offset);
        setNotifications(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  const refreshNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      await fetchUserNotifications();
      const count = await getUnreadNotificationCount(userId);
      setUnreadCount(count);
    } catch (err) {
      setError(err.message);
    }
  }, [userId, fetchUserNotifications]);

  const markAsRead = useCallback(
    async (notificationId) => {
      if (!userId) return;
      try {
        await markNotificationAsRead(notificationId);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, is_read: true } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        setError(err.message);
      }
    },
    [userId]
  );

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    try {
      await markAllNotificationsAsRead(userId);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      setError(err.message);
    }
  }, [userId]);

  const deleteNotif = useCallback(
    async (notificationId) => {
      if (!userId) return;
      try {
        await deleteNotification(notificationId);
        const notif = notifications.find((n) => n.id === notificationId);
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
        if (notif && !notif.is_read) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      } catch (err) {
        setError(err.message);
      }
    },
    [userId, notifications]
  );

  const deleteAll = useCallback(async () => {
    if (!userId) return;
    try {
      await deleteAllNotifications(userId);
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      setError(err.message);
    }
  }, [userId]);

  const value = {
    notifications,
    unreadCount,
    loading,
    error,
    fetchUserNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotif,
    deleteAll,
    refreshNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};
