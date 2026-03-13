import { Ionicons } from "@expo/vector-icons";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
}

export default function SearchBar({
  value,
  onChangeText,
  placeholder = "Search...",
  label,
}: SearchBarProps) {
  const { bgInput, borderInput, textPrimary, placeholderColor } = useAppTheme();

  return (
    <View className="mb-4">
      {label && <Text className={`${textPrimary} font-semibold mb-2`}>{label}</Text>}
      <View className={`${bgInput} flex-row items-center px-4 py-3 rounded-xl border ${borderInput}`}>
        <Ionicons name="search" size={20} color="#9CA3AF" />
        <TextInput
          className={`flex-1 ${textPrimary} ml-2`}
          placeholder={placeholder}
          placeholderTextColor={placeholderColor}
          value={value}
          onChangeText={onChangeText}
        />
        {value !== "" && (
          <TouchableOpacity onPress={() => onChangeText("")}>
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
