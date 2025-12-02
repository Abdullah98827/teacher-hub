import { Ionicons } from "@expo/vector-icons";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

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
  return (
    <View className="mb-4">
      {label && <Text className="text-white font-semibold mb-2">{label}</Text>}
      <View className="bg-neutral-800 flex-row items-center px-4 py-3 rounded-xl border border-neutral-700">
        <Ionicons name="search" size={20} color="#9CA3AF" />
        <TextInput
          className="flex-1 text-white ml-2"
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
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
