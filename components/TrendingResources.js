import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, TouchableOpacity, View } from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";
import { supabase } from "../supabase";
import {
  getResourcesStatsBatched,
  getUploadersBatched,
} from "../utils/resourceHelpers";
import ProfilePicture from "./ProfilePicture";
import { ThemedText } from "./themed-text";

export default function TrendingResources() {
  const router = useRouter();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);

  const {
    bgCard,
    bgCardAlt,
    border,
    textPrimary,
    textSecondary,
    textMuted,
    isDark,
  } = useAppTheme();

  useEffect(() => {
    loadTrendingResources();
  }, []);

  const loadTrendingResources = async () => {
    try {
      setLoading(true);

      // Single query to get approved resources
      const { data, error } = await supabase
        .from("resources")
        .select(
          "id, title, category, downloads_count, view_count, created_at, subject:subjects(name), uploaded_by"
        )
        .eq("status", "approved")
        .order("view_count", { ascending: false })
        .limit(5);

      if (error) {
        console.error("Error loading trending resources:", error);
        setLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        setResources([]);
        setLoading(false);
        return;
      }

      // BATCH query stats and uploaders instead of per-resource
      const resourceIds = data.map((r) => r.id);
      const uploaderIds = data.map((r) => r.uploaded_by);

      const [statsMap, uploaderMap] = await Promise.all([
        getResourcesStatsBatched(resourceIds),
        getUploadersBatched(uploaderIds),
      ]);

      // Enrich resources
      const enriched = data.map((resource) => ({
        ...resource,
        stats: statsMap.get(resource.id),
        uploader: uploaderMap.get(resource.uploaded_by),
      }));

      setResources(enriched);
      setLoading(false);
    } catch (err) {
      console.error("Error in loadTrendingResources:", err);
      setLoading(false);
    }
  };

  const getCategoryColor = (category) => {
    if (category === "powerpoint") return "#ef4444";
    if (category === "worksheet") return "#3b82f6";
    if (category === "lesson_plan") return "#10b981";
    return "#6b7280";
  };

  const getCategoryName = (category) => {
    if (category === "powerpoint") return "PowerPoint";
    if (category === "worksheet") return "Worksheet";
    if (category === "lesson_plan") return "Lesson Plan";
    return category;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
  };

  if (loading) {
    return (
      <View className={`${bgCard} rounded-xl p-6 border ${border}`}>
        <ActivityIndicator size="large" color="#22d3ee" />
      </View>
    );
  }

  if (resources.length === 0) {
    return (
      <View className={`${bgCard} rounded-xl p-6 border ${border}`}>
        <ThemedText className={`${textPrimary} text-xl font-bold mb-2`}>
          Trending Resources
        </ThemedText>
        <ThemedText className={`${textSecondary} mb-4`}>
          No trending resources yet.
        </ThemedText>
        <TouchableOpacity
          className="bg-cyan-600 p-3 rounded-lg"
          onPress={() => router.push("/(tabs)/resources")}
        >
          <ThemedText className="text-white font-semibold text-center">
            Browse Resources
          </ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className={`${bgCard} rounded-xl p-6 border ${border}`}>
      <View className="mb-4">
        <ThemedText className={`${textPrimary} text-xl font-bold`}>
          Trending Resources
        </ThemedText>
        <ThemedText className={`${textSecondary} text-sm`}>
          Most popular content
        </ThemedText>
      </View>

      <View>
        {resources.map((resource, index) => (
          <TouchableOpacity
            key={resource.id}
            className={`${bgCardAlt} rounded-xl p-4 border ${border} mb-3`}
            activeOpacity={0.7}
            onPress={() => router.push("/(tabs)/resources")}
          >
            <View className="flex-row items-start justify-between mb-2">
              <View
                className="px-3 py-1 rounded-lg"
                style={{
                  backgroundColor: `${getCategoryColor(resource.category)}20`,
                }}
              >
                <ThemedText
                  className="text-xs font-bold"
                  style={{
                    color: getCategoryColor(resource.category),
                  }}
                >
                  {getCategoryName(resource.category)}
                </ThemedText>
              </View>

              <View className="bg-cyan-500/20 px-2 py-1 rounded-full">
                <ThemedText className="text-cyan-400 text-xs font-bold">
                  #{index + 1}
                </ThemedText>
              </View>
            </View>

            <ThemedText
              className={`${textPrimary} font-bold text-base mb-2`}
              numberOfLines={2}
            >
              {resource.title}
            </ThemedText>

            <View
              className={`px-3 py-1 rounded-lg mb-3 self-start ${
                isDark ? "bg-cyan-900/40" : "bg-cyan-100"
              }`}
            >
              <ThemedText
                className={`text-xs font-semibold ${
                  isDark ? "text-cyan-400" : "text-cyan-700"
                }`}
              >
                {resource.subject?.name || "General"}
              </ThemedText>
            </View>

            <View
              className={`flex-row items-center justify-between mb-3 pb-3 border-b ${border}`}
            >
              <View className="flex-row items-center gap-3">
                <View className="flex-row items-center">
                  <Ionicons name="eye" size={14} color="#9CA3AF" />
                  <ThemedText className={`${textMuted} text-xs ml-1`}>
                    {resource.stats?.viewCount || 0}
                  </ThemedText>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="download" size={14} color="#22d3ee" />
                  <ThemedText className={`${textMuted} text-xs ml-1`}>
                    {resource.stats?.downloadsCount || 0}
                  </ThemedText>
                </View>
                {resource.stats?.ratingCount > 0 && (
                  <View className="flex-row items-center">
                    <Ionicons name="star" size={14} color="#f59e0b" />
                    <ThemedText className={`${textMuted} text-xs ml-1`}>
                      {resource.stats?.averageRating?.toFixed(1)} (
                      {resource.stats?.ratingCount})
                    </ThemedText>
                  </View>
                )}
                {resource.stats?.commentCount > 0 && (
                  <View className="flex-row items-center">
                    <Ionicons name="chatbubble" size={14} color="#a855f7" />
                    <ThemedText className={`${textMuted} text-xs ml-1`}>
                      {resource.stats?.commentCount}
                    </ThemedText>
                  </View>
                )}
              </View>
            </View>

            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <ProfilePicture
                  imageUrl={null}
                  firstName={resource.uploader?.first_name}
                  lastName={resource.uploader?.last_name}
                  size="sm"
                />
                <ThemedText
                  className={`${textMuted} text-xs ml-2`}
                  numberOfLines={1}
                >
                  {resource.uploader?.first_name}{" "}
                  {resource.uploader?.last_name}
                </ThemedText>
              </View>

              <ThemedText className={`${textMuted} text-xs`}>
                {formatDate(resource.created_at)}
              </ThemedText>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        className="bg-cyan-600 p-3 rounded-lg mt-2"
        onPress={() => router.push("/(tabs)/resources")}
      >
        <ThemedText className="text-white font-semibold text-center">
          Browse All Resources
        </ThemedText>
      </TouchableOpacity>
    </View>
  );
}