import { View } from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";
import { ThemedText } from './themed-text';

export default function EmptyState({ icon = "📭", message }) {
  const { bgCard, border, textSecondary } = useAppTheme();
  return (
    <View className={`${bgCard} p-8 rounded-xl border ${border}`}>
      <ThemedText className="text-center text-6xl mb-4">{icon}</ThemedText>
      <ThemedText className={`text-center ${textSecondary}`}>{message}</ThemedText>
    </View>
  );
}
