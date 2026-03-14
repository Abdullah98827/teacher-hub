import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity, View } from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";
import { ThemedText } from './themed-text';
import { ThemedTextInput } from './themed-textinput';

export default function SearchBar({
  value,
  onChangeText,
  placeholder = "Search...",
  label,
}) {
  const { bgInput, borderInput, textPrimary, placeholderColor } = useAppTheme();

  return (
    <View className="mb-4">
      {label && (
        <ThemedText className={`${textPrimary} font-semibold mb-2`}>{label}</ThemedText>
      )}
      <View
        className={`${bgInput} flex-row items-center px-4 py-3 rounded-xl border ${borderInput}`}
      >
        <Ionicons name="search" size={20} color="#9CA3AF" />
        <ThemedTextInput
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
