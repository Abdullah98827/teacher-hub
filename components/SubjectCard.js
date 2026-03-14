import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";

export default function SubjectCard({
  subject,
  onEdit,
  onDelete,
  onViewSubscribers,
  isDeleting = false,
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const { bgCard, bgCardAlt, border, textPrimary, textSecondary, textMuted } =
    useAppTheme();

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <View className={`${bgCard} rounded-xl p-4 mb-3 border ${border}`}>
      {/* Header */}
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1 mr-3">
          <View className="flex-row items-center gap-2 mb-1 flex-wrap">
            <Text className={`${textPrimary} font-bold text-xl`}>
              {subject.name}
            </Text>
            {subject.is_public ? (
              <View className="bg-green-500/20 px-2 py-1 rounded-full">
                <Text className="text-green-400 text-xs font-bold">
                  PUBLIC SUBJECT
                </Text>
              </View>
            ) : (
              <View className="bg-purple-500/20 px-2 py-1 rounded-full">
                <Text className="text-purple-400 text-xs font-bold">
                  PRIVATE SUBJECT
                </Text>
              </View>
            )}
            {subject.groupChat?.is_public && (
              <View className="bg-green-500/20 px-2 py-1 rounded-full">
                <Text className="text-green-400 text-xs font-bold">
                  PUBLIC CHAT
                </Text>
              </View>
            )}
          </View>
          {subject.description && (
            <Text className={`${textSecondary} text-sm`} numberOfLines={2}>
              {subject.description}
            </Text>
          )}
        </View>

        {/* Menu Button */}
        <View>
          <TouchableOpacity
            className={`w-10 h-10 rounded-lg items-center justify-center ${bgCardAlt}`}
            onPress={() => setMenuOpen(!menuOpen)}
            disabled={isDeleting}
          >
            <Ionicons name="ellipsis-vertical" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {menuOpen && (
            <View
              className={`absolute right-0 top-12 ${bgCardAlt} rounded-lg border ${border} shadow-lg z-50 min-w-[160px]`}
            >
              <TouchableOpacity
                className={`flex-row items-center px-4 py-3 border-b ${border}`}
                onPress={() => {
                  setMenuOpen(false);
                  onEdit();
                }}
              >
                <Ionicons name="pencil" size={18} color="#22d3ee" />
                <Text className={`${textPrimary} ml-3`}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-row items-center px-4 py-3"
                onPress={() => {
                  setMenuOpen(false);
                  onDelete();
                }}
              >
                <Ionicons name="trash" size={18} color="#ef4444" />
                <Text className="text-red-400 ml-3">Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Group Chat Card */}
      {subject.groupChat && (
        <TouchableOpacity
          className={`${bgCardAlt} rounded-lg p-3 mb-3 active:opacity-70`}
          onPress={() => router.push(`/group-chat/${subject.groupChat.id}`)}
        >
          <View className="flex-row items-center mb-1">
            <Ionicons name="chatbubbles" size={16} color="#22d3ee" />
            <Text className="text-cyan-400 font-semibold ml-2">
              {subject.groupChat.name}
            </Text>
          </View>
          {subject.groupChat.description && (
            <Text className={`${textMuted} text-xs ml-6`} numberOfLines={1}>
              {subject.groupChat.description}
            </Text>
          )}
        </TouchableOpacity>
      )}

      {/* Stats */}
      <View className="flex-row flex-wrap gap-3 mb-3">
        <TouchableOpacity
          className={`${bgCardAlt} px-3 py-2 rounded-lg flex-row items-center active:opacity-70`}
          onPress={onViewSubscribers}
        >
          <Ionicons name="people" size={14} color="#22d3ee" />
          <Text className="text-cyan-400 text-sm font-semibold ml-1.5">
            {subject.subscriberCount}
          </Text>
          <Text className={`${textMuted} text-xs ml-1`}>
            {subject.is_public ? "can access" : "subscribers"}
          </Text>
        </TouchableOpacity>

        <View
          className={`${bgCardAlt} px-3 py-2 rounded-lg flex-row items-center`}
        >
          <Ionicons name="chatbubble" size={14} color="#22d3ee" />
          <Text className="text-cyan-400 text-sm font-semibold ml-1.5">
            {subject.messageCount}
          </Text>
          <Text className={`${textMuted} text-xs ml-1`}>messages</Text>
        </View>

        {subject.deletedMessageCount > 0 && (
          <View className="bg-red-500/20 px-3 py-2 rounded-lg flex-row items-center">
            <Ionicons name="alert-circle" size={14} color="#ef4444" />
            <Text className="text-red-400 text-sm font-semibold ml-1.5">
              {subject.deletedMessageCount}
            </Text>
            <Text className={`${textMuted} text-xs ml-1`}>deleted</Text>
          </View>
        )}
      </View>

      {/* Footer */}
      <View className={`border-t ${border} pt-2`}>
        <Text className={`${textMuted} text-xs`}>
          Created {formatDate(subject.created_at)}
        </Text>
      </View>
    </View>
  );
}
