// // ComingSoon.tsx
// import React from "react";
// import { Text, View } from "react-native";

// export default function ComingSoon() {
//   return (
//     <View className="flex-1 items-center justify-center bg-white">
//       <Text className="text-3xl font-bold text-gray-800">Coming Soon</Text>
//     </View>
//   );
// }

// app/(tabs)/community.tsx
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import LogoHeader from "../../components/logoHeader";
import ScreenWrapper from "../../components/ScreenWrapper";
import { supabase } from "../../supabase";

interface UserProfile {
  firstName: string;
}

export default function CommunityScreen() {
  const [userProfile, setUserProfile] = useState<UserProfile>({
    firstName: "Teacher",
  });
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("teachers")
      .select("first_name")
      .eq("id", user.id)
      .single();

    if (profile) {
      setUserProfile({
        firstName: profile.first_name || "Teacher",
      });
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  if (loading) {
    return (
      <ScreenWrapper>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#22d3ee" />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <LogoHeader position="left" />
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        <Text className="text-3xl font-bold text-cyan-400 mb-2">Community</Text>
        <Text className="text-gray-400 mb-6">
          Connect with fellow educators
        </Text>

        {/* Coming Soon Card */}
        <View className="bg-gradient-to-br from-cyan-900/30 to-purple-900/30 rounded-2xl p-8 mb-6 border border-cyan-800/50">
          <View className="items-center">
            <View className="bg-cyan-500/20 w-20 h-20 rounded-full items-center justify-center mb-4">
              <Ionicons name="chatbubbles" size={40} color="#22d3ee" />
            </View>
            <Text className="text-2xl font-bold text-white mb-2 text-center">
              Coming Soon! 🚀
            </Text>
            <Text className="text-gray-300 text-center leading-6">
              We`re building an amazing community space where teachers can chat,
              share ideas, and collaborate.
            </Text>
          </View>
        </View>

        {/* Feature Preview Cards */}
        <Text className="text-white font-bold text-lg mb-4">
          What`s Coming:
        </Text>

        <View className="gap-4 mb-6">
          <View className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
            <View className="flex-row items-center mb-3">
              <View className="bg-purple-600/20 w-10 h-10 rounded-full items-center justify-center mr-3">
                <Ionicons
                  name="chatbubble-ellipses"
                  size={20}
                  color="#a855f7"
                />
              </View>
              <Text className="text-white text-lg font-bold">Group Chats</Text>
            </View>
            <Text className="text-gray-400 text-sm">
              Create and join subject-specific groups to discuss teaching
              strategies and share resources.
            </Text>
          </View>

          <View className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
            <View className="flex-row items-center mb-3">
              <View className="bg-blue-600/20 w-10 h-10 rounded-full items-center justify-center mr-3">
                <Ionicons name="school" size={20} color="#3b82f6" />
              </View>
              <Text className="text-white text-lg font-bold">
                Teacher Forums
              </Text>
            </View>
            <Text className="text-gray-400 text-sm">
              Ask questions, share experiences, and learn from experienced
              educators in your field.
            </Text>
          </View>

          <View className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
            <View className="flex-row items-center mb-3">
              <View className="bg-green-600/20 w-10 h-10 rounded-full items-center justify-center mr-3">
                <Ionicons name="calendar" size={20} color="#22c55e" />
              </View>
              <Text className="text-white text-lg font-bold">
                Events & Workshops
              </Text>
            </View>
            <Text className="text-gray-400 text-sm">
              Join virtual workshops, webinars, and professional development
              sessions.
            </Text>
          </View>

          <View className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
            <View className="flex-row items-center mb-3">
              <View className="bg-orange-600/20 w-10 h-10 rounded-full items-center justify-center mr-3">
                <Ionicons name="trophy" size={20} color="#f97316" />
              </View>
              <Text className="text-white text-lg font-bold">
                Recognition & Badges
              </Text>
            </View>
            <Text className="text-gray-400 text-sm">
              Earn badges for contributions, helping others, and sharing quality
              resources.
            </Text>
          </View>
        </View>

        {/* Stay Tuned Card */}
        <View className="bg-cyan-900/20 rounded-xl p-5 mb-6 border border-cyan-800">
          <Text className="text-cyan-400 font-bold text-base mb-2">
            💡 Stay Tuned
          </Text>
          <Text className="text-gray-300 text-sm leading-5">
            We`re working hard to bring you the best community experience.
            Meanwhile, check out our Library for great teaching resources!
          </Text>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
