import { FontAwesome, FontAwesome5, FontAwesome6 } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Modal, Text, TextInput, TouchableOpacity, View } from "react-native";
import Toast from "react-native-toast-message";
import LogoHeader from "../components/logoHeader";
import ScreenWrapper from "../components/ScreenWrapper";
import { useAppTheme } from "../hooks/useAppTheme";
import { supabase } from "../supabase";
import { logEvent } from "../utils/logging";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [showDisabledModal, setShowDisabledModal] = useState(false);
  const [disabledReason, setDisabledReason] = useState("");
  const router = useRouter();
  const { bgCard, bgInput, borderInput, textPrimary, placeholderColor } =
    useAppTheme();

  const isValidEmail = (emailStr) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);

  const showToast = (type, title, message) => {
    Toast.show({ type, text1: title, text2: message });
  };

  const handleLogin = async () => {
    if (!email || !password) {
      showToast("error", "Missing Info", "Please enter email and password");
      return;
    }
    if (!isValidEmail(email)) {
      showToast("error", "Invalid Email", "Please enter a valid email");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      setLoading(false);
      logEvent({
        event_type: "LOGIN_FAILED",
        details: { email, error: error?.message },
      });
      showToast(
        "error",
        "Login Failed",
        error?.message || "Login failed. Please try again."
      );
      return;
    }

    // Check if MFA is required
    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (aalData.nextLevel === "aal2" && aalData.nextLevel !== aalData.currentLevel) {
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const totpFactor = factorsData?.totp?.[0];

      if (totpFactor) {
        const { data: challengeData, error: challengeError } =
          await supabase.auth.mfa.challenge({ factorId: totpFactor.id });

        if (challengeError) {
          setLoading(false);
          showToast("error", "MFA Error", challengeError.message);
          return;
        }

        setLoading(false);
        router.replace({
          pathname: "/mfa-challenge",
          params: { factorId: totpFactor.id, challengeId: challengeData.id },
        });
        return;
      }
    }

    // No MFA required — continue normal login flow
    const userId = data.user.id;

    logEvent({
      event_type: "LOGIN_SUCCESS",
      user_id: userId,
      details: { email },
    });

    const { data: admin } = await supabase
      .from("admins")
      .select("id")
      .eq("id", userId)
      .single();

    if (admin) {
      setLoading(false);
      showToast("success", "Admin Access", "Welcome, Admin!");
      setTimeout(() => router.replace("/admin"), 1500);
      return;
    }

    const { data: teacher, error: teacherError } = await supabase
      .from("teachers")
      .select("verified, is_disabled, disabled_reason")
      .eq("id", userId)
      .single();

    if (teacherError || !teacher) {
      setLoading(false);
      await supabase.auth.signOut();
      showToast(
        "error",
        "Profile Error",
        "Could not load profile. Please contact admin."
      );
      return;
    }

    //Check if account is disabled
    if (teacher.is_disabled) {
      setLoading(false);
      setDisabledReason(teacher.disabled_reason || "Your account has been disabled.");
      setShowDisabledModal(true);
      
      logEvent({
        event_type: "LOGIN_BLOCKED_DISABLED",
        user_id: userId,
        details: { reason: teacher.disabled_reason },
      });
      
      return;
    }

    if (!teacher.verified) {
      setLoading(false);
      showToast("info", "Pending Approval", "Redirecting to pending page...");
      setTimeout(() => router.replace("/pending"), 1000);
      return;
    }

    const { data: membership } = await supabase
      .from("memberships")
      .select("active")
      .eq("id", userId)
      .single();

    setLoading(false);
    showToast("success", "Login Successful", "Welcome back!");

    setTimeout(() => {
      if (!membership || !membership.active) {
        router.replace("/membership");
      } else {
        router.replace("/(tabs)");
      }
    }, 1500);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google" });
    if (error) {
      showToast("error", "Google Sign-In Failed", error.message || "Could not sign in with Google");
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider: "apple" });
    if (error) {
      showToast("error", "Apple Sign-In Failed", error.message || "Could not sign in with Apple");
      setLoading(false);
    }
  };

  const handleXSignIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider: "X" });
    if (error) {
      showToast("error", "X Sign-In Failed", error.message || "Could not sign in with X");
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail) {
      showToast("error", "Missing Email", "Please enter your email");
      return;
    }
    if (!isValidEmail(forgotEmail)) {
      showToast("error", "Invalid Email", "Please enter a valid email");
      return;
    }
    setForgotLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail);
    setForgotLoading(false);
    if (error) {
      showToast("error", "Error", error.message || "Failed to send reset email");
    } else {
      showToast("success", "Email Sent", "Check your inbox for reset instructions");
      setShowForgotModal(false);
      setForgotEmail("");
    }
  };

  return (
    <ScreenWrapper>
      <LogoHeader position="left" 
      showNotificationIcon={false} 
      showSignOutIcon={false}
      />

      <View className="flex-1 justify-center items-center">
        <View className={`w-full max-w-md ${bgCard} p-6 rounded-xl shadow-lg`}>
          <Text className="text-3xl font-bold text-center mb-6 text-cyan-400 tracking-wide">
            Login
          </Text>

          <TextInput
            className={`${bgInput} border ${borderInput} ${textPrimary} p-4 mb-4 rounded-xl`}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
            placeholderTextColor={placeholderColor}
          />

          <TextInput
            className={`${bgInput} border ${borderInput} ${textPrimary} p-4 mb-4 rounded-xl`}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
            placeholderTextColor={placeholderColor}
          />

          <TouchableOpacity
            onPress={() => setShowForgotModal(true)}
            disabled={loading}
          >
            <Text className="text-cyan-400 text-sm underline mb-2 text-right">
              Forgot Password?
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`bg-cyan-600 p-4 rounded-xl mb-4 active:scale-95 ${loading ? "opacity-50" : ""}`}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text className="text-white text-center font-semibold tracking-wide">
              {loading ? "Logging in..." : "Login"}
            </Text>
          </TouchableOpacity>

          {/* Divider Text */}
          <Text className="text-center text-gray-500 text-sm mb-6">
            or continue with
          </Text>

            {/* Google Sign In */}
          <TouchableOpacity
            className={`bg-cyan-200 border-gray-300 p-3 rounded-xl mb-3 flex-row items-center justify-center gap-3 active:bg-gray-50 ${loading ? "opacity-50" : ""}`}
            onPress={handleGoogleSignIn}
            disabled={loading}
          >
            <FontAwesome name="google" size={20} color="#4285F4" />
            <Text className="text-gray-800 font-semibold text-center flex-1">
              Sign in with Google
            </Text>
          </TouchableOpacity>

            {/* Apple Sign In */}
          <TouchableOpacity
            className={`bg-cyan-200 border-gray-300 p-3 rounded-xl mb-3 flex-row items-center justify-center gap-3 active:bg-gray-50 ${loading ? "opacity-50" : ""}`}
            onPress={handleAppleSignIn}
            disabled={loading}
          >
            <FontAwesome5 name="apple" size={20} color="#000000" />
            <Text className="text-gray-800 font-semibold text-center flex-1">
              Sign in with Apple
            </Text>
          </TouchableOpacity>

          {/* X (Twitter) Sign In */}
          <TouchableOpacity
            className={`bg-cyan-200 border-gray-300 p-3 rounded-xl mb-6 flex-row items-center justify-center gap-3 active:bg-gray-50 ${loading ? "opacity-50" : ""}`}
            onPress={handleXSignIn}
            disabled={loading}
          >
            <FontAwesome6 name="x-twitter" size={20} color="#000000" />
            <Text className="text-gray-800 font-semibold text-center flex-1">
              Sign in with X (Twitter)
            </Text>
          </TouchableOpacity>

          <Link href="/signup" asChild> 
            <TouchableOpacity className="p-3" disabled={loading}>
              <Text className="text-center text-cyan-400 underline">
                Don`t have an account? Sign up
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>

      {/* Forgot Password Modal */}
      <Modal
        visible={showForgotModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowForgotModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/40">
          <View className={`w-full max-w-md ${bgCard} p-6 rounded-xl shadow-lg`}>
            <Text className="text-xl font-bold text-center mb-4 text-cyan-400">
              Reset Password
            </Text>
            <TextInput
              className={`${bgInput} border ${borderInput} ${textPrimary} p-4 mb-4 rounded-xl`}
              placeholder="Enter your email"
              value={forgotEmail}
              onChangeText={setForgotEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!forgotLoading}
              placeholderTextColor={placeholderColor}
            />
            <TouchableOpacity
              className={`bg-cyan-600 p-4 rounded-xl mb-3 ${forgotLoading ? "opacity-50" : ""}`}
              onPress={handleForgotPassword}
              disabled={forgotLoading}
            >
              <Text className="text-white text-center font-semibold">
                {forgotLoading ? "Sending..." : "Send Reset Email"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`${bgInput} p-4 rounded-xl border ${borderInput}`}
              onPress={() => setShowForgotModal(false)}
              disabled={forgotLoading}
            >
              <Text className="text-center text-cyan-400 font-semibold">
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Account Disabled Modal */}
      <Modal
        visible={showDisabledModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDisabledModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/60">
          <View className={`w-full max-w-md ${bgCard} p-6 rounded-2xl shadow-lg`}>
            <View className="items-center mb-4">
              <View className="bg-red-500/20 p-4 rounded-full mb-3">
                <Text className="text-4xl">🔒</Text>
              </View>
              <Text className="text-2xl font-bold text-center text-red-500">
                Account Disabled
              </Text>
            </View>

            <Text className={`text-center ${textPrimary} mb-4 text-base leading-6`}>
              {disabledReason}
            </Text>

            <Text className="text-center text-cyan-400 text-sm mb-6">
              If you believe this is a mistake, please contact us.
            </Text>

            <TouchableOpacity
              className="bg-cyan-600 p-4 rounded-xl mb-3 active:scale-95"
              onPress={() => {
                setShowDisabledModal(false);
                router.push({
                  pathname: "/contact",
                  params: { 
                    subject: "Account Reactivation Request",
                    from: "disabled-account" 
                  }
                });
              }}
            >
              <Text className="text-white text-center font-semibold">
                Contact Admin
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`${bgInput} p-4 rounded-xl border ${borderInput}`}
              onPress={() => {
                setShowDisabledModal(false);
                supabase.auth.signOut();
              }}
            >
              <Text className="text-center text-cyan-400 font-semibold">
                OK
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Toast />
    </ScreenWrapper>
  );
}