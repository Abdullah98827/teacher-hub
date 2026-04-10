import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNotifications } from '../contexts/NotificationContext';
import { useAppTheme } from '../hooks/useAppTheme';

const NotificationCenter = ({ onClose }) => {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotif,
    deleteAll,
    refreshNotifications,
  } = useNotifications();

  const { isDark } = useAppTheme();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshNotifications();
    setRefreshing(false);
  };

  const handleNotificationPress = (notification) => {
    // Mark as read
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    // Navigate based on notification type
    const { type, data } = notification;

    try {
      switch (type) {
        case 'comment':
          // Navigate to resources tab with the resource selected and comments tab active
          if (data?.resource_id) {
            onClose?.();
            router.push(`/(tabs)/resources?openResourceId=${data.resource_id}&activeTab=comments`);
          }
          break;

        case 'rating':
          // Navigate to resources tab with the resource selected and ratings tab active
          if (data?.resource_id) {
            onClose?.();
            router.push(`/(tabs)/resources?openResourceId=${data.resource_id}&activeTab=ratings`);
          }
          break;

        case 'message':
          // Navigate to direct messages with that user
          if (data?.sender_id) {
            onClose?.();
            router.push(`/dm/${data.sender_id}`);
          }
          break;

        case 'group_message':
          // Navigate to group chat
          if (data?.group_id) {
            onClose?.();
            router.push(`/group-chat/${data.group_id}`);
          }
          break;

        case 'upload':
          // Navigate to the uploaded resource
          if (data?.resource_id) {
            onClose?.();
            router.push(`/(tabs)/resources?openResourceId=${data.resource_id}`);
          }
          break;

        case 'favorite':
          // Navigate to the resource
          if (data?.resource_id) {
            onClose?.();
            router.push(`/(tabs)/resources?openResourceId=${data.resource_id}`);
          }
          break;

        // Admin notifications - route to admin screens
        case 'admin_new_report':
          // Navigate to manage reports
          if (data?.reportedUserId) {
            onClose?.();
            router.push('/admin/manage-reports');
          }
          break;

        case 'admin_resource_pending':
          // Navigate to manage resources for approval
          if (data?.resourceId) {
            onClose?.();
            router.push('/admin/manage-resources');
          }
          break;

        case 'admin_teacher_verification':
          // Navigate to teacher verification screen
          if (data?.teacherId) {
            onClose?.();
            router.push('/admin/verify');
          }
          break;

        case 'admin_contact_request':
          // Navigate to contact requests
          if (data?.requesterId) {
            onClose?.();
            router.push('/admin/manage-contact-requests');
          }
          break;

        case 'admin_resource_flagged':
          // Navigate to manage reports (where flagged resources are handled)
          if (data?.resourceId) {
            onClose?.();
            router.push('/admin/manage-reports');
          }
          break;

        case 'admin_user_reported':
          // Navigate to manage users
          if (data?.userId) {
            onClose?.();
            router.push('/admin/manage-users');
          }
          break;

        case 'admin_comment_reported':
          // Navigate to manage comments
          if (data?.resourceId) {
            onClose?.();
            router.push('/admin/manage-comments');
          }
          break;

        case 'admin_user_reported_direct':
          // Navigate to manage users with specific user highlighted
          if (data?.reportedUserId) {
            onClose?.();
            router.push('/admin/manage-users');
          }
          break;

        case 'followers_resource_uploaded':
          // Navigate to view the resource
          if (data?.resourceId) {
            onClose?.();
            router.push(`/(tabs)/resources?openResourceId=${data.resourceId}`);
          }
          break;

        // Non-clickable notifications
        case 'follow':
        case 'unfollow':
        case 'verification':
        case 'membership':
        case 'report':
        case 'admin_suspicious_activity':
        case 'admin_report_resolved':
          // These are not clickable - just stay in notifications
          break;

        default:
          break;
      }
    } catch (error) {
      console.error('Error navigating from notification:', error);
    }
  };

  const handleDelete = (notificationId) => {
    Alert.alert('Delete Notification', 'Are you sure?', [
      { text: 'Cancel' },
      {
        text: 'Delete',
        onPress: () => deleteNotif(notificationId),
        style: 'destructive',
      },
    ]);
  };

  const handleMarkAllAsRead = () => {
    if (unreadCount > 0) {
      markAllAsRead();
    }
  };

  const handleDeleteAll = () => {
    Alert.alert('Delete All Notifications', 'This action cannot be undone.', [
      { text: 'Cancel' },
      {
        text: 'Delete All',
        onPress: () => deleteAll(),
        style: 'destructive',
      },
    ]);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'follow':
        return 'person-add';
      case 'comment':
        return 'chatbubble';
      case 'rating':
        return 'star';
      case 'message':
        return 'mail';
      case 'upload':
        return 'cloud-upload';
      case 'verification':
        return 'checkmark-circle';
      case 'membership':
        return 'card';
      // Admin notifications
      case 'admin_new_report':
      case 'admin_resource_flagged':
        return 'flag';
      case 'admin_resource_pending':
        return 'checkmark-outline';
      case 'admin_teacher_verification':
        return 'school';
      case 'admin_contact_request':
        return 'mail-open';
      case 'admin_user_reported':
      case 'admin_user_reported_direct':
        return 'alert-circle';
      case 'admin_comment_reported':
        return 'chatbubble-outline';
      case 'admin_suspicious_activity':
        return 'warning';
      case 'admin_report_resolved':
        return 'checkmark-done';
      case 'followers_resource_uploaded':
        return 'cloud-download';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'follow':
        return '#FF6B6B';
      case 'comment':
        return '#4ECDC4';
      case 'rating':
        return '#FFE66D';
      case 'message':
        return '#95E1D3';
      case 'upload':
        return '#A8E6CF';
      case 'verification':
        return '#51CF66';
      case 'membership':
        return '#9775FA';
      // Admin notifications - distinctive colors
      case 'admin_new_report':
      case 'admin_resource_flagged':
        return '#EF4444'; // Red for reports/flags
      case 'admin_resource_pending':
        return '#F97316'; // Orange for pending
      case 'admin_teacher_verification':
        return '#3B82F6'; // Blue for verification
      case 'admin_contact_request':
        return '#8B5CF6'; // Purple for contact
      case 'admin_user_reported':
      case 'admin_user_reported_direct':
        return '#DC2626'; // Dark red for user reports
      case 'admin_comment_reported':
        return '#F59E0B'; // Amber for comment reports
      case 'admin_suspicious_activity':
        return '#EA580C'; // Orange red for suspicious
      case 'admin_report_resolved':
        return '#10B981'; // Green for resolved
      case 'followers_resource_uploaded':
        return '#06B6D4'; // Cyan for follower updates
      default:
        return '#22d3ee';
    }
  };

  const isNotificationClickable = (type) => {
    const clickableTypes = [
      'comment', 'rating', 'message', 'group_message', 'upload', 'favorite',
      'admin_new_report', 'admin_resource_pending', 'admin_teacher_verification',
      'admin_contact_request', 'admin_resource_flagged', 'admin_user_reported',
      'admin_comment_reported', 'admin_user_reported_direct', 'followers_resource_uploaded'
    ];
    return clickableTypes.includes(type);
  };

  const NotificationItem = ({ item }) => {
    const isClickable = isNotificationClickable(item.type);

    return (
            <TouchableOpacity
        onPress={() => isClickable && handleNotificationPress(item)}
        disabled={!isClickable}
        activeOpacity={isClickable ? 0.7 : 1}
        className={`flex-row items-center px-4 py-3 border-b ${
          item.is_read
            ? `bg-${isDark ? 'gray-900' : 'gray-50'} border-${isDark ? 'gray-800' : 'gray-200'}`
            : `bg-${isDark ? 'cyan-900' : 'cyan-50'} border-${isDark ? 'cyan-800' : 'cyan-200'}`
        }`}
        style={{
          backgroundColor: item.is_read
            ? isDark ? '#111827' : '#F9FAFB'
            : isDark ? '#0C3F47' : '#ECFDF5',
          borderBottomColor: isDark ? '#1F2937' : '#E5E7EB',
        }}
      >
        {/* Icon */}
        <View
          className="w-10 h-10 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: getNotificationColor(item.type) + '20' }}
        >
          <Ionicons
            name={getNotificationIcon(item.type)}
            size={20}
            color={getNotificationColor(item.type)}
          />
        </View>

        {/* Content */}
        <View className="flex-1 mr-2">
          <Text
            className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text
            className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}
            numberOfLines={2}
          >
            {item.body}
          </Text>
          <Text
            className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}
          >
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>

        {/* Unread indicator, clickable indicator, and delete button */}
        <View className="flex-row items-center gap-2">
          {!item.is_read && (
            <View
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: '#22d3ee' }}
            />
          )}
          {isClickable && (
            <Ionicons
              name="chevron-forward"
              size={18}
              color={isDark ? '#6B7280' : '#9CA3AF'}
            />
          )}
          <TouchableOpacity
            onPress={() => handleDelete(item.id)}
            className="p-2"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name="trash-outline"
              size={18}
              color={isDark ? '#EF4444' : '#DC2626'}
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View
      className={`flex-1 ${isDark ? 'bg-gray-950' : 'bg-white'}`}
      style={{ backgroundColor: isDark ? '#030712' : '#FFFFFF' }}
    >
      {/* Header */}
      <View
        className={`flex-row items-center justify-between px-4 py-3 border-b ${
          isDark ? 'border-gray-800' : 'border-gray-200'
        }`}
        style={{
          backgroundColor: isDark ? '#111827' : '#F9FAFB',
          borderBottomColor: isDark ? '#1F2937' : '#E5E7EB',
        }}
      >
        <View className="flex-1">
          <Text className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Notifications
          </Text>
          {unreadCount > 0 && (
            <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {unreadCount} unread
            </Text>
          )}
        </View>

        <TouchableOpacity
          onPress={onClose}
          className="p-2"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name="close"
            size={24}
            color={isDark ? '#F3F4F6' : '#111827'}
          />
        </TouchableOpacity>
      </View>

      {/* Action buttons */}
      {notifications.length > 0 && (
        <View
          className={`flex-row gap-2 px-4 py-2 border-b ${
            isDark ? 'border-gray-800' : 'border-gray-200'
          }`}
          style={{
            borderBottomColor: isDark ? '#1F2937' : '#E5E7EB',
          }}
        >
                    <TouchableOpacity
            onPress={handleMarkAllAsRead}
            disabled={unreadCount === 0}
            className={`flex-1 py-2 px-3 rounded-lg ${
              unreadCount === 0
                ? isDark ? 'bg-gray-800' : 'bg-gray-200'
                : isDark ? 'bg-cyan-900' : 'bg-cyan-100'
            }`}
          >
            <Text
              className={`text-center text-sm font-semibold ${
                unreadCount === 0
                  ? isDark ? 'text-gray-500' : 'text-gray-500'
                  : isDark ? 'text-cyan-200' : 'text-cyan-700'
              }`}
            >
              Mark All Read
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDeleteAll}
            className={`flex-1 py-2 px-3 rounded-lg ${
              isDark ? 'bg-red-900' : 'bg-red-100'
            }`}
          >
            <Text
              className={`text-center text-sm font-semibold ${
                isDark ? 'text-red-200' : 'text-red-700'
              }`}
            >
              Delete All
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Notifications list */}
      {loading && notifications.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#22d3ee" />
        </View>
      ) : notifications.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Ionicons
            name="notifications-off-outline"
            size={64}
            color={isDark ? '#6B7280' : '#D1D5DB'}
          />
          <Text
            className={`mt-4 text-lg font-semibold ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}
          >
            No notifications
          </Text>
          <Text
            className={`mt-1 text-sm text-center px-4 ${
              isDark ? 'text-gray-500' : 'text-gray-500'
            }`}
          >
            You are all caught up! New notifications will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={({ item }) => <NotificationItem item={item} />}
          keyExtractor={(item) => item.id}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center py-8">
              <Text className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                No notifications
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

export default NotificationCenter;
