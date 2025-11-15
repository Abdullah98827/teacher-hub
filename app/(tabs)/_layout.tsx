import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Tabs } from "expo-router/tabs";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import "../../global.css";
import { supabase } from "../../supabase";

export default function TabLayout() {
  const router = useRouter();
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    const checkUserAccess = async () => {
      // Checks if the user is logged in
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/login");
        return;
      }

      // Checks user's role if they're admin or teacher
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (roleError || !roleData?.role) {
        router.replace("/login");
        return;
      }

      // Admins can access everything, teachers need active membership
      if (roleData.role === "teacher") {
        const { data: membership, error: membershipError } = await supabase
          .from("memberships")
          .select("active")
          .eq("id", user.id)
          .single();

        if (membershipError || !membership?.active) {
          router.replace("/membership"); // if no active membership, sends the user to membership page
          return;
        }
      }

      // if all checks are passed, it shows the main app
      setCheckingAccess(false);
    };

    checkUserAccess();
  }, [router]);

  if (checkingAccess) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <ActivityIndicator size="large" color="#22d3ee" />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#22d3ee",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: {
          backgroundColor: "#0a0a0a",
          borderTopColor: "#262626",
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarLabel: "Explore",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarLabel: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarLabel: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
