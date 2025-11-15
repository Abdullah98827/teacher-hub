import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Image, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../supabase";

export default function Index() {
  const [isChecking, setIsChecking] = useState(true);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    // Safety timeout: redirect after 3 seconds if session check takes too long
    const timeoutId = setTimeout(() => {
      setIsChecking(false);
      router.replace("/login");
    }, 3000);

    // Check if user is already logged in
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        clearTimeout(timeoutId);
        setIsChecking(false);
        if (session) {
          router.replace("/(tabs)"); // Has session, goes to main app
        } else {
          router.replace("/login"); // No session, shows login page
        }
      })
      .catch(() => {
        clearTimeout(timeoutId);
        setIsChecking(false);
        router.replace("/login");
      });

    // Listen for logout events and redirect immediately
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session) {
          router.replace("/login");
        }
      }
    );

    // Cleanup
    return () => {
      clearTimeout(timeoutId);
      subscription?.subscription.unsubscribe();
    };
  }, [router]);

  // Shows splash screen while checking session
  if (isChecking) {
    return (
      <View
        className="flex-1 justify-center items-center bg-neutral-950"
        style={{ paddingTop: insets.top }}
      >
        <Image
          source={require("../assets/images/splash.png")}
          style={{ width: 120, height: 120, marginBottom: 16 }}
        />
        <Text className="text-cyan-400 text-lg">Loading Teacher Hub...</Text>
      </View>
    );
  }

  return null;
}
