import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from "react-native";
import Toast from "react-native-toast-message";
import { useAppTheme } from "../hooks/useAppTheme";
import { verifyTotpOnLogin } from "../utils/mfa";

export default function MfaChallengeScreen() {
  const { factorId, challengeId } = useLocalSearchParams();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { bgCard, borderInput, bgInput, textPrimary, placeholderColor } = useAppTheme();

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

  return (
    <View className="flex-1 justify-center items-center">
      <View className={`w-full max-w-md ${bgCard} p-6 rounded-xl shadow-lg`}>
        <Text className="text-2xl font-bold text-center mb-6 text-cyan-400">Multi-Factor Authentication</Text>
        <Text className="mb-4 text-center">Enter the 6-digit code from your authenticator app.</Text>
        <TextInput
          className={`${bgInput} border ${borderInput} ${textPrimary} p-4 mb-4 rounded-xl text-center text-lg`}
          placeholder="123456"
          value={code}
          onChangeText={setCode}
          keyboardType="numeric"
          maxLength={6}
          editable={!loading}
          placeholderTextColor={placeholderColor}
        />
        <TouchableOpacity
          className={`bg-cyan-600 p-4 rounded-xl mb-2 ${loading ? "opacity-50" : ""}`}
          onPress={handleVerify}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-center font-semibold">Verify</Text>
          )}
        </TouchableOpacity>
      </View>
      <Toast />
    </View>
  );
}
