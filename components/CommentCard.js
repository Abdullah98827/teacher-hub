import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity, View } from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";
import ProfilePicture from "./ProfilePicture";
import StatusBadge from "./StatusBadge";
import { ThemedText } from './themed-text';

export default function CommentCard({ comment, onRestore, onDelete }) {
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

  return (
    <View className={`${bgCard} rounded-xl mb-3 border ${border} p-4`}>
      {/* Header with user and status */}
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1 mr-2">
          <View className="flex-row items-center gap-2 mb-1">
            <ProfilePicture
              imageUrl={comment.profile_picture_url}
              firstName={comment.first_name}
              lastName={comment.last_name}
              size="sm"
            />
            <ThemedText className={`${textPrimary} font-semibold`}>
              {comment.first_name} {comment.last_name}
            </ThemedText>
          </View>
          <ThemedText className={`${textMuted} text-xs ml-10`}>
            {formatDate(comment.created_at)}
          </ThemedText>
        </View>
        {comment.is_deleted && <StatusBadge status="rejected" size="sm" />}
      </View>

      {/* Comment text */}
      <View className={`${bgCardAlt} rounded-lg p-3 mb-3`}>
        <ThemedText className={`${textSecondary} leading-5`}>
          {comment.comment_text}
        </ThemedText>
      </View>

      {/* Resource info */}
      <View className="flex-row items-center mb-3">
        <Ionicons name="document-text" size={14} color="#6B7280" />
        <ThemedText className={`${textMuted} text-xs ml-1.5`}>
          {comment.resource_title}
        </ThemedText>
      </View>

      {/* Action buttons */}
      {comment.is_deleted ? (
        <View className="flex-row gap-2">
          {onRestore && (
            <TouchableOpacity
              className="flex-1 bg-cyan-500 py-3 rounded-lg flex-row items-center justify-center"
              onPress={onRestore}
            >
              <Ionicons name="refresh" size={16} color="#fff" />
              <ThemedText className="text-white font-semibold ml-2">Restore</ThemedText>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            className="flex-1 bg-red-500 py-3 rounded-lg flex-row items-center justify-center"
            onPress={onDelete}
          >
            <Ionicons name="trash" size={16} color="#fff" />
            <ThemedText className="text-white font-semibold ml-2">Delete Forever</ThemedText>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          className="bg-red-500 py-3 rounded-lg flex-row items-center justify-center"
          onPress={onDelete}
        >
          <Ionicons name="trash" size={16} color="#fff" />
          <ThemedText className="text-white font-semibold ml-2">Delete</ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );
}
