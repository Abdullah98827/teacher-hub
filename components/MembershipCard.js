import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";

export default function MembershipCard({ membership }) {
  const { bgCard, bgCardAlt, border, textPrimary, textMuted } = useAppTheme();
  const isDark = bgCard === "bg-gray-900" || bgCard === "dark:bg-gray-900";

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const isMulti = membership.tier === "multi";

  return (
    <View className={`${bgCard} rounded-xl mb-3 border ${border} p-4 ${isDark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"}`}>
      {/* Email and tier badge */}
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1 mr-2">
          <View className="flex-row items-center gap-2 mb-1">
            <View className="bg-cyan-500/20 w-8 h-8 rounded-full items-center justify-center">
              <Ionicons name="person" size={16} color={isDark ? "#67e8f9" : "#22d3ee"} />
            </View>
            <Text
              className={`${textPrimary} font-semibold flex-1`}
              numberOfLines={1}
            >
              {membership.email}
            </Text>
          </View>
        </View>
        <View
          className={`px-3 py-1.5 rounded-full ${
            isMulti ? (isDark ? "bg-purple-800/40" : "bg-purple-500/20") : (isDark ? "bg-cyan-800/40" : "bg-cyan-500/20")
          }`}
        >
          <Text
            className={`text-xs font-bold ${
              isMulti ? (isDark ? "text-purple-200" : "text-purple-400") : (isDark ? "text-cyan-200" : "text-cyan-400")
            }`}
          >
            {isMulti ? "MULTI" : "SINGLE"}
          </Text>
        </View>
      </View>

      {/* Status badges */}
      <View className="flex-row items-center gap-2 mb-3">
        <View
          className={`flex-row items-center px-2 py-1 rounded-full ${
            membership.approved ? (isDark ? "bg-green-800/40" : "bg-green-500/20") : (isDark ? "bg-red-800/40" : "bg-red-500/20")
          }`}
        >
          <Ionicons
            name={membership.approved ? "checkmark-circle" : "close-circle"}
            size={12}
            color={membership.approved ? (isDark ? "#4ade80" : "#22c55e") : (isDark ? "#f87171" : "#ef4444")}
          />
          <Text
            className={`text-xs font-bold ml-1 ${
              membership.approved ? (isDark ? "text-green-300" : "text-green-400") : (isDark ? "text-red-300" : "text-red-400")
            }`}
          >
            {membership.approved ? "APPROVED" : "NOT APPROVED"}
          </Text>
        </View>
        {membership.active && (
          <View className={`flex-row items-center px-2 py-1 rounded-full ${isDark ? "bg-green-800/40" : "bg-green-500/20"}`}>
            <Ionicons name="checkmark-circle" size={12} color={isDark ? "#4ade80" : "#22c55e"} />
            <Text className={`text-xs font-bold ml-1 ${isDark ? "text-green-300" : "text-green-400"}`}>ACTIVE</Text>
          </View>
        )}
      </View>

      {/* Subjects */}
      <View className={`${bgCardAlt} rounded-lg p-3 mb-3 ${isDark ? "bg-gray-800" : "bg-gray-50"}`}>
        <View className="flex-row items-center mb-2">
          <Ionicons name="book" size={14} color={isDark ? "#a1a1aa" : "#6B7280"} />
          <Text className={`${textMuted} text-xs ml-1.5`}>Subjects</Text>
        </View>
        <Text className={`${textPrimary} leading-5`}>
          {membership.subject_names?.length > 0
            ? membership.subject_names.join(", ")
            : "No subjects selected"}
        </Text>
      </View>

      {/* Date */}
      <View className={`border-t ${border} pt-2 ${isDark ? "border-gray-700" : "border-gray-200"}`}>
        <Text className={`${textMuted} text-xs`}>
          Created {formatDate(membership.created_at)}
        </Text>
      </View>
    </View>
  );
}
