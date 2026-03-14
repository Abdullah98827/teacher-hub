import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { AuthProvider } from "../contexts/AuthContext";
import { DyslexiaProvider } from '../contexts/DyslexiaContext';
import { ThemeProvider } from "../contexts/ThemeContext";
import { supabase } from "../supabase";

export default function RootLayout() {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      // Safety timeout: goes to login after 5 seconds if check takes too long
      const timeoutId = setTimeout(() => {
        setIsLoading(false);
        router.replace("/login");
      }, 5000);

      // Checks if user has an active session
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      clearTimeout(timeoutId);
      setIsLoading(false);

      if (error || !session) {
        router.replace("/login"); // If no session or error, goes to login
      } else {
        router.replace("/(tabs)"); // Has session, goes to main app
      }
    };

    checkSession();

    // Listen for auth changes (like logout) and redirect immediately
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session) {
          router.replace("/login");
        }
      }
    );

    // Cleanup subscription when component unmounts
    return () => {
      subscription?.subscription.unsubscribe();
    };
  }, [router]);

  return (
    <ThemeProvider>
      <AuthProvider>
        <DyslexiaProvider>
          {/* wraps everything inside AuthProvider */}
          <SafeAreaProvider>
            <Stack
              screenOptions={{ headerShown: false }}
              initialRouteName="login"
            >
              <Stack.Screen name="login" />
              <Stack.Screen name="signup" />
              <Stack.Screen name="auth-callback" />
              <Stack.Screen name="logout" />
              <Stack.Screen name="index" />
              <Stack.Screen name="pending" />
              <Stack.Screen name="membership" />
              <Stack.Screen name="checkout" />
              <Stack.Screen name="contact" />
              <Stack.Screen name="edit-profile" />
              <Stack.Screen name="change-password" />
              <Stack.Screen name="direct-messages" />
              <Stack.Screen name="dm/[id]" />
              <Stack.Screen name="group-chat/[id]" />
              <Stack.Screen name="admin" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack>

            {/* Loading overlay shown while checking session */}
            {isLoading && (
              <View className="absolute inset-0 justify-center items-center bg-gray-100 dark:bg-black z-50">
                <ActivityIndicator size="large" color="#007AFF" />
                <Text className="mt-4 text-lg text-gray-600 dark:text-gray-300">
                  Loading app...
                </Text>
              </View>
            )}

            {/* Global toast renderer — must be last so it renders on top */}
            <Toast />
          </SafeAreaProvider>
        </DyslexiaProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
