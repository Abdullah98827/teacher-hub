import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, TouchableOpacity, View } from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";
import { supabase } from "../supabase";
import ProfilePicture from "./ProfilePicture";
import { ThemedText } from './themed-text';

export default function WeeklyLeaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  const { bgCard, bgCardAlt, border, textPrimary, textSecondary, textMuted } =
    useAppTheme();

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);

    const { data, error } = await supabase.rpc("get_weekly_leaderboard", {
      week_start_date: monday.toISOString().split("T")[0],
      limit_count: 5,
    });

    if (error) {
      console.error("Error loading leaderboard:", error);
    } else {
      setLeaderboard(data || []);
    }
    setLoading(false);
  };

  const getMedalIcon = (rank) => {
    if (rank === 1) return { name: "trophy", color: "#fbbf24" };
    if (rank === 2) return { name: "medal", color: "#d1d5db" };
    if (rank === 3) return { name: "medal", color: "#f97316" };
    return null;
  };

  if (loading) {
    return (
      <View className={`${bgCard} rounded-xl p-6 border ${border}`}>
        <ActivityIndicator size="large" color="#22d3ee" />
      </View>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <View className={`${bgCard} rounded-xl p-6 border ${border}`}>
        <ThemedText className={`${textPrimary} text-lg font-bold mb-2`}>
          Top Contributors
        </ThemedText>
        <ThemedText className={textSecondary}>No activity yet. Be the first!</ThemedText>
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
        {leaderboard.map((entry) => {
          const medal = getMedalIcon(entry.rank);

          return (
            <TouchableOpacity
              key={entry.teacher_id}
              className={`mb-3 p-4 rounded-xl ${
                entry.rank <= 3
                  ? "bg-cyan-900/40 border border-cyan-500/30"
                  : bgCardAlt
              }`}
              activeOpacity={0.7}
            >
              <View className="flex-row items-center">
                <View className="w-10 items-center">
                  {medal ? (
                    <Ionicons
                      name={medal.name}
                      size={28}
                      color={medal.color}
                    />
                  ) : (
                    <ThemedText className={`${textSecondary} font-bold text-xl`}>
                      {entry.rank}
                    </ThemedText>
                  )}
                </View>

                <ProfilePicture
                  imageUrl={entry.profile_picture_url}
                  firstName={entry.first_name}
                  lastName={entry.last_name}
                  size="md"
                />

                <View className="flex-1 ml-3">
                  <ThemedText className={`${textPrimary} font-bold text-base`}>
                    {entry.first_name} {entry.last_name}
                  </ThemedText>
                  <ThemedText className={`${textSecondary} text-sm`}>
                    {entry.total_points} points
                  </ThemedText>
                </View>

                <View className={`${bgCard} px-3 py-2 rounded-lg`}>
                  <ThemedText className="text-cyan-400 text-xs">
                    {entry.resources_uploaded} resources
                  </ThemedText>
                  <ThemedText className="text-purple-400 text-xs">
                    {entry.comments_made} comments
                  </ThemedText>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View className={`${bgCardAlt} p-4 rounded-lg mt-4`}>
        <ThemedText
          className={`${textPrimary} text-sm font-semibold mb-2 text-center`}
        >
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
            <ThemedText className={`${textMuted} font-bold text-lg`}>+5</ThemedText>
            <ThemedText className={`${textMuted} text-xs`}>Rating</ThemedText>
          </View>
        </View>
      </View>
    </View>
  );
}
