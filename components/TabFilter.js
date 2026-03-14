import { ScrollView, TouchableOpacity, View } from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";
import { ThemedText } from './themed-text';

export default function TabFilter({ tabs, activeTab, onTabChange }) {
  const { bgCardAlt, textSecondary } = useAppTheme();

  return (
    <View className="mb-4">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 16 }}
      >
        <View className="flex-row" style={{ gap: 8 }}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              className={`rounded-xl ${
                activeTab === tab.key ? "bg-cyan-500" : bgCardAlt
              }`}
              style={{ paddingHorizontal: 16, paddingVertical: 10 }}
              onPress={() => onTabChange(tab.key)}
            >
              <ThemedText
                className={`font-semibold text-sm ${
                  activeTab === tab.key ? "text-white" : textSecondary
                }`}
                numberOfLines={1}
              >
                {tab.label}
                {tab.count !== undefined && ` (${tab.count})`}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
