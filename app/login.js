import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Modal, Text, TextInput, TouchableOpacity, View } from "react-native";
import Toast from "react-native-toast-message";
import LogoHeader from "../components/logoHeader";
import ScreenWrapper from "../components/ScreenWrapper";
import { useAppTheme } from "../hooks/useAppTheme";
import { supabase } from "../supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const router = useRouter();
  const { bgCard, bgInput, borderInput, textPrimary, placeholderColor } =
    useAppTheme();

  // Basic email validation using regex pattern
  const isValidEmail = (emailStr) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);

  const showToast = (type, title, message) => {
    Toast.show({ type, text1: title, text2: message });
  };

  const handleLogin = async () => {
    // Basic validation
    if (!email || !password) {
      showToast("error", "Missing Info", "Please enter email and password");
      return;
    }
    if (!isValidEmail(email)) {
      showToast("error", "Invalid Email", "Please enter a valid email");
      return;
    }

    setLoading(true);

    // Step 1: Signs in with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      setLoading(false);
      showToast(
        "error",
        "Login Failed",
        error?.message || "Login failed. Please try again."
      );
      return;
    }

    const userId = data.user.id;

    // Step 2: Checks if the user is an admin (admins skip verification checks)
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

    // Step 3: Checks if the teacher profile exists and is verified
    const { data: teacher, error: teacherError } = await supabase
      .from("teachers")
      .select("verified")
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

    // If not verified yet, sends the user to pending page
    if (!teacher.verified) {
      setLoading(false);
      showToast("info", "Pending Approval", "Redirecting to pending page...");
      setTimeout(() => router.replace("/pending"), 1000);
      return;
    }

    // Step 4: Checks if they have an active membership
    const { data: membership } = await supabase
      .from("memberships")
      .select("active")
      .eq("id", userId)
      .single();

    setLoading(false);
    showToast("success", "Login Successful", "Welcome back!");

    // Sends the user to membership page if inactive, otherwise to the main app
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
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) {
      showToast('error', 'Google Sign-In Failed', error.message || 'Could not sign in with Google');
      setLoading(false);
    }
    // On success, Supabase will handle the redirect/session
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
      <LogoHeader position="left" />

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
            <Text className="text-cyan-400 text-sm underline mb-2 text-right">Forgot Password?</Text>
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

          <TouchableOpacity
            className="bg-white border border-cyan-400 p-4 rounded-xl mb-4 flex-row items-center justify-center"
            onPress={handleGoogleSignIn}
            disabled={loading}
          >
            <Text className="text-cyan-600 text-center font-semibold">Sign in with Google</Text>
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
            <Text className="text-xl font-bold text-center mb-4 text-cyan-400">Reset Password</Text>
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
              <Text className="text-center text-cyan-400 font-semibold">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Toast />
    </ScreenWrapper>
  );
}
