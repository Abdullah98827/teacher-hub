import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, Animated, Text, TouchableOpacity, View } from "react-native";
import { useUserRole } from "../app/hooks/useUserRole";
import { supabase } from "../supabase";

export default function LogoHeader({
  position = "left",
}: {
  position?: "left" | "right";
}) {
  const router = useRouter();
  const { role } = useUserRole();
  const [isVerified, setIsVerified] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    checkVerification();
  }, []);

  const checkVerification = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("teachers")
      .select("verified")
      .eq("id", user.id)
      .single();

    if (data) {
      setIsVerified(data.verified);
    }
  };

  const handleLogoClick = () => {
    if (role === "admin") {
      router.push("/admin");
    } else if (role === "teacher" && isVerified) {
      router.push("/(tabs)");
    }
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/login");
        },
      },
    ]);
  };

  const iconName = role === "admin" ? "shield-check" : "school-outline";
  const iconColor = role === "admin" ? "#ef4444" : "#a855f7";
  const isClickable = role === "admin" || (role === "teacher" && isVerified);

  return (
    <View className="w-full px-5 py-4 flex-row items-center justify-between">
      {/* Logo */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <TouchableOpacity
          activeOpacity={isClickable ? 0.8 : 1}
          onPress={handleLogoClick}
          disabled={!isClickable}
          className="px-2 py-1 flex-row items-center gap-2"
        >
          <MaterialCommunityIcons name={iconName} size={24} color={iconColor} />
          {role === "admin" ? (
            <Text className="text-2xl font-bold text-red-500 tracking-wide">
              Admin Hub
            </Text>
          ) : (
            <Text className="text-2xl font-bold text-white tracking-wide">
              Teacher
              <Text className="text-purple-400">-Hub</Text>
            </Text>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Sign Out Button */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <TouchableOpacity
          onPress={handleSignOut}
          className="w-10 h-10 rounded-full bg-red-500/20 items-center justify-center"
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={22} color="#ef4444" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}
