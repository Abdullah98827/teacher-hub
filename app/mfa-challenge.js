import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import ConfirmModal from "../components/ConfirmModal";
import LogoHeader from "../components/logoHeader";
import { useAppTheme } from "../hooks/useAppTheme";
import { supabase } from "../supabase";
import { verifyTotpOnLogin } from "../utils/mfa";

export default function MfaChallengeScreen() {
  const { factorId, challengeId } = useLocalSearchParams();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();
  const {
    bg,
    bgCard,
    border,
    borderInput,
    bgInput,
    textPrimary,
    textSecondary,
    placeholderColor,
  } = useAppTheme();

  const handleVerify = async () => {
    if (!code) {
      Toast.show({ type: "error", text1: "Missing Code", text2: "Please enter the code from your authenticator app." });
      return;
    }
    setLoading(true);
    try {
      await verifyTotpOnLogin(factorId, code, challengeId);
      Toast.show({ type: "success", text1: "MFA Verified!", text2: "Welcome back!" });
      setTimeout(() => router.replace("/(tabs)"), 1000);
    } catch (err) {
      Toast.show({ type: "error", text1: "Invalid Code", text2: err.message || "Please try again." });
    }
    setLoading(false);
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

  return (
    <SafeAreaView className={`flex-1 ${bg}`} edges={['top']}>
      <LogoHeader position="left" 
      showNotificationIcon={false} 
      showSignOutIcon={false}
  />

      <View className="flex-1 px-6 pt-10">

        {/* Icon + Title */}
        <View className="items-center mb-6">
          <View className="w-20 h-20 rounded-full bg-cyan-500/15 items-center justify-center mb-4">
            <View className="w-12 h-12 rounded-full bg-cyan-500/25 items-center justify-center">
              <Ionicons name="shield-checkmark-outline" size={28} color="#22d3ee" />
            </View>
          </View>
          <Text className="text-2xl font-bold text-cyan-400 text-center">
            Two-Factor Authentication
          </Text>
          <Text className={`${textSecondary} text-center mt-2 text-sm leading-5`}>
            Enter the 6-digit code from your{"\n"}authenticator app to continue.
          </Text>
        </View>

        {/* Card */}
        <View className={`${bgCard} rounded-2xl p-6 border ${border}`}>
          <Text className={`${textSecondary} text-xs font-semibold uppercase tracking-widest mb-2`}>
            Verification Code
          </Text>
          <TextInput
            className={`${bgInput} border ${borderInput} ${textPrimary} p-4 mb-4 rounded-xl text-center text-2xl font-bold tracking-widest`}
            placeholder="123456"
            value={code}
            onChangeText={setCode}
            keyboardType="numeric"
            maxLength={6}
            editable={!loading}
            placeholderTextColor={placeholderColor}
          />
          <TouchableOpacity
            className={`bg-cyan-600 p-4 rounded-xl ${loading ? "opacity-50" : ""}`}
            onPress={handleVerify}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View className="flex-row items-center justify-center gap-2">
                <Text className="text-white text-center font-bold text-base">
                  Verify & Continue
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Sign Out Button */}
          <TouchableOpacity
            className="bg-red-600/20 border border-red-600/40 p-4 rounded-xl mt-3"
            onPress={handleSignOut}
            disabled={loading || signingOut}
          >
            <Text className="text-red-600 text-center font-bold text-base">
              Sign Out
            </Text>
          </TouchableOpacity>
        </View>

        {/* Helper text */}
        <View className="flex-row items-center justify-center gap-2 mt-4">
          <Ionicons name="information-circle-outline" size={14} color="#6B7280" />
          <Text className={`${textSecondary} text-xs`}>
            Open your authenticator app to find the code for Teacher-Hub.
          </Text>
        </View>

      </View>

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

      <Toast />
    </SafeAreaView>
  );
}