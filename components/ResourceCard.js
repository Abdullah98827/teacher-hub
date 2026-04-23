import { Ionicons } from "@expo/vector-icons";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";
import { ThemedText } from "./themed-text";

export default function ResourceCard({
  id,
  title,
  description,
  category,
  status,
  subjectName,
  uploadedBy,
  uploadedById,
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
  onViewProfile,
  showActions = false,
}) {
  const { bgCard, border, textPrimary, textSecondary, textMuted, isDark } =
    useAppTheme();

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

  const statusBgColors = {
    pending: isDark ? "bg-orange-900" : "bg-orange-100",
    approved: isDark ? "bg-green-900" : "bg-green-100",
    rejected: isDark ? "bg-red-900" : "bg-red-100",
  };

  const statusTextColors = {
    pending: "text-orange-400",
    approved: isDark ? "text-green-400" : "text-green-600",
    rejected: "text-red-400",
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Ionicons key={i} name="star" size={14} color="#fbbf24" />
        );
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
      className={`${bgCard} rounded-xl mb-4 ${border} border`}
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
                name={categoryIcons[category]}
                size={14}
                color={categoryColors[category]}
              />
              <ThemedText
                className="text-xs font-bold ml-1"
                style={{ color: categoryColors[category] }}
              >
                {category.replace(/_/g, " ").toUpperCase()}
              </ThemedText>
            </View>
          </View>

          {status && (
            <View
              className={`px-3 py-1 rounded-full ${statusBgColors[status]}`}
            >
              <ThemedText
                className={`text-xs font-bold ${statusTextColors[status]}`}
              >
                {status.toUpperCase()}
              </ThemedText>
            </View>
          )}
        </View>

        {/* Title */}
        <ThemedText className={`${textPrimary} text-lg font-bold mb-2`}>
          {title}
        </ThemedText>

        {/* Description */}
        {description && (
          <ThemedText
            className={`${textSecondary} text-sm mb-3`}
            numberOfLines={2}
          >
            {description}
          </ThemedText>
        )}

        {/* Rating */}
        {averageRating > 0 && (
          <View className="flex-row items-center mb-3">
            <View className="flex-row items-center mr-2">
              {renderStars(averageRating)}
            </View>
            <ThemedText className="text-yellow-400 font-bold text-sm mr-1">
              {averageRating.toFixed(1)}
            </ThemedText>
            <ThemedText className={`${textMuted} text-xs`}>
              ({ratingCount})
            </ThemedText>
          </View>
        )}

        {/* Subject */}
        {subjectName && (
          <View className="flex-row items-center mb-3">
            <Ionicons name="school" size={16} color="#22d3ee" />
            <ThemedText className="text-cyan-400 text-sm ml-1">
              {subjectName}
            </ThemedText>
          </View>
        )}

        {/* Stats Row */}
        <View className="flex-row items-center gap-4 mb-3">
          <View className="flex-row items-center">
            <Ionicons name="eye" size={16} color="#9CA3AF" />
            <ThemedText className={`${textMuted} text-xs ml-1`}>
              {views}
            </ThemedText>
          </View>
          <View className="flex-row items-center">
            <Ionicons name="download" size={16} color="#9CA3AF" />
            <ThemedText className={`${textMuted} text-xs ml-1`}>
              {downloads}
            </ThemedText>
          </View>
          <View className="flex-row items-center">
            <Ionicons name="chatbubble" size={16} color="#9CA3AF" />
            <ThemedText className={`${textMuted} text-xs ml-1`}>
              {commentCount}
            </ThemedText>
          </View>
        </View>

        {/* Bottom Info */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <Ionicons name="time" size={14} color="#6B7280" />
            <ThemedText className={`${textMuted} text-xs ml-1`}>
              {createdAt}
            </ThemedText>
          </View>

          {uploadedBy && uploadedById && onViewProfile && (
            <TouchableOpacity
              className="flex-row items-center"
              onPress={() => onViewProfile(uploadedById)}
              activeOpacity={0.6}
            >
              <Ionicons name="person" size={14} color="#22d3ee" />
              <ThemedText className="text-xs ml-1 text-cyan-400 font-semibold">
                {uploadedBy}
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>

        {/* Action Buttons Row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className={`border-t ${border}`}
        >
          <View className="flex-row items-center pt-3" style={{ minWidth: 400 }}>
            {onComment && (
              <TouchableOpacity
                className="flex-row items-center py-2 px-3"
                onPress={onComment}
              >
                <Ionicons name="chatbubble-outline" size={18} color="#22d3ee" />
                <ThemedText
                  className={`${textMuted} text-xs ml-1 font-semibold`}
                >
                  Comment
                </ThemedText>
              </TouchableOpacity>
            )}

            {onRate && (
              <TouchableOpacity
                className="flex-row items-center py-2 px-3"
                onPress={onRate}
              >
                <Ionicons name="star-outline" size={18} color="#fbbf24" />
                <ThemedText
                  className={`${textMuted} text-xs ml-1 font-semibold`}
                >
                  Rate
                </ThemedText>
              </TouchableOpacity>
            )}

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
                <ThemedText
                  className={`text-xs ml-1 font-semibold ${
                    isBookmarked ? "text-cyan-400" : textMuted
                  }`}
                >
                  {isBookmarked ? "Saved" : "Save"}
                </ThemedText>
              </TouchableOpacity>
            )}

            {onShare && (
              <TouchableOpacity
                className="flex-row items-center py-2 px-3"
                onPress={onShare}
              >
                <Ionicons name="share-outline" size={18} color="#9CA3AF" />
                <ThemedText
                  className={`${textMuted} text-xs ml-1 font-semibold`}
                >
                  Share
                </ThemedText>
              </TouchableOpacity>
            )}

            {onReport && (
              <TouchableOpacity
                className="flex-row items-center py-2 px-3"
                onPress={onReport}
              >
                <Ionicons name="flag-outline" size={18} color="#ef4444" />
                <ThemedText
                  className={`${textMuted} text-xs ml-1 font-semibold`}
                >
                  Report
                </ThemedText>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>

        {/* Edit/Delete Actions */}
        {showActions && (
          <View className={`flex-row gap-2 mt-3 pt-3 border-t ${border}`}>
            {onEdit && (
              <TouchableOpacity
                className="flex-1 bg-cyan-600 py-2 rounded-lg flex-row items-center justify-center"
                onPress={onEdit}
              >
                <Ionicons name="create" size={18} color="#fff" />
                <ThemedText className="text-white font-semibold ml-1">
                  Edit
                </ThemedText>
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity
                className="flex-1 bg-red-600 py-2 rounded-lg flex-row items-center justify-center"
                onPress={onDelete}
              >
                <Ionicons name="trash" size={18} color="#fff" />
                <ThemedText className="text-white font-semibold ml-1">
                  Delete
                </ThemedText>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}