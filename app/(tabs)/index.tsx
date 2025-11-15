import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LogoHeader from "../../components/logoHeader";
import { supabase } from "../../supabase";

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
}

export default function HomeScreen() {
  const [userProfile, setUserProfile] = useState<UserProfile>({
    firstName: "Teacher",
    lastName: "",
    email: "",
  });
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  // Loads user's profile when page opens
  useEffect(() => {
    const fetchUserProfile = async () => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("teachers")
        .select("first_name, last_name, email")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        setLoading(false);
        return;
      }

      setUserProfile({
        firstName: profile.first_name || "Teacher",
        lastName: profile.last_name || "",
        email: profile.email || "",
      });

      setLoading(false);
    };

    fetchUserProfile();
  }, []);

  if (loading) {
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
        <View className="flex-1 justify-center py-10">
          <View className="bg-neutral-900 rounded-xl p-8 shadow-lg border border-neutral-800 mb-6">
            <Text className="text-3xl font-bold text-cyan-400 mb-2 text-center">
              Hello {userProfile.firstName}! 👋
            </Text>
            <Text className="text-base text-gray-300 text-center">
              Welcome to the Teacher-Hub
            </Text>
          </View>

          <View className="gap-4">
            <View className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
              <View className="flex-row items-center">
                <View className="bg-cyan-600 w-12 h-12 rounded-full items-center justify-center mr-4">
                  <Text className="text-2xl">📚</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-white text-lg font-bold">
                    Resources
                  </Text>
                  <Text className="text-gray-400 text-sm">
                    Access teaching materials
                  </Text>
                </View>
              </View>
            </View>

            <View className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
              <View className="flex-row items-center">
                <View className="bg-purple-600 w-12 h-12 rounded-full items-center justify-center mr-4">
                  <Text className="text-2xl">👥</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-white text-lg font-bold">
                    Community
                  </Text>
                  <Text className="text-gray-400 text-sm">
                    Connect with other teachers
                  </Text>
                </View>
              </View>
            </View>

            <View className="bg-neutral-900 rounded-xl p-5 border border-neutral-800">
              <View className="flex-row items-center">
                <View className="bg-green-600 w-12 h-12 rounded-full items-center justify-center mr-4">
                  <Text className="text-2xl">✓</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-white text-lg font-bold">Verified</Text>
                  <Text className="text-gray-400 text-sm">
                    Your account is active
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View className="bg-cyan-900/20 rounded-xl p-5 mt-6 border border-cyan-800">
            <Text className="text-cyan-400 font-bold text-base mb-2">
              💡 Getting Started
            </Text>
            <Text className="text-gray-300 text-sm leading-5">
              Explore the tabs below to access resources, view your dashboard,
              and manage your settings.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
