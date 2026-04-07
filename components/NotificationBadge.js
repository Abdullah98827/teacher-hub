import { Text, View } from 'react-native';
import { useNotifications } from '../contexts/NotificationContext';

const NotificationBadge = ({ size = 'small', badgeColor = '#FF6B6B' }) => {
  const { unreadCount } = useNotifications();

  if (unreadCount === 0) return null;

  const sizeMap = {
    small: { width: 20, height: 20, fontSize: 10 },
    medium: { width: 24, height: 24, fontSize: 12 },
    large: { width: 32, height: 32, fontSize: 14 },
  };

  const { width, height, fontSize } = sizeMap[size] || sizeMap.small;

  return (
    <View
      className="absolute -top-2 -right-2 rounded-full items-center justify-center"
      style={{
        width,
        height,
        backgroundColor: badgeColor,
      }}
    >
      <Text
        className="font-bold text-white"
        style={{ fontSize }}
        numberOfLines={1}
      >
        {unreadCount > 99 ? '99+' : unreadCount}
      </Text>
    </View>
  );
};

export default NotificationBadge;
