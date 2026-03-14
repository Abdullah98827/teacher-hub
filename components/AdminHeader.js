import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";

export default function AdminHeader({ title, subtitle, showBack = true }) {
  const router = useRouter();
  const { textSecondary, isDark } = useAppTheme();

  const backBtnBg = isDark ? "rgba(6,182,212,0.1)" : "rgba(8,145,178,0.08)";
  const backBtnBorder = isDark ? "rgba(6,182,212,0.25)" : "rgba(8,145,178,0.2)";
  const backArrowColor = isDark ? "#22d3ee" : "#0891b2";
  const titleColor = isDark ? "#22d3ee" : "#0891b2";

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
      }}
    >
      {showBack ? (
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: backBtnBg,
            borderWidth: 1,
            borderColor: backBtnBorder,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="arrow-back" size={20} color={backArrowColor} />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 38 }} />
      )}

      <View style={{ flex: 1, alignItems: "center" }}>
        <Text
          style={{
            fontSize: 20,
            fontWeight: "800",
            letterSpacing: 0.2,
            color: titleColor,
            textAlign: "center",
          }}
        >
          {title}
        </Text>
        {subtitle && (
          <Text className={`${textSecondary} text-center text-sm mt-0.5`}>
            {subtitle}
          </Text>
        )}
      </View>

      <View style={{ width: 38 }} />
    </View>
  );
}
