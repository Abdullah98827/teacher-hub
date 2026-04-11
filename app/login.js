import { FontAwesome, FontAwesome5 } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import * as WebBrowser from 'expo-web-browser';
import { useState } from "react";
import { Modal, Platform, Text, TextInput, TouchableOpacity, View } from "react-native";
import Toast from "react-native-toast-message";
import LogoHeader from "../components/logoHeader";
import ScreenWrapper from "../components/ScreenWrapper";
import { useAppTheme } from "../hooks/useAppTheme";
import { supabase } from "../supabase";
import { logEvent } from "../utils/logging";

WebBrowser.maybeCompleteAuthSession();

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

  // Shared post-auth routing logic
  const handlePostAuthRouting = async (userId) => {
    const { data: admin } = await supabase
      .from("admins")
      .select("id")
      .eq("id", userId)
      .single();

    if (admin) {
      showToast("success", "Admin Access", "Welcome, Admin!");
      setTimeout(() => router.replace("/admin"), 1500);
      return;
    }

    const { data: teacher, error: teacherError } = await supabase
      .from("teachers")
      .select("verified, is_disabled, disabled_reason")
      .eq("id", userId)
      .single();

    // New OAuth user — no teacher profile yet, send to signup
    if (teacherError || !teacher) {
      router.replace("/signup");
      return;
    }

    if (teacher.is_disabled) {
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
      showToast("info", "Pending Approval", "Redirecting to pending page...");
      setTimeout(() => router.replace("/pending"), 1000);
      return;
    }

    const { data: membership } = await supabase
      .from("memberships")
      .select("active")
      .eq("id", userId)
      .single();

    showToast("success", "Login Successful", "Welcome back!");
    setTimeout(() => {
      router.replace(membership?.active ? "/(tabs)" : "/membership");
    }, 1500);
  };

  // Generic OAuth handler — works for any provider
  const handleOAuthSignIn = async (provider) => {
    setLoading(true);
    try {
      const redirectTo = Platform.OS === 'web'
        ? `${window.location.origin}/auth/callback`
        : 'teacherhub://auth/callback';

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: Platform.OS !== 'web',
          ...(provider === 'google' && {
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          }),
        },
      });

      if (error) throw error;

      // Web handles redirect automatically
      if (Platform.OS === 'web') return;

      // Native: open browser session
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        'teacherhub://auth/callback'
      );

      if (result.type === 'success') {
        const url = result.url;
        const fragmentParams = new URLSearchParams(url.split('#')[1] || '');
        const queryParams = new URLSearchParams(url.split('?')[1] || '');

        const accessToken =
          fragmentParams.get('access_token') || queryParams.get('access_token');
        const refreshToken =
          fragmentParams.get('refresh_token') || queryParams.get('refresh_token');

        if (accessToken) {
          const { data: sessionData, error: sessionError } =
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

          if (sessionError) throw sessionError;

          logEvent({
            event_type: `LOGIN_SUCCESS_${provider.toUpperCase()}`,
            user_id: sessionData.user.id,
          });

          await handlePostAuthRouting(sessionData.user.id);
        } else {
          showToast('error', 'Sign-In Failed', 'Could not retrieve session. Please try again.');
        }
      }
    } catch (error) {
      const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
      showToast('error', `${providerName} Sign-In Failed`, error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
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

    const userId = data.user.id;
    logEvent({
      event_type: "LOGIN_SUCCESS",
      user_id: userId,
      details: { email },
    });

    await handlePostAuthRouting(userId);
    setLoading(false);
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

          <Text className="text-center text-gray-500 text-sm mb-4">
            or continue with
          </Text>

          {/* Google */}
          <TouchableOpacity
            className={`bg-white border border-gray-200 p-3 rounded-xl mb-3 flex-row items-center justify-center gap-3 active:bg-gray-50 ${loading ? "opacity-50" : ""}`}
            onPress={() => handleOAuthSignIn('google')}
            disabled={loading}
          >
            <FontAwesome name="google" size={20} color="#4285F4" />
            <Text className="text-gray-800 font-semibold text-center flex-1">
              Continue with Google
            </Text>
          </TouchableOpacity>

          {/* Discord */}
          <TouchableOpacity
            className={`bg-indigo-600 p-3 rounded-xl mb-3 flex-row items-center justify-center gap-3 active:bg-indigo-700 ${loading ? "opacity-50" : ""}`}
            onPress={() => handleOAuthSignIn('discord')}
            disabled={loading}
          >
            <FontAwesome5 name="discord" size={20} color="#ffffff" />
            <Text className="text-white font-semibold text-center flex-1">
              Continue with Discord
            </Text>
          </TouchableOpacity>

          {/* GitHub */}
          <TouchableOpacity
            className={`bg-gray-900 p-3 rounded-xl mb-3 flex-row items-center justify-center gap-3 active:bg-gray-800 ${loading ? "opacity-50" : ""}`}
            onPress={() => handleOAuthSignIn('github')}
            disabled={loading}
          >
            <FontAwesome name="github" size={20} color="#ffffff" />
            <Text className="text-white font-semibold text-center flex-1">
              Continue with GitHub
            </Text>
          </TouchableOpacity>

          {/* Apple — iOS only */}
          {/* {Platform.OS === 'ios' && (
            <TouchableOpacity
              className={`bg-black p-3 rounded-xl mb-3 flex-row items-center justify-center gap-3 ${loading ? "opacity-50" : ""}`}
              onPress={() => showToast('info', 'Coming Soon', 'Apple Sign-In is not available yet')}
              disabled={loading}
            >
              <FontAwesome5 name="apple" size={20} color="#ffffff" />
              <Text className="text-white font-semibold text-center flex-1">
                Continue with Apple
              </Text>
            </TouchableOpacity>
          )} */}

          <Link href="/signup" asChild>
            <TouchableOpacity className="p-3 mt-2" disabled={loading}>
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