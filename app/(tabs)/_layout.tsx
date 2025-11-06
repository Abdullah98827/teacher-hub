import { useRouter } from "expo-router";
import { Tabs } from "expo-router/tabs";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import "../../global.css";
import { supabase } from "../../supabase";

export default function TabLayout() {
  const router = useRouter();
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return router.replace("/login");

      const { data: adminMatch } = await supabase
        .from("admins")
        .select("id")
        .eq("id", user.id)
        .single();

      if (adminMatch) {
        setIsAdmin(true);
        setCheckingAccess(false);
        return;
      }

      const { data: membership } = await supabase
        .from("memberships")
        .select("active")
        .eq("id", user.id)
        .single();

      if (!membership?.active) {
        router.replace("/membership");
      } else {
        setCheckingAccess(false);
      }
    };

    checkAccess();
  }, [router]);

  if (checkingAccess) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <ActivityIndicator size="large" color="#22d3ee" />
      </View>
    );
  }

  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen
        name="index"
        options={{ title: "Home", tabBarLabel: "Home" }}
      />
      <Tabs.Screen
        name="explore"
        options={{ title: "Explore", tabBarLabel: "Explore" }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{ title: "Dashboard", tabBarLabel: "Dashboard" }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: "Admin Hub",
          tabBarLabel: "Admin",
          href: isAdmin ? "/(tabs)/admin" : null,
        }}
      />
    </Tabs>
  );
}
