// app/(tabs)/index.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import LogoHeader from "../../components/logoHeader";
import ScreenWrapper from "../../components/ScreenWrapper";
import { supabase } from "../../supabase";

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
}

interface Stats {
  uploadedResources: number;
  approvedResources: number;
  totalDownloads: number;
}

export default function DashboardScreen() {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfile>({
    firstName: "Teacher",
    lastName: "",
    email: "",
  });
  const [stats, setStats] = useState<Stats>({
    uploadedResources: 0,
    approvedResources: 0,
    totalDownloads: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    // Fetch user profile
    const { data: profile } = await supabase
      .from("teachers")
      .select("first_name, last_name, email")
      .eq("id", user.id)
      .single();

    if (profile) {
      setUserProfile({
        firstName: profile.first_name || "Teacher",
        lastName: profile.last_name || "",
        email: profile.email || "",
      });
    }

    // Check if admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("id", user.id)
      .single();

    const adminStatus =
      roleData?.role === "admin" || roleData?.role === "super_admin";
    setIsAdmin(adminStatus);

    // Fetch stats
    const { data: resources } = await supabase
      .from("resources")
      .select("status, downloads_count")
      .eq("uploaded_by", user.id);

    if (resources) {
      const approved = resources.filter((r) => r.status === "approved").length;
      const downloads = resources.reduce(
        (sum, r) => sum + (r.downloads_count || 0),
        0
      );

      setStats({
        uploadedResources: resources.length,
        approvedResources: approved,
        totalDownloads: downloads,
      });
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

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
        {/* Welcome Card */}
        <View className="bg-gradient-to-br from-cyan-900/30 to-purple-900/30 rounded-2xl p-6 mb-6 border border-cyan-800/50">
          <Text className="text-3xl font-bold text-cyan-400 mb-2">
            Hello {userProfile.firstName}! 👋
          </Text>
          <Text className="text-base text-gray-300">
            Welcome back to Teacher-Hub
          </Text>
        </View>

        {/* Stats Cards */}
        <Text className="text-white font-bold text-lg mb-3">Your Stats</Text>
        <View className="flex-row gap-3 mb-6">
          <View className="flex-1 bg-blue-900/30 rounded-xl p-4 border border-blue-800">
            <Ionicons name="cloud-upload" size={24} color="#3b82f6" />
            <Text className="text-3xl font-bold text-white mt-2">
              {stats.uploadedResources}
            </Text>
            <Text className="text-blue-400 text-xs">Uploaded</Text>
          </View>
          <View className="flex-1 bg-green-900/30 rounded-xl p-4 border border-green-800">
            <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
            <Text className="text-3xl font-bold text-white mt-2">
              {stats.approvedResources}
            </Text>
            <Text className="text-green-400 text-xs">Approved</Text>
          </View>
          <View className="flex-1 bg-purple-900/30 rounded-xl p-4 border border-purple-800">
            <Ionicons name="download" size={24} color="#a855f7" />
            <Text className="text-3xl font-bold text-white mt-2">
              {stats.totalDownloads}
            </Text>
            <Text className="text-purple-400 text-xs">Downloads</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text className="text-white font-bold text-lg mb-3">Quick Actions</Text>
        <View className="gap-3 mb-6">
          <TouchableOpacity
            className="bg-cyan-600 rounded-xl p-4 flex-row items-center justify-between"
            onPress={() => router.push("/upload-resource")}
          >
            <View className="flex-row items-center">
              <View className="bg-white/20 w-10 h-10 rounded-full items-center justify-center mr-3">
                <Ionicons name="cloud-upload" size={20} color="#fff" />
              </View>
              <View>
                <Text className="text-white font-bold text-base">
                  Upload Resource
                </Text>
                <Text className="text-cyan-100 text-xs">
                  Share teaching materials
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-neutral-900 rounded-xl p-4 flex-row items-center justify-between border border-neutral-800"
            onPress={() => router.push("/(tabs)/resources")}
          >
            <View className="flex-row items-center">
              <View className="bg-cyan-600/20 w-10 h-10 rounded-full items-center justify-center mr-3">
                <Ionicons name="library" size={20} color="#22d3ee" />
              </View>
              <View>
                <Text className="text-white font-bold text-base">
                  Browse Library
                </Text>
                <Text className="text-gray-400 text-xs">
                  Explore teaching resources
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#9ca3af" />
          </TouchableOpacity>

          {isAdmin && (
            <TouchableOpacity
              className="bg-red-900/30 rounded-xl p-4 flex-row items-center justify-between border border-red-800"
              onPress={() => router.push("/admin/manage-resources")}
            >
              <View className="flex-row items-center">
                <View className="bg-red-600/20 w-10 h-10 rounded-full items-center justify-center mr-3">
                  <Ionicons name="shield-checkmark" size={20} color="#ef4444" />
                </View>
                <View>
                  <Text className="text-white font-bold text-base">
                    Manage Resources
                  </Text>
                  <Text className="text-red-400 text-xs">Admin access</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        {/* Info Card */}
        <View className="bg-cyan-900/20 rounded-xl p-5 mb-6 border border-cyan-800">
          <Text className="text-cyan-400 font-bold text-base mb-2">
            💡 Did You Know?
          </Text>
          <Text className="text-gray-300 text-sm leading-5">
            Upload 10 approved resources to earn a 20% discount on your next
            subscription renewal!
          </Text>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
