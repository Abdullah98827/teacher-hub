// components/ResourceCard.tsx
import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";

interface ResourceCardProps {
  title: string;
  description?: string;
  category: "powerpoint" | "worksheet" | "lesson_plan";
  status?: "pending" | "approved" | "rejected";
  subjectName: string;
  uploadedBy?: string;
  createdAt: string;
  downloads?: number;
  views?: number;
  averageRating?: number;
  ratingCount?: number;
  commentCount?: number;
  isBookmarked?: boolean;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onComment?: () => void;
  onRate?: () => void;
  onReport?: () => void;
  onBookmark?: () => void;
  onShare?: () => void;
  showActions?: boolean;
}

export default function ResourceCard({
  title,
  description,
  category,
  status,
  subjectName,
  uploadedBy,
  createdAt,
  downloads = 0,
  views = 0,
  averageRating = 0,
  ratingCount = 0,
  commentCount = 0,
  isBookmarked = false,
  onPress,
  onEdit,
  onDelete,
  onComment,
  onRate,
  onReport,
  onBookmark,
  onShare,
  showActions = false,
}: ResourceCardProps) {
  const categoryIcons = {
    powerpoint: "easel",
    worksheet: "document-text",
    lesson_plan: "book",
  };

  const categoryColors = {
    powerpoint: "#f97316",
    worksheet: "#8b5cf6",
    lesson_plan: "#10b981",
  };

  const statusColors = {
    pending: "bg-orange-900",
    approved: "bg-green-900",
    rejected: "bg-red-900",
  };

  const statusTextColors = {
    pending: "text-orange-400",
    approved: "text-green-400",
    rejected: "text-red-400",
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Ionicons key={i} name="star" size={14} color="#fbbf24" />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <Ionicons key={i} name="star-half" size={14} color="#fbbf24" />
        );
      } else {
        stars.push(
          <Ionicons key={i} name="star-outline" size={14} color="#6b7280" />
        );
      }
    }
    return stars;
  };

  return (
    <TouchableOpacity
      className="bg-neutral-900 rounded-xl mb-4 border border-neutral-800"
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View className="p-4">
        {/* Header with category and status */}
        <View className="flex-row items-center justify-between mb-3">
          <View
            className="px-3 py-1 rounded-full"
            style={{ backgroundColor: categoryColors[category] + "20" }}
          >
            <View className="flex-row items-center">
              <Ionicons
                name={categoryIcons[category] as any}
                size={14}
                color={categoryColors[category]}
              />
              <Text
                className="text-xs font-bold ml-1"
                style={{ color: categoryColors[category] }}
              >
                {category.replace("_", " ").toUpperCase()}
              </Text>
            </View>
          </View>

          {status && (
            <View className={`px-3 py-1 rounded-full ${statusColors[status]}`}>
              <Text className={`text-xs font-bold ${statusTextColors[status]}`}>
                {status.toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* Title */}
        <Text className="text-white text-lg font-bold mb-2">{title}</Text>

        {/* Description */}
        {description && (
          <Text className="text-gray-400 text-sm mb-3" numberOfLines={2}>
            {description}
          </Text>
        )}

        {/* Rating */}
        {averageRating > 0 && (
          <View className="flex-row items-center mb-3">
            <View className="flex-row items-center mr-2">
              {renderStars(averageRating)}
            </View>
            <Text className="text-yellow-400 font-bold text-sm mr-1">
              {averageRating.toFixed(1)}
            </Text>
            <Text className="text-gray-500 text-xs">({ratingCount})</Text>
          </View>
        )}

        {/* Subject */}
        <View className="flex-row items-center mb-3">
          <Ionicons name="school" size={16} color="#22d3ee" />
          <Text className="text-cyan-400 text-sm ml-1">{subjectName}</Text>
        </View>

        {/* Stats Row */}
        <View className="flex-row items-center gap-4 mb-3">
          {/* Views */}
          <View className="flex-row items-center">
            <Ionicons name="eye" size={16} color="#9CA3AF" />
            <Text className="text-gray-400 text-xs ml-1">{views}</Text>
          </View>

          {/* Downloads */}
          <View className="flex-row items-center">
            <Ionicons name="download" size={16} color="#9CA3AF" />
            <Text className="text-gray-400 text-xs ml-1">{downloads}</Text>
          </View>

          {/* Comments */}
          <View className="flex-row items-center">
            <Ionicons name="chatbubble" size={16} color="#9CA3AF" />
            <Text className="text-gray-400 text-xs ml-1">{commentCount}</Text>
          </View>
        </View>

        {/* Bottom Info */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <Ionicons name="time" size={14} color="#6B7280" />
            <Text className="text-gray-500 text-xs ml-1">{createdAt}</Text>
          </View>

          {uploadedBy && (
            <View className="flex-row items-center">
              <Ionicons name="person" size={14} color="#6B7280" />
              <Text className="text-gray-500 text-xs ml-1">{uploadedBy}</Text>
            </View>
          )}
        </View>

        {/* Action Buttons Row */}
        <View className="flex-row items-center justify-between pt-3 border-t border-neutral-800">
          {/* Comment Button */}
          {onComment && (
            <TouchableOpacity
              className="flex-row items-center py-2 px-3"
              onPress={onComment}
            >
              <Ionicons name="chatbubble-outline" size={18} color="#22d3ee" />
              <Text className="text-cyan-400 text-xs ml-1 font-semibold">
                Comment
              </Text>
            </TouchableOpacity>
          )}

          {/* Rate Button */}
          {onRate && (
            <TouchableOpacity
              className="flex-row items-center py-2 px-3"
              onPress={onRate}
            >
              <Ionicons name="star-outline" size={18} color="#fbbf24" />
              <Text className="text-yellow-400 text-xs ml-1 font-semibold">
                Rate
              </Text>
            </TouchableOpacity>
          )}

          {/* Bookmark Button */}
          {onBookmark && (
            <TouchableOpacity
              className="flex-row items-center py-2 px-3"
              onPress={onBookmark}
            >
              <Ionicons
                name={isBookmarked ? "bookmark" : "bookmark-outline"}
                size={18}
                color={isBookmarked ? "#22d3ee" : "#9CA3AF"}
              />
              <Text
                className={`text-xs ml-1 font-semibold ${
                  isBookmarked ? "text-cyan-400" : "text-gray-400"
                }`}
              >
                {isBookmarked ? "Saved" : "Save"}
              </Text>
            </TouchableOpacity>
          )}

          {/* Share Button */}
          {onShare && (
            <TouchableOpacity
              className="flex-row items-center py-2 px-3"
              onPress={onShare}
            >
              <Ionicons name="share-outline" size={18} color="#9CA3AF" />
              <Text className="text-gray-400 text-xs ml-1 font-semibold">
                Share
              </Text>
            </TouchableOpacity>
          )}

          {/* Report Button */}
          {onReport && (
            <TouchableOpacity
              className="flex-row items-center py-2 px-3"
              onPress={onReport}
            >
              <Ionicons name="flag-outline" size={18} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>

        {/* Edit/Delete Actions (for own resources) */}
        {showActions && (
          <View className="flex-row gap-2 mt-3 pt-3 border-t border-neutral-800">
            {onEdit && (
              <TouchableOpacity
                className="flex-1 bg-cyan-600 py-2 rounded-lg flex-row items-center justify-center"
                onPress={onEdit}
              >
                <Ionicons name="create" size={18} color="#fff" />
                <Text className="text-white font-semibold ml-1">Edit</Text>
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity
                className="flex-1 bg-red-600 py-2 rounded-lg flex-row items-center justify-center"
                onPress={onDelete}
              >
                <Ionicons name="trash" size={18} color="#fff" />
                <Text className="text-white font-semibold ml-1">Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
