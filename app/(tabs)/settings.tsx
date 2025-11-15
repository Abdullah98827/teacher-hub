import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import LogoHeader from "../../components/logoHeader";
import { supabase } from "../../supabase";
import { useUserRole } from "../hooks/useUserRole";

export default function SettingsScreen() {
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    trn: "",
  });
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { role, loading: roleLoading } = useUserRole();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Loads user profile when page opens
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("teachers")
      .select("first_name, last_name, email, trn")
      .eq("id", user.id)
      .single();

    if (data) {
      setProfile({
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email,
        trn: data.trn,
      });
    }

    setLoading(false);
  };

  const handleLogout = () => {
    // for web used custom modal, and for mobile used native Alert
    if (Platform.OS === "web") {
      setShowLogoutModal(true);
    } else {
      Alert.alert("Logout", "Are you sure you want to logout?", [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", style: "destructive", onPress: executeLogout },
      ]);
    }
  };

  const executeLogout = async () => {
    setLoggingOut(true);
    const { error } = await supabase.auth.signOut();

    if (error) {
      Toast.show({
        type: "error",
        text1: "Logout Failed",
        text2: error.message,
      });
      setLoggingOut(false);
    } else {
      router.replace("/login");
    }
  };

  if (loading || roleLoading) {
    return (
      <View
        className="flex-1 bg-black justify-center items-center"
        style={{ paddingTop: insets.top }}
      >
        <ActivityIndicator size="large" color="#22d3ee" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black" style={{ paddingTop: insets.top }}>
      <LogoHeader position="left" />

      <ScrollView className="flex-1 px-5">
        <View className="py-6">
          <Text className="text-3xl font-bold text-cyan-400 mb-2">
            Settings
          </Text>
          <Text className="text-gray-400">
            Manage your account and preferences
          </Text>
        </View>

        <View className="bg-neutral-900 rounded-xl p-5 mb-4 border border-neutral-800">
          <Text className="text-xl font-bold text-cyan-400 mb-4">
            Profile Information
          </Text>

          <View className="mb-3">
            <Text className="text-gray-500 text-xs mb-1">Full Name</Text>
            <Text className="text-white text-base">
              {profile.firstName} {profile.lastName}
            </Text>
          </View>

          <View className="mb-3">
            <Text className="text-gray-500 text-xs mb-1">Email Address</Text>
            <Text className="text-white text-base">{profile.email}</Text>
          </View>

          <View className="mb-3">
            <Text className="text-gray-500 text-xs mb-1">
              Teacher Reference Number (TRN)
            </Text>
            <Text className="text-white text-base">{profile.trn}</Text>
          </View>

          <View>
            <Text className="text-gray-500 text-xs mb-1">Account Role</Text>
            <Text
              className={`text-base font-semibold ${role === "admin" ? "text-red-400" : "text-cyan-400"}`}
            >
              {role === "admin" ? "🛡️ Admin" : "👨‍🏫 Teacher"}
            </Text>
          </View>
        </View>

        {/* Admin Hub Access only for admins) */}
        {role === "admin" && (
          <View className="bg-gradient-to-br from-red-900 to-orange-900 rounded-xl p-5 mb-4 border-2 border-red-500">
            <View className="flex-row items-center mb-3">
              <View className="bg-red-600 w-14 h-14 rounded-full items-center justify-center mr-4">
                <Text className="text-3xl">🛡️</Text>
              </View>
              <View className="flex-1">
                <Text className="text-xl font-bold text-white">
                  Admin Access
                </Text>
                <Text className="text-red-200 text-sm">
                  Manage platform operations
                </Text>
              </View>
            </View>

            <TouchableOpacity
              className="bg-red-600 p-4 rounded-lg active:scale-95"
              onPress={() => router.push("/admin")}
            >
              <Text className="text-white text-center font-bold">
                Open Admin Hub →
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View className="bg-neutral-900 rounded-xl p-5 mb-4 border border-neutral-800">
          <Text className="text-xl font-bold text-cyan-400 mb-4">
            Account Actions
          </Text>

          <TouchableOpacity
            className="bg-neutral-800 p-4 rounded-lg mb-3 active:scale-95 border border-neutral-700"
            onPress={() => router.push("/change-password")}
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-white font-semibold">Change Password</Text>
              <Text className="text-gray-500">›</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-neutral-800 p-4 rounded-lg mb-3 active:scale-95 border border-neutral-700"
            onPress={() => router.push("/edit-profile")}
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-white font-semibold">Edit Profile</Text>
              <Text className="text-gray-500">›</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-red-600 p-4 rounded-lg active:scale-95"
            onPress={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text className="text-white text-center font-bold">Logout</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Support Section (only for teachers) */}
        {role === "teacher" && (
          <View className="bg-neutral-900 rounded-xl p-5 mb-6 border border-neutral-800">
            <Text className="text-xl font-bold text-cyan-400 mb-4">
              Support
            </Text>
            <Text className="text-gray-400 mb-3">
              Need help or want to reach out to the admin team?
            </Text>

            <TouchableOpacity
              className="bg-cyan-600 p-4 rounded-lg active:scale-95"
              onPress={() => router.push("/contact")}
            >
              <Text className="text-white text-center font-bold">
                Contact Admin
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View className="bg-neutral-900 rounded-xl p-5 mb-6 border border-neutral-800">
          <Text className="text-xl font-bold text-cyan-400 mb-4">About</Text>
          <View className="mb-2">
            <Text className="text-gray-400 text-sm">Application Name</Text>
            <Text className="text-white text-base font-semibold">
              Teacher-Hub
            </Text>
          </View>
          <View>
            <Text className="text-gray-400 text-sm">Version</Text>
            <Text className="text-white text-base font-semibold">1.0.0</Text>
          </View>
        </View>
      </ScrollView>

      {/* Logout Confirmation Modal (Web Only) */}
      {showLogoutModal && Platform.OS === "web" && (
        <View className="absolute inset-0 bg-black/70 justify-center items-center z-50">
          <View className="bg-neutral-900 rounded-xl p-6 mx-5 max-w-sm border border-neutral-800">
            <Text className="text-xl font-bold text-white mb-3">Logout</Text>
            <Text className="text-gray-300 mb-6">
              Are you sure you want to logout?
            </Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-neutral-800 p-4 rounded-lg border border-neutral-700"
                onPress={() => setShowLogoutModal(false)}
              >
                <Text className="text-white text-center font-semibold">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-red-600 p-4 rounded-lg"
                onPress={() => {
                  setShowLogoutModal(false);
                  executeLogout();
                }}
              >
                <Text className="text-white text-center font-bold">Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <Toast />
    </View>
  );
}
