import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LogoHeader from '../../components/logoHeader';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-neutral-950 px-5" style={{ paddingTop: insets.top }}>
      {/* LogoHeader at top left */}
      <LogoHeader position="left" />

      {/* Dashboard content */}
      <View className="flex-1 justify-center items-center">
        <View className="bg-white rounded-xl p-8 shadow-lg w-full">
          <Text className="text-3xl font-bold text-cyan-600 mb-4 text-center">Dashboard</Text>
          <Text className="text-base text-gray-700 text-center">
            Your teacher dashboard content goes here.
          </Text>
        </View>
      </View>
    </View>
  );
}
