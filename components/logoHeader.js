import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Modal, Text, TouchableOpacity, View } from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";
import { useUserRole } from "../hooks/useUserRole";
import { supabase } from "../supabase";
import ConfirmModal from "./ConfirmModal";
import NotificationBadge from "./NotificationBadge";
import NotificationCenter from "./NotificationCenter";

export default function LogoHeader({ 
  position = "left",
  showNotificationIcon = true,
  showSignOutIcon = true,
  onLogoPress = null, // ✅ optional override for logo press
}) {
  const router = useRouter();
  const { role } = useUserRole();
  const { isDark } = useAppTheme();
  const [isVerified, setIsVerified] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    checkVerification();
  }, [fadeAnim]);

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
    // ✅ If onLogoPress is provided (login/signup), use that instead
    if (onLogoPress) {
      onLogoPress();
      return;
    }
    // Default behaviour — navigate based on role
    if (role === "admin") {
      router.push("/admin");
    } else if (role === "teacher" && isVerified) {
      router.push("/(tabs)");
    }
  };

  const handleSignOut = async () => {
    setShowSignOutModal(true);
  };

  const confirmSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    setSigningOut(false);
    setShowSignOutModal(false);
    router.replace("/login");
  };

  // ✅ When onLogoPress is provided, logo is always clickable
  const isAdmin = role === "admin";
  const isClickable = onLogoPress !== null || isAdmin || (role === "teacher" && isVerified);

  const headerBg = isDark ? "#0a0f1a" : "#f0fafb";
  const accentLine = "#06b6d4";
  const borderColor = isDark ? "rgba(6,182,212,0.15)" : "rgba(6,182,212,0.25)";
  const iconColor = isDark ? "#22d3ee" : "#0891b2";

  return (
    <View
      style={{
        width: "100%",
        backgroundColor: headerBg,
        borderBottomWidth: 1,
        borderBottomColor: borderColor,
        paddingHorizontal: 20,
        paddingVertical: 14,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      {/* Accent line at top */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2.5,
          backgroundColor: accentLine,
          opacity: isDark ? 0.7 : 0.9,
        }}
      />

      {/* Logo */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <TouchableOpacity
          activeOpacity={isClickable ? 0.75 : 1}
          onPress={handleLogoClick}
          disabled={!isClickable}
          style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: isDark
                ? "rgba(6,182,212,0.15)"
                : "rgba(8,145,178,0.1)",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: isDark
                ? "rgba(6,182,212,0.3)"
                : "rgba(8,145,178,0.25)",
            }}
          >
            <MaterialCommunityIcons
              name={isAdmin ? "shield-check" : "school-outline"}
              size={20}
              color={iconColor}
            />
          </View>

          {/* Wordmark */}
          {isAdmin ? (
            <View style={{ flexDirection: "row", alignItems: "baseline" }}>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "800",
                  letterSpacing: 0.3,
                  color: isDark ? "#e2e8f0" : "#0f172a",
                }}
              >
                Admin
              </Text>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "800",
                  letterSpacing: 0.3,
                  color: isDark ? "#22d3ee" : "#0891b2",
                  marginLeft: 5,
                }}
              >
                Hub
              </Text>
            </View>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "baseline" }}>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "800",
                  letterSpacing: 0.3,
                  color: isDark ? "#e2e8f0" : "#0f172a",
                }}
              >
                Teacher
              </Text>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "800",
                  letterSpacing: 0.3,
                  color: isDark ? "#22d3ee" : "#0891b2",
                }}
              >
                -Hub
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Right side icons */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          {/* Sign Out Button */}
          {showSignOutIcon && (
            <TouchableOpacity
              onPress={handleSignOut}
              activeOpacity={0.7}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: isDark
                  ? "rgba(239,68,68,0.12)"
                  : "rgba(220,38,38,0.08)",
                borderWidth: 1,
                borderColor: isDark ? "rgba(239,68,68,0.3)" : "rgba(220,38,38,0.2)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name="log-out-outline"
                size={20}
                color={isDark ? "#f87171" : "#dc2626"}
              />
            </TouchableOpacity>
          )}

          {/* Notifications Button */}
          {showNotificationIcon && (
            <TouchableOpacity
              onPress={() => setShowNotifications(true)}
              activeOpacity={0.7}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: isDark
                  ? "rgba(6,182,212,0.12)"
                  : "rgba(8,145,178,0.08)",
                borderWidth: 1,
                borderColor: isDark
                  ? "rgba(6,182,212,0.3)"
                  : "rgba(8,145,178,0.2)",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              <Ionicons
                name="notifications-outline"
                size={20}
                color={isDark ? "#22d3ee" : "#0891b2"}
              />
              <NotificationBadge size="small" badgeColor="#FF6B6B" />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      <ConfirmModal
        visible={showSignOutModal}
        title="Sign Out"
        message="Are you sure you want to sign out?"
        confirmText="Sign Out"
        confirmColor="bg-red-600"
        isProcessing={signingOut}
        onConfirm={confirmSignOut}
        onCancel={() => setShowSignOutModal(false)}
      />

      {/* Notifications Modal */}
      <Modal
        visible={showNotifications}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNotifications(false)}
      >
        <NotificationCenter onClose={() => setShowNotifications(false)} />
      </Modal>
    </View>
  );
}