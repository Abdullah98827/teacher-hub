import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
import StatusBadge from "./StatusBadge";

interface CommentCardProps {
  comment: {
    id: string;
    comment_text: string;
    created_at: string;
    is_deleted: boolean;
    first_name: string;
    last_name: string;
    resource_title: string;
  };
  onRestore?: () => void;
  onDelete: () => void;
}

export default function CommentCard({
  comment,
  onRestore,
  onDelete,
}: CommentCardProps) {
  const formatDate = (dateString: string) => {
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
    <View className="bg-neutral-900 rounded-xl mb-3 border border-neutral-800 p-4">
      {/* Header with user and status */}
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1 mr-2">
          <View className="flex-row items-center gap-2 mb-1">
            <View className="bg-cyan-500/20 w-8 h-8 rounded-full items-center justify-center">
              <Ionicons name="person" size={16} color="#22d3ee" />
            </View>
            <Text className="text-white font-semibold">
              {comment.first_name} {comment.last_name}
            </Text>
          </View>
          <Text className="text-gray-500 text-xs ml-10">
            {formatDate(comment.created_at)}
          </Text>
        </View>
        {comment.is_deleted && <StatusBadge status="rejected" size="sm" />}
      </View>

      {/* Comment text */}
      <View className="bg-neutral-800/50 rounded-lg p-3 mb-3">
        <Text className="text-gray-300 leading-5">{comment.comment_text}</Text>
      </View>

      {/* Resource info */}
      <View className="flex-row items-center mb-3">
        <Ionicons name="document-text" size={14} color="#6B7280" />
        <Text className="text-gray-500 text-xs ml-1.5">
          {comment.resource_title}
        </Text>
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
              <Text className="text-white font-semibold ml-2">Restore</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            className="flex-1 bg-red-500 py-3 rounded-lg flex-row items-center justify-center"
            onPress={onDelete}
          >
            <Ionicons name="trash" size={16} color="#fff" />
            <Text className="text-white font-semibold ml-2">
              Delete Forever
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          className="bg-red-500 py-3 rounded-lg flex-row items-center justify-center"
          onPress={onDelete}
        >
          <Ionicons name="trash" size={16} color="#fff" />
          <Text className="text-white font-semibold ml-2">Delete</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
