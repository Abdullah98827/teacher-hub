import { ScrollView, TouchableOpacity, View } from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";
import { ThemedText } from './themed-text';

export default function TabFilter({ tabs, activeTab, onTabChange }) {
  const { bgCardAlt, textSecondary } = useAppTheme();

  // Normalize tabs - handle both string arrays and object arrays
  const normalizedTabs = tabs.map((tab) =>
    typeof tab === "string"
      ? { key: tab, label: tab.charAt(0).toUpperCase() + tab.slice(1) }
      : tab
  );

  return (
    <View className="mb-4">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 16 }}
      >
        <View className="flex-row" style={{ gap: 8 }}>
          {normalizedTabs.map((tab, index) => (
            <TouchableOpacity
              key={tab.key || index}
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
