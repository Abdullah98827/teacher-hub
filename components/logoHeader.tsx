import { Text, View } from 'react-native';

export default function logoHeader({ position = 'left' }: { position?: 'left' | 'right' }) {
  return (
    <View className={`w-full px-5 py-3 ${position === 'right' ? 'items-end' : 'items-start'}`}>
      <Text className="text-2xl font-bold text-cyan-400 tracking-wider">Teacher-Hub</Text>
    </View>
  );
}
