import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import useAppTheme from "../hooks/useAppTheme";

interface MembershipCardProps {
  membership: {
    teacher_id: string;
    email: string;
    approved: boolean;
    tier: string;
    subject_names: string[];
    active: boolean;
    created_at: string;
  };
}

export default function MembershipCard({ membership }: MembershipCardProps) {
  const { bgCard, bgCardAlt, border, textPrimary, textMuted } = useAppTheme();
  const formatDate = (dateString: string) => {
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
    <View className={`${bgCard} rounded-xl mb-3 border ${border} p-4`}>
      {/* Email and tier badge */}
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1 mr-2">
          <View className="flex-row items-center gap-2 mb-1">
            <View className="bg-cyan-500/20 w-8 h-8 rounded-full items-center justify-center">
              <Ionicons name="person" size={16} color="#22d3ee" />
            </View>
            <Text className={`${textPrimary} font-semibold flex-1`} numberOfLines={1}>
              {membership.email}
            </Text>
          </View>
        </View>
        <View
          className={`px-3 py-1.5 rounded-full ${
            isMulti ? "bg-purple-500/20" : "bg-cyan-500/20"
          }`}
        >
          <Text
            className={`text-xs font-bold ${
              isMulti ? "text-purple-400" : "text-cyan-400"
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
            membership.approved ? "bg-green-500/20" : "bg-red-500/20"
          }`}
        >
          <Ionicons
            name={membership.approved ? "checkmark-circle" : "close-circle"}
            size={12}
            color={membership.approved ? "#22c55e" : "#ef4444"}
          />
          <Text
            className={`text-xs font-bold ml-1 ${
              membership.approved ? "text-green-400" : "text-red-400"
            }`}
          >
            {membership.approved ? "APPROVED" : "NOT APPROVED"}
          </Text>
        </View>

        <View className="flex-row items-center px-2 py-1 rounded-full bg-green-500/20">
          <Ionicons name="checkmark-circle" size={12} color="#22c55e" />
          <Text className="text-xs font-bold ml-1 text-green-400">ACTIVE</Text>
        </View>
      </View>

      {/* Subjects */}
      <View className={`${bgCardAlt} rounded-lg p-3 mb-3`}>
        <View className="flex-row items-center mb-2">
          <Ionicons name="book" size={14} color="#6B7280" />
          <Text className={`${textMuted} text-xs ml-1.5`}>Subjects</Text>
        </View>
        <Text className="text-gray-300 leading-5">
          {membership.subject_names?.length > 0
            ? membership.subject_names.join(", ")
            : "No subjects selected"}
        </Text>
      </View>

      {/* Date */}
      <View className={`border-t ${border} pt-2`}>
        <Text className={`${textMuted} text-xs`}>
          Created {formatDate(membership.created_at)}
        </Text>
      </View>
    </View>
  );
}
