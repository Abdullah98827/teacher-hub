import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";

interface AccessToggleProps {
  label: string;
  isPublic: boolean;
  onToggle: () => void;
  publicLabel: string;
  privateLabel: string;
  publicDescription: string;
  privateDescription: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export default function AccessToggle({
  label,
  isPublic,
  onToggle,
  publicLabel,
  privateLabel,
  publicDescription,
  privateDescription,
  icon = "chatbubbles",
}: AccessToggleProps) {
  const { textMuted } = useAppTheme();
  return (
    <View className="mb-4">
      <Text className={`${textMuted} text-sm mb-3`}>{label}</Text>
      <TouchableOpacity
        className={`p-4 rounded-lg border-2 ${
          isPublic
            ? "bg-green-500/10 border-green-500"
            : "bg-purple-500/10 border-purple-500"
        }`}
        onPress={onToggle}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <View
              className={`w-12 h-12 rounded-full items-center justify-center mr-3 ${
                isPublic ? "bg-green-500/20" : "bg-purple-500/20"
              }`}
            >
              <Ionicons
                name={isPublic ? "globe" : "lock-closed"}
                size={24}
                color={isPublic ? "#22c55e" : "#a855f7"}
              />
            </View>
            <View className="flex-1">
              <Text
                className={`font-bold text-lg ${
                  isPublic ? "text-green-400" : "text-purple-400"
                }`}
              >
                {isPublic ? publicLabel : privateLabel}
              </Text>
              <Text className={`${textMuted} text-xs`}>
                {isPublic ? publicDescription : privateDescription}
              </Text>
            </View>
          </View>
          <View
            className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
              isPublic
                ? "bg-green-500 border-green-500"
                : "bg-purple-500 border-purple-500"
            }`}
          >
            <Ionicons name="checkmark" size={16} color="#fff" />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}
