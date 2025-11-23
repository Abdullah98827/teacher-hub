// app/(tabs)/_layout.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Tabs } from "expo-router/tabs";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import "../../global.css";
import { supabase } from "../../supabase";

export default function TabLayout() {
  const router = useRouter();
  const [checkingAccess, setCheckingAccess] = useState(true);

  const checkUserAccess = useCallback(async () => {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      router.replace("/login");
      return;
    }

    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (roleError || !roleData?.role) {
      router.replace("/login");
      return;
    }

    if (roleData.role === "teacher") {
      const { data: membership, error: membershipError } = await supabase
        .from("memberships")
        .select("active")
        .eq("id", user.id)
        .single();

      if (membershipError || !membership?.active) {
        router.replace("/membership");
        return;
      }
    }

    setCheckingAccess(false);
  }, [router]);

  useEffect(() => {
    checkUserAccess();
  }, [checkUserAccess]);

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
      {/* Dashboard Tab */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarLabel: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />

      {/* Library Tab (Resources) */}
      <Tabs.Screen
        name="resources"
        options={{
          title: "Library",
          tabBarLabel: "Library",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="library" size={size} color={color} />
          ),
        }}
      />

      {/* Community Tab (Future Chat) */}
      <Tabs.Screen
        name="community"
        options={{
          title: "Community",
          tabBarLabel: "Community",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />

      {/* Settings Tab */}
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

      {/* Hide all other tabs */}
      <Tabs.Screen name="upload-resource" options={{ href: null }} />
    </Tabs>
  );
}
