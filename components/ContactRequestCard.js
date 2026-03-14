import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";

export default function ContactRequestCard({ request, onMarkResolved }) {
  const { bgCard, bgCardAlt, border, textPrimary, textSecondary, textMuted } =
    useAppTheme();

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const isResolved = request.status === "resolved";

  return (
    <View className={`${bgCard} rounded-xl mb-3 border ${border} p-4`}>
      {/* Status and date */}
      <View className="flex-row items-center justify-between mb-3">
        <View
          className={`px-3 py-1.5 rounded-full ${
            isResolved ? "bg-green-500/20" : "bg-orange-500/20"
          }`}
        >
          <View className="flex-row items-center">
            <Ionicons
              name={isResolved ? "checkmark-circle" : "time"}
              size={14}
              color={isResolved ? "#22c55e" : "#f97316"}
            />
            <Text
              className={`text-xs font-bold ml-1.5 ${
                isResolved ? "text-green-400" : "text-orange-400"
              }`}
            >
              {isResolved ? "RESOLVED" : "PENDING"}
            </Text>
          </View>
        </View>
        <Text className={`${textMuted} text-xs`}>
          {formatDate(request.created_at)}
        </Text>
      </View>

      {/* Email with verification */}
      <View className="mb-3">
        <Text className={`${textMuted} text-xs mb-1`}>From</Text>
        <View className="flex-row items-center gap-2">
          <View className="bg-cyan-500/20 w-8 h-8 rounded-full items-center justify-center">
            <Ionicons name="mail" size={16} color="#22d3ee" />
          </View>
          <Text className={`${textPrimary} font-semibold flex-1`}>
            {request.email}
          </Text>
          {request.verified !== undefined && (
            <View
              className={`px-2 py-1 rounded-full ${
                request.verified ? "bg-green-500/20" : "bg-red-500/20"
              }`}
            >
              <Text
                className={`text-xs font-bold ${request.verified ? "text-green-400" : "text-red-400"}`}
              >
                {request.verified ? "VERIFIED" : "UNVERIFIED"}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Message */}
      <View className={`${bgCardAlt} rounded-lg p-3 mb-3`}>
        <View className="flex-row items-center mb-2">
          <Ionicons name="chatbox-ellipses" size={14} color="#6B7280" />
          <Text className={`${textMuted} text-xs ml-1.5`}>Message</Text>
        </View>
        <Text className={`${textSecondary} leading-5`}>{request.message}</Text>
      </View>

      {/* Action button */}
      {!isResolved ? (
        <TouchableOpacity
          className="bg-green-500 py-3 rounded-lg flex-row items-center justify-center"
          onPress={onMarkResolved}
        >
          <Ionicons name="checkmark-circle" size={18} color="#fff" />
          <Text className="text-white font-semibold ml-2">
            Mark as Resolved
          </Text>
        </TouchableOpacity>
      ) : (
        <View className="bg-green-500/20 border-2 border-green-500/30 py-3 rounded-lg flex-row items-center justify-center">
          <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
          <Text className="text-green-400 font-semibold ml-2">
            Request Resolved
          </Text>
        </View>
      )}
    </View>
  );
}
