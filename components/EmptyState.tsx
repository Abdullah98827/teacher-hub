// components/EmptyState.tsx
import { Text, View } from "react-native";

interface EmptyStateProps {
  icon?: string;
  message: string;
}

export default function EmptyState({ icon = "📭", message }: EmptyStateProps) {
  return (
    <View className="bg-neutral-900 p-8 rounded-xl border border-neutral-800">
      <Text className="text-center text-6xl mb-4">{icon}</Text>
      <Text className="text-center text-gray-400">{message}</Text>
    </View>
  );
}
