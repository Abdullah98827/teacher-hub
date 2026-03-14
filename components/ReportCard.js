import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity, View } from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";
import { ThemedText } from './themed-text';

export default function ReportCard({ report, onPress }) {
  const { bgCard, bgCardAlt, border, textPrimary, textSecondary, textMuted } =
    useAppTheme();

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return {
          bg: "bg-orange-500/20",
          border: "border-orange-500/30",
          text: "text-orange-400",
        };
      case "reviewed":
        return {
          bg: "bg-blue-500/20",
          border: "border-blue-500/30",
          text: "text-blue-400",
        };
      case "resolved":
        return {
          bg: "bg-green-500/20",
          border: "border-green-500/30",
          text: "text-green-400",
        };
      default:
        return {
          bg: "bg-gray-500/20",
          border: "border-gray-500/30",
          text: "text-gray-400",
        };
    }
  };

  const colors = getStatusColor(report.status);

  return (
    <TouchableOpacity
      className={`${bgCard} rounded-xl p-4 mb-3 border ${border} active:opacity-70`}
      onPress={onPress}
    >
      {/* Status badge and chevron */}
      <View className="flex-row items-center justify-between mb-3">
        <View
          className={`px-3 py-1.5 rounded-full ${colors.bg} border ${colors.border}`}
        >
          <ThemedText className={`text-xs font-bold ${colors.text}`}>
            {report.status.toUpperCase()}
          </ThemedText>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </View>

      {/* Reason */}
      <View className="mb-3">
        <View className="flex-row items-center mb-1">
          <Ionicons name="alert-circle" size={14} color="#ef4444" />
          <ThemedText className={`${textMuted} text-xs ml-1.5`}>Reason</ThemedText>
        </View>
        <ThemedText className={`${textPrimary} font-bold`}>{report.reason}</ThemedText>
      </View>

      {/* Resource */}
      <View className={`${bgCardAlt} rounded-lg p-3 mb-3`}>
        <View className="flex-row items-center mb-1">
          <Ionicons name="document-text" size={14} color="#6B7280" />
          <ThemedText className={`${textMuted} text-xs ml-1.5`}>Resource</ThemedText>
        </View>
        <ThemedText className={`${textSecondary}`} numberOfLines={1}>
          {report.resource.title}
        </ThemedText>
      </View>

      {/* Footer */}
      <View
        className={`flex-row items-center justify-between border-t ${border} pt-2`}
      >
        <View className="flex-row items-center">
          <Ionicons name="person" size={12} color="#6B7280" />
          <ThemedText className={`${textMuted} text-xs ml-1`}>
            {report.reporter.first_name} {report.reporter.last_name}
          </ThemedText>
        </View>
        <ThemedText className={`${textMuted} text-xs`}>
          {formatDate(report.created_at)}
        </ThemedText>
      </View>
    </TouchableOpacity>
  );
}
