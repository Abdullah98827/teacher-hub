import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Tabs } from "expo-router/tabs";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import "../../global.css";
import { useAppTheme } from "../../hooks/useAppTheme";
import { supabase } from "../../supabase";

export default function TabLayout() {
  const router = useRouter();
  const [checkingAccess, setCheckingAccess] = useState(true);
  const { tabBarBg, tabBarBorder, tabBarActive, tabBarInactive, loadingBg } =
    useAppTheme();

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
      <View className={`flex-1 items-center justify-center ${loadingBg}`}>
        <ActivityIndicator size="large" color="#22d3ee" />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tabBarActive,
        tabBarInactiveTintColor: tabBarInactive,
        tabBarStyle: {
          backgroundColor: tabBarBg,
          borderTopColor: tabBarBorder,
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
          title: "Dashboard",
          tabBarLabel: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
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
      <Tabs.Screen name="suggested-users" options={{ href: null }} />
      <Tabs.Screen name="upload-resource" options={{ href: null }} />
      <Tabs.Screen name="followers/[id]" options={{ href: null }} />
      <Tabs.Screen name="following/[id]" options={{ href: null }} />
    </Tabs>
  );
}
