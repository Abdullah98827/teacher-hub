import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Toast from "react-native-toast-message";
import ScreenWrapper from "../components/ScreenWrapper";
import LogoHeader from "../components/logoHeader";
import { useAppTheme } from "../hooks/useAppTheme";
import { supabase } from "../supabase";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { bgCard, textPrimary } = useAppTheme();
  const [sending, setSending] = useState(false);

  const handleResend = async () => {
    setSending(true);
    const user = supabase.auth.getUser ? (await supabase.auth.getUser()).data.user : null;
    if (!user) {
      Toast.show({ type: "error", text1: "Not logged in", text2: "Please log in first." });
      setSending(false);
      return;
    }
    const { error } = await supabase.auth.resend({ type: "signup", email: user.email });
    setSending(false);
    if (error) {
      Toast.show({ type: "error", text1: "Error", text2: error.message });
    } else {
      Toast.show({ type: "success", text1: "Sent", text2: "Verification email sent!" });
    }
  };

  return (
    <ScreenWrapper>
      <LogoHeader position="left" />
      <View className="flex-1 justify-center items-center">
        <View className={`w-full max-w-md ${bgCard} p-8 rounded-2xl shadow-2xl items-center`}>
          <Text className="text-3xl font-extrabold text-center mb-2 text-cyan-500 tracking-wide">
            Email Verification Required
          </Text>
          <Text className="text-base text-center mb-6 text-gray-500 dark:text-gray-300 max-w-xs">
            We’ve sent a verification link to your email address. Please check your inbox and click the link to activate your account.
          </Text>
          <TouchableOpacity
            className={`flex-row items-center justify-center bg-cyan-600 p-4 rounded-xl mb-4 w-full max-w-xs ${sending ? "opacity-50" : ""}`}
            onPress={handleResend}
            disabled={sending}
            activeOpacity={0.85}
          >
            <Text className="text-white text-center font-semibold text-base">
              {sending ? "Sending..." : "Resend Verification Email"}
            </Text>
          </TouchableOpacity>
          <Text className="text-xs text-center text-gray-400 max-w-xs">
            Didn’t receive the email? Check your spam folder or resend the verification email above.
          </Text>
        </View>
      </View>
      <Toast />
    </ScreenWrapper>
  );
}
