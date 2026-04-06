import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import Toast from "react-native-toast-message";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useUserRole } from "../../hooks/useUserRole";

export default function AdminLayout() {
  const { role, loading } = useUserRole();
  const router = useRouter();
  const { loadingBg, tabBarBg } = useAppTheme();

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
      <View className={`flex-1 justify-center items-center ${loadingBg}`}>
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
        headerStyle: { backgroundColor: tabBarBg },
        headerTintColor: "#22d3ee",
        headerTitleStyle: { fontWeight: "bold" },
        headerBackTitle: "Back",
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: "Admin Hub", headerShown: false }}
      />
      <Stack.Screen
        name="verify"
        options={{ title: "Verify Teachers", headerShown: false }}
      />
      <Stack.Screen
        name="manage-memberships"
        options={{ title: "Manage Memberships", headerShown: false }}
      />
      <Stack.Screen
        name="manage-contact-requests"
        options={{ title: "Manage Contact Requests", headerShown: false }}
      />
      <Stack.Screen
        name="manage-resources"
        options={{ title: "Manage Resources", headerShown: false }}
      />
      <Stack.Screen
        name="manage-reports"
        options={{ title: "Manage Reports", headerShown: false }}
      />
      <Stack.Screen
        name="manage-comments"
        options={{ title: "Manage Comments", headerShown: false }}
      />
      <Stack.Screen
        name="manage-subjects"
        options={{ title: "Manage Subjects", headerShown: false }}
      />
      <Stack.Screen
        name="logs"
        options={{ title: "View Application Logs", headerShown: false }}
      />
      <Stack.Screen
        name="manage-users"
        options={{ title: "Manage Users", headerShown: false }}
      />
    </Stack>
  );
}
