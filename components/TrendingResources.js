import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, TouchableOpacity, View } from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";
import { supabase } from "../supabase";
import ProfilePicture from "./ProfilePicture";
import { ThemedText } from './themed-text';

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
      const { data, error } = await supabase
        .from("resources")
        .select(
          `
          id,
          title,
          category,
          downloads_count,
          created_at,
          subject_id,
          uploaded_by
        `
        )
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      if (!data || data.length === 0) {
        setResources([]);
        setLoading(false);
        return;
      }

      const enriched = await Promise.all(
        data.map(async (resource) => {
          const { data: subject } = await supabase
            .from("subjects")
            .select("name")
            .eq("id", resource.subject_id)
            .single();

          const { data: uploader } = await supabase
            .from("teachers")
            .select("first_name, last_name, profile_picture_url")
            .eq("id", resource.uploaded_by)
            .single();

          const { count: views } = await supabase
            .from("resource_views")
            .select("*", { count: "exact", head: true })
            .eq("resource_id", resource.id);

          const { data: ratings } = await supabase
            .from("resource_ratings")
            .select("rating")
            .eq("resource_id", resource.id);

          const { count: comments } = await supabase
            .from("resource_comments")
            .select("*", { count: "exact", head: true })
            .eq("resource_id", resource.id)
            .eq("is_deleted", false);

          const avgRating =
            ratings && ratings.length > 0
              ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
              : 0;

          return {
            id: resource.id,
            title: resource.title,
            category: resource.category,
            subject_name: subject?.name || "Unknown",
            uploader_first_name: uploader?.first_name || "Unknown",
            uploader_last_name: uploader?.last_name || "",
            uploader_profile_picture: uploader?.profile_picture_url || null,
            downloads_count: resource.downloads_count || 0,
            views_count: views || 0,
            rating_avg: Math.round(avgRating * 10) / 10,
            rating_count: ratings?.length || 0,
            comment_count: comments || 0,
            created_at: resource.created_at,
          };
        })
      );

      // Multi-level sort: views > downloads > ratings > comments > date
      const sorted = enriched
        .sort((a, b) => {
          // 1. Sort by views (highest first)
          if (b.views_count !== a.views_count) {
            return b.views_count - a.views_count;
          }

          // 2. If views are equal, sort by downloads
          if (b.downloads_count !== a.downloads_count) {
            return b.downloads_count - a.downloads_count;
          }

          // 3. If downloads are equal, sort by rating average
          if (b.rating_avg !== a.rating_avg) {
            return b.rating_avg - a.rating_avg;
          }

          // 4. If ratings are equal, sort by comment count
          if (b.comment_count !== a.comment_count) {
            return b.comment_count - a.comment_count;
          }

          // 5. If all equal, sort by date (newest first)
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        })
        .slice(0, 5);

      setResources(sorted);
    } catch (error) {
      console.error("Error loading trending resources:", error);
    } finally {
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
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
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
        <ThemedText className={`${textSecondary} text-sm`}>Most popular content</ThemedText>
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
                  style={{ color: getCategoryColor(resource.category) }}
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
              className={`px-3 py-1 rounded-lg mb-3 self-start ${isDark ? "bg-cyan-900/40" : "bg-cyan-100"}`}
            >
              <ThemedText
                className={`text-xs font-semibold ${isDark ? "text-cyan-400" : "text-cyan-700"}`}
              >
                {resource.subject_name}
              </ThemedText>
            </View>

            <View
              className={`flex-row items-center justify-between mb-3 pb-3 border-b ${border}`}
            >
              <View className="flex-row items-center gap-3">
                <View className="flex-row items-center">
                  <Ionicons name="eye" size={14} color="#9CA3AF" />
                  <ThemedText className={`${textMuted} text-xs ml-1`}>
                    {resource.views_count}
                  </ThemedText>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="download" size={14} color="#22d3ee" />
                  <ThemedText className={`${textMuted} text-xs ml-1`}>
                    {resource.downloads_count}
                  </ThemedText>
                </View>
                {resource.rating_count > 0 && (
                  <View className="flex-row items-center">
                    <Ionicons name="star" size={14} color="#f59e0b" />
                    <ThemedText className={`${textMuted} text-xs ml-1`}>
                      {resource.rating_avg} ({resource.rating_count})
                    </ThemedText>
                  </View>
                )}
                {resource.comment_count > 0 && (
                  <View className="flex-row items-center">
                    <Ionicons name="chatbubble" size={14} color="#a855f7" />
                    <ThemedText className={`${textMuted} text-xs ml-1`}>
                      {resource.comment_count}
                    </ThemedText>
                  </View>
                )}
              </View>
            </View>

            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <ProfilePicture
                  imageUrl={resource.uploader_profile_picture}
                  firstName={resource.uploader_first_name}
                  lastName={resource.uploader_last_name}
                  size="sm"
                />
                <ThemedText className={`${textMuted} text-xs ml-2`} numberOfLines={1}>
                  {resource.uploader_first_name} {resource.uploader_last_name}
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