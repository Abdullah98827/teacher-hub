import { ScrollView, Text, TouchableOpacity, View } from "react-native";

interface Tab {
  key: string;
  label: string;
  count?: number;
}

interface TabFilterProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (key: string) => void;
}

export default function TabFilter({
  tabs,
  activeTab,
  onTabChange,
}: TabFilterProps) {
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
                activeTab === tab.key ? "bg-cyan-500" : "bg-neutral-800"
              }`}
              style={{ paddingHorizontal: 16, paddingVertical: 10 }}
              onPress={() => onTabChange(tab.key)}
            >
              <Text
                className={`font-semibold text-sm ${
                  activeTab === tab.key ? "text-white" : "text-gray-400"
                }`}
                numberOfLines={1}
              >
                {tab.label}
                {tab.count !== undefined && ` (${tab.count})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
