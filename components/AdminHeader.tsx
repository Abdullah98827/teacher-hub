// components/AdminHeader.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
}

export default function AdminHeader({
  title,
  subtitle,
  showBack = true,
}: AdminHeaderProps) {
  const router = useRouter();

  return (
    <View className="flex-row items-center justify-between mb-4">
      {showBack ? (
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      ) : (
        <View className="w-10" />
      )}

      <View className="flex-1">
        <Text className="text-2xl font-bold text-cyan-400 text-center">
          {title}
        </Text>
        {subtitle && (
          <Text className="text-gray-400 text-center text-sm mt-0.5">
            {subtitle}
          </Text>
        )}
      </View>

      <View className="w-10" />
    </View>
  );
}
