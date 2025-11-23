import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import Toast from "react-native-toast-message";
import { useUserRole } from "../hooks/useUserRole";

export default function AdminLayout() {
  const { role, loading } = useUserRole();
  const router = useRouter();

  // Check if user is admin, redirects if not
  useEffect(() => {
    if (!loading && role !== "admin") {
      Toast.show({
        type: "error",
        text1: "Access Denied",
        text2: "You must be an admin to access this area",
      });
      router.replace("/(tabs)");
    }
  }, [role, loading, router]);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-black">
        <ActivityIndicator size="large" color="#22d3ee" />
      </View>
    );
  }

  if (role !== "admin") {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#0a0a0a" },
        headerTintColor: "#22d3ee",
        headerTitleStyle: { fontWeight: "bold" },
        headerBackTitle: "Back",
      }}
    >
      <Stack.Screen name="index" options={{ title: "Admin Hub" }} />
      <Stack.Screen name="verify" options={{ title: "Verify Teachers" }} />
      <Stack.Screen
        name="manage-memberships"
        options={{ title: "Manage Memberships" }}
      />
      <Stack.Screen
        name="manage-contact-requests"
        options={{ title: "Manage Contact Requests" }}
      />
      <Stack.Screen
        name="manage-resources"
        options={{ title: "Manage Resources" }}
      />
      <Stack.Screen
        name="manage-reports"
        options={{ title: "Manage Reports" }}
      />
      <Stack.Screen
        name="manage-comments"
        options={{ title: "Manage Comments" }}
      />
    </Stack>
  );
}
