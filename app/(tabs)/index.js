import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    TouchableOpacity,
    View,
} from "react-native";
import LogoHeader from "../../components/logoHeader";
import OnboardingModal from '../../components/OnboardingModal';
import ScreenWrapper from "../../components/ScreenWrapper";
import { ThemedText } from '../../components/themed-text';
import { useAuth } from '../../contexts/AuthContext';
import { useAppTheme } from "../../hooks/useAppTheme";
import { supabase } from "../../supabase";
import { hasSeenOnboarding, setOnboardingSeen } from '../../utils/onboardingHelpers';

export default function DashboardScreen() {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState({
    firstName: "Teacher",
    lastName: "",
    email: "",
  });
  const [stats, setStats] = useState({
    uploadedResources: 0,
    approvedResources: 0,
    totalDownloads: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const { bgCard, border, textPrimary, textSecondary, isDark } = useAppTheme();
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

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

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("id", user.id)
      .single();

    const adminStatus =
      roleData?.role === "admin" || roleData?.role === "super_admin";
    setIsAdmin(adminStatus);

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

  useEffect(() => {
    if (user && user.id) {
      hasSeenOnboarding(user.id, 'dashboard').then((seen) => {
        if (!seen) {
          setShowOnboarding(true);
        }
      });
    }
  }, [user]);

  const handleCloseOnboarding = () => {
    if (user && user.id) {
      setOnboardingSeen(user.id, 'dashboard');
    }
    setShowOnboarding(false);
  };

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
      <OnboardingModal
        visible={showOnboarding}
        onClose={handleCloseOnboarding}
        title="Welcome to your Dashboard!"
        description="Here's what you can do on this screen:"
        steps={[
          'View your teaching stats',
          'Upload and manage resources',
          'Access quick actions',
          'See your progress and tips',
        ]}
      />
      <LogoHeader position="left" />
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        {/* Welcome Card */}
        <View
          className={`rounded-2xl p-6 mb-6 border ${isDark ? "bg-cyan-900/20 border-cyan-800/50" : "bg-cyan-50 border-cyan-200"}`}
        >
          <ThemedText className="text-3xl font-bold text-cyan-500 mb-2">
            Hello {userProfile.firstName}!
          </ThemedText>
          <ThemedText className={`text-base ${textSecondary}`}>
            Welcome back to Teacher-Hub
          </ThemedText>
        </View>

        {/* Stats Cards */}
        <ThemedText className={`${textPrimary} font-bold text-lg mb-3`}>
          Your Stats
        </ThemedText>
        <View className="flex-row gap-3 mb-6">
          <View
            className={`flex-1 rounded-xl p-4 border ${isDark ? "bg-blue-900/30 border-blue-800" : "bg-blue-50 border-blue-200"}`}
          >
            <Ionicons
              name="cloud-upload"
              size={24}
              color={isDark ? "#3b82f6" : "#2563eb"}
            />
            <ThemedText className={`text-3xl font-bold ${textPrimary} mt-2`}>
              {stats.uploadedResources}
            </ThemedText>
            <ThemedText
              className={
                isDark ? "text-blue-400 text-xs" : "text-blue-600 text-xs"
              }
            >
              Uploaded
            </ThemedText>
          </View>
          <View
            className={`flex-1 rounded-xl p-4 border ${isDark ? "bg-green-900/30 border-green-800" : "bg-green-50 border-green-200"}`}
          >
            <Ionicons
              name="checkmark-circle"
              size={24}
              color={isDark ? "#22c55e" : "#16a34a"}
            />
            <ThemedText className={`text-3xl font-bold ${textPrimary} mt-2`}>
              {stats.approvedResources}
            </ThemedText>
            <ThemedText
              className={
                isDark ? "text-green-400 text-xs" : "text-green-600 text-xs"
              }
            >
              Approved
            </ThemedText>
          </View>
          <View
            className={`flex-1 rounded-xl p-4 border ${isDark ? "bg-purple-900/30 border-purple-800" : "bg-purple-50 border-purple-200"}`}
          >
            <Ionicons
              name="download"
              size={24}
              color={isDark ? "#a855f7" : "#7c3aed"}
            />
            <ThemedText className={`text-3xl font-bold ${textPrimary} mt-2`}>
              {stats.totalDownloads}
            </ThemedText>
            <ThemedText
              className={
                isDark ? "text-purple-400 text-xs" : "text-purple-600 text-xs"
              }
            >
              Downloads
            </ThemedText>
          </View>
        </View>

        {/* Quick Actions */}
        <ThemedText className={`${textPrimary} font-bold text-lg mb-3`}>
          Quick Actions
        </ThemedText>
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
                <ThemedText className="text-white font-bold text-base">
                  Upload Resource
                </ThemedText>
                <ThemedText className="text-cyan-100 text-xs">
                  Share teaching materials
                </ThemedText>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            className={`${bgCard} rounded-xl p-4 flex-row items-center justify-between border ${border}`}
            onPress={() => router.push("/(tabs)/resources")}
          >
            <View className="flex-row items-center">
              <View className="bg-cyan-600/20 w-10 h-10 rounded-full items-center justify-center mr-3">
                <Ionicons name="library" size={20} color="#22d3ee" />
              </View>
              <View>
                <ThemedText className={`${textPrimary} font-bold text-base`}>
                  Browse Library
                </ThemedText>
                <ThemedText className={`${textSecondary} text-xs`}>
                  Explore teaching resources
                </ThemedText>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity
            className={`${bgCard} rounded-xl p-4 flex-row items-center justify-between border ${border}`}
            onPress={() => router.push("/direct-messages")}
          >
            <View className="flex-row items-center">
              <View className="bg-cyan-600/20 w-10 h-10 rounded-full items-center justify-center mr-3">
                <Ionicons name="chatbubble-ellipses" size={20} color="#22d3ee" />
              </View>
              <View>
                <ThemedText className={`${textPrimary} font-bold text-base`}>
                  Messages
                </ThemedText>
                <ThemedText className={`${textSecondary} text-xs`}>
                  Direct message other teachers
                </ThemedText>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#9ca3af" />
          </TouchableOpacity>

          {isAdmin && (
            <TouchableOpacity
              className={`rounded-xl p-4 flex-row items-center justify-between border ${isDark ? "bg-red-900/30 border-red-800" : "bg-red-50 border-red-200"}`}
              onPress={() => router.push("/admin/manage-resources")}
            >
              <View className="flex-row items-center">
                <View className="bg-red-600/20 w-10 h-10 rounded-full items-center justify-center mr-3">
                  <Ionicons name="shield-checkmark" size={20} color="#ef4444" />
                </View>
                <View>
                  <ThemedText className={`${textPrimary} font-bold text-base`}>
                    Manage Resources
                  </ThemedText>
                  <ThemedText className="text-red-400 text-xs">Admin access</ThemedText>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        {/* Info Card */}
        <View
          className={`rounded-xl p-5 mb-6 border ${isDark ? "bg-cyan-900/20 border-cyan-800" : "bg-cyan-50 border-cyan-200"}`}
        >
          <ThemedText
            className={`font-bold text-base mb-2 ${isDark ? "text-cyan-400" : "text-cyan-600"}`}
          >
            💡 Did You Know?
          </ThemedText>
          <ThemedText className={`${textSecondary} text-sm leading-5`}>
            Upload 10 approved resources to earn a 20% discount on your next
            subscription renewal!
          </ThemedText>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
