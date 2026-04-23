import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Text, View } from "react-native";
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
      // Safety timeout: goes to index after 5 seconds if check takes too long
      const timeoutId = setTimeout(() => {
        setIsLoading(false);
        router.replace("/");
      }, 5000);

      // Check if user has an active session
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      clearTimeout(timeoutId);
      setIsLoading(false);

      if (error || !session) {
        router.replace("/");
        return;
      }

      // Check MFA assurance level before routing to app
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (aalData?.nextLevel === 'aal2' && aalData?.currentLevel !== 'aal2') {
        // Session exists but MFA not yet verified — re-challenge
        const { data: factorsData } = await supabase.auth.mfa.listFactors();
        const totpFactor = factorsData?.totp?.[0];

        if (totpFactor) {
          const { data: challenge } = await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
          router.replace({
            pathname: '/mfa-challenge',
            params: { factorId: totpFactor.id, challengeId: challenge.id }
          });
          return;
        }
      }

      router.replace("/(tabs)");
    };

    checkSession();

    // Listen for auth changes (like logout) and redirect immediately
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session) {
          router.replace("/");
        }
      }
    );

    // Handle deep links (teacherhub://resource/{id})
    const handleDeepLink = async ({ url }) => {
      if (url && url.includes("teacherhub://resource/")) {
        const resourceId = url.split("teacherhub://resource/")[1];
        if (resourceId) {
          router.push(`/(tabs)/resources?openResourceId=${resourceId}`);
        }
      }
    };

    const linkingSubscription = Linking.addEventListener("url", handleDeepLink);

    // Also check if app was opened from a link
    const checkInitialUrl = async () => {
      const url = await Linking.getInitialURL();
      if (url && url.includes("teacherhub://resource/")) {
        const resourceId = url.split("teacherhub://resource/")[1];
        if (resourceId) {
          setTimeout(() => {
            router.push(`/(tabs)/resources?openResourceId=${resourceId}`);
          }, 1000);
        }
      }
    };

    checkInitialUrl();

    // Cleanup subscription when component unmounts
    return () => {
      subscription?.subscription.unsubscribe();
      linkingSubscription?.remove();
    };
  }, [router]);

  return (
    <ThemeProvider>
      <AuthProvider>
        <DyslexiaProvider>
          <SafeAreaProvider>
            <Stack
              screenOptions={{ headerShown: false }}
              initialRouteName="index"
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="login" />
              <Stack.Screen name="signup" />
              <Stack.Screen name="auth-callback" />
              <Stack.Screen name="mfa-challenge" />
              <Stack.Screen name="logout" />
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