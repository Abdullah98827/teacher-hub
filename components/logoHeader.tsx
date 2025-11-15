import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";
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
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    checkVerification();
  }, []);

  // Check if teacher is verified by admin
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
    // Admins go to admin hub
    if (role === "admin") {
      router.push("/admin");
    }
    // Verified teachers go to main app
    else if (role === "teacher" && isVerified) {
      router.push("/(tabs)");
    }
    // For unverified teachers logo does nothing
  };

  const iconName = role === "admin" ? "shield-check" : "school-outline";
  const iconColor = role === "admin" ? "#ef4444" : "#a855f7";
  const isClickable = role === "admin" || (role === "teacher" && isVerified);

  return (
    <View
      className={`w-full px-5 py-4 ${
        position === "right" ? "items-end" : "items-start"
      }`}
    >
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
    </View>
  );
}
