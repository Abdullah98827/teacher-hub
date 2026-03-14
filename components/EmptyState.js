import { Text, View } from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";

export default function EmptyState({ icon = "📭", message }) {
  const { bgCard, border, textSecondary } = useAppTheme();
  return (
    <View className={`${bgCard} p-8 rounded-xl border ${border}`}>
      <Text className="text-center text-6xl mb-4">{icon}</Text>
      <Text className={`text-center ${textSecondary}`}>{message}</Text>
    </View>
  );
}
