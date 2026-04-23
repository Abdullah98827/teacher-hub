import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import Toast from "react-native-toast-message";
import { useAppTheme } from "../hooks/useAppTheme";
import { supabase } from "../supabase";
import { ThemedText } from "./themed-text";

export default function WeeklyLeaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const { bgCard, bgCardAlt, border, textPrimary, textSecondary, textMuted } = useAppTheme();

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      // Get Monday of current week
      const now = new Date();
      const dayOfWeek = now.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diff);
      monday.setHours(0, 0, 0, 0);
      const weekStartDate = monday.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from("leaderboard_weekly")
        .select(`
          id,
          teacher_id,
          total_points,
          resources_uploaded,
          comments_made,
          helpful_ratings_received,
          teacher:teachers(id, first_name, last_name, profile_picture_url)
        `)
        .eq("week_start", weekStartDate)
        .order("total_points", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error loading leaderboard:", error);
        Toast.show({
          type: "error",
          text1: "Failed to load leaderboard",
          text2: error.message,
        });
        setLoading(false);
        return;
      }

      setLeaderboard(data || []);
      setLoading(false);
    } catch (error) {
      console.error("Error in loadLeaderboard:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message,
      });
      setLoading(false);
    }
  };

  const getMedalIcon = (rank) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `${rank}`;
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center py-10">
        <ActivityIndicator size="large" color="#22d3ee" />
      </View>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <View className={`${bgCard} rounded-xl p-6 border ${border}`}>
        <View className="mb-4">
          <ThemedText className={`${textPrimary} text-xl font-bold`}>
            Top Contributors
          </ThemedText>
          <ThemedText className={`${textSecondary} text-sm`}>
            This week&apos;s most active teachers
          </ThemedText>
        </View>
        <View className="items-center py-8">
          <Ionicons name="trophy-outline" size={48} color="#22d3ee" />
          <ThemedText className={`${textSecondary} text-center mt-4`}>
            No activity yet. Be the first!
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View className={`${bgCard} rounded-xl p-6 border ${border}`}>
      <View className="mb-4">
        <ThemedText className={`${textPrimary} text-xl font-bold`}>
          Top Contributors
        </ThemedText>
        <ThemedText className={`${textSecondary} text-sm`}>
          This week&apos;s most active teachers
        </ThemedText>
      </View>

      <View>
        {leaderboard.map((entry, index) => (
          <View key={entry.id} className="mb-3">
            <View className={`${bgCardAlt} p-4 rounded-lg flex-row items-center justify-between`}>
              <View className="flex-row items-center flex-1">
                <View className="w-10 items-center">
                  <ThemedText className="text-lg font-bold text-cyan-400">
                    {getMedalIcon(index + 1)}
                  </ThemedText>
                </View>
                <View className="flex-1 ml-3">
                  <ThemedText className={`${textPrimary} font-bold`}>
                    {entry.teacher?.first_name} {entry.teacher?.last_name}
                  </ThemedText>
                  <ThemedText className={`${textMuted} text-xs`}>
                    {entry.resources_uploaded} uploads • {entry.comments_made} comments
                  </ThemedText>
                </View>
              </View>
              <View className="items-center">
                <ThemedText className="text-cyan-400 font-bold text-lg">
                  {entry.total_points}
                </ThemedText>
                <ThemedText className={`${textMuted} text-xs`}>pts</ThemedText>
              </View>
            </View>
          </View>
        ))}
      </View>

      <View className={`${bgCardAlt} p-4 rounded-lg mt-4`}>
        <ThemedText className={`${textPrimary} text-sm font-semibold mb-2 text-center`}>
          How to Earn Points
        </ThemedText>
        <View className="flex-row justify-around">
          <View className="items-center">
            <ThemedText className="text-cyan-400 font-bold text-lg">+10</ThemedText>
            <ThemedText className={`${textMuted} text-xs`}>Upload</ThemedText>
          </View>
          <View className="items-center">
            <ThemedText className="text-purple-400 font-bold text-lg">+2</ThemedText>
            <ThemedText className={`${textMuted} text-xs`}>Comment</ThemedText>
          </View>
          <View className="items-center">
            <ThemedText className="text-green-400 font-bold text-lg">+5</ThemedText>
            <ThemedText className={`${textMuted} text-xs`}>Rating</ThemedText>
          </View>
        </View>
      </View>
    </View>
  );
}