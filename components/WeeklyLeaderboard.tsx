import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { supabase } from "../supabase";
import ProfilePicture from "./ProfilePicture";

interface LeaderboardEntry {
  teacher_id: string;
  first_name: string;
  last_name: string;
  profile_picture_url: string | null;
  resources_uploaded: number;
  comments_made: number;
  helpful_ratings_received: number;
  total_points: number;
  rank: number;
}

export default function WeeklyLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
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

      if (error) throw error;
      setLeaderboard(data || []);
    } catch (error: any) {
      console.error("Error loading leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const getMedalIcon = (rank: number) => {
    if (rank === 1) return { name: "trophy", color: "#fbbf24" };
    if (rank === 2) return { name: "medal", color: "#d1d5db" };
    if (rank === 3) return { name: "medal", color: "#f97316" };
    return null;
  };

  if (loading) {
    return (
      <View className="bg-neutral-900 rounded-xl p-6 border border-neutral-800">
        <ActivityIndicator size="large" color="#22d3ee" />
      </View>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <View className="bg-neutral-900 rounded-xl p-6 border border-neutral-800">
        <Text className="text-white text-lg font-bold mb-2">
          Top Contributors
        </Text>
        <Text className="text-gray-400">No activity yet. Be the first!</Text>
      </View>
    );
  }

  return (
    <View className="bg-neutral-900 rounded-xl p-6 border border-neutral-800">
      <View className="mb-4">
        <Text className="text-white text-xl font-bold">Top Contributors</Text>
        <Text className="text-gray-400 text-sm">
          This week`s most active teachers
        </Text>
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
                  : "bg-neutral-800"
              }`}
              activeOpacity={0.7}
            >
              <View className="flex-row items-center">
                <View className="w-10 items-center">
                  {medal ? (
                    <Ionicons
                      name={medal.name as any}
                      size={28}
                      color={medal.color}
                    />
                  ) : (
                    <Text className="text-gray-400 font-bold text-xl">
                      {entry.rank}
                    </Text>
                  )}
                </View>

                <ProfilePicture
                  imageUrl={entry.profile_picture_url}
                  firstName={entry.first_name}
                  lastName={entry.last_name}
                  size="md"
                />

                <View className="flex-1 ml-3">
                  <Text className="text-white font-bold text-base">
                    {entry.first_name} {entry.last_name}
                  </Text>
                  <Text className="text-gray-400 text-sm">
                    {entry.total_points} points
                  </Text>
                </View>

                <View className="bg-neutral-900 px-3 py-2 rounded-lg">
                  <Text className="text-cyan-400 text-xs">
                    {entry.resources_uploaded} resources
                  </Text>
                  <Text className="text-purple-400 text-xs">
                    {entry.comments_made} comments
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* FIXED: Changed orange to amber for visibility */}
      <View className="bg-neutral-800 p-4 rounded-lg mt-4">
        <Text className="text-white text-sm font-semibold mb-2 text-center">
          How to Earn Points
        </Text>
        <View className="flex-row justify-around">
          <View className="items-center">
            <Text className="text-cyan-400 font-bold text-lg">+10</Text>
            <Text className="text-gray-400 text-xs">Upload</Text>
          </View>
          <View className="items-center">
            <Text className="text-purple-400 font-bold text-lg">+2</Text>
            <Text className="text-gray-400 text-xs">Comment</Text>
          </View>
          <View className="items-center">
            <Text className="text-gray-500 font-bold text-lg">+5</Text>
            <Text className="text-gray-400 text-xs">Rating</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
