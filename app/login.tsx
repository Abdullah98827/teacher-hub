import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import Toast from "react-native-toast-message";
import LogoHeader from "../components/logoHeader";
import ScreenWrapper from "../components/ScreenWrapper";
import { supabase } from "../supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const isValidEmail = (emailStr: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);

  const showToast = (
    type: "success" | "error" | "info",
    title: string,
    message: string
  ) => {
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
      showToast(
        "error",
        "Login Failed",
        error?.message || "Login failed. Please try again."
      );
      return;
    }

    const userId = data.user.id;

    // ✅ Step 1: Check if user is an admin
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

    // ✅ Step 2: Check if teacher is verified
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

    if (!teacher.verified) {
      setLoading(false);
      showToast("info", "Pending Approval", "Redirecting to status page...");
      setTimeout(() => router.replace("/pending"), 1000);
      return;
    }

    // ✅ Step 3: Check membership status
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

  return (
    <ScreenWrapper>
      <LogoHeader position="left" />

      <View className="flex-1 justify-center items-center">
        <View className="w-full max-w-md bg-neutral-900 p-6 rounded-xl shadow-lg">
          <Text className="text-3xl font-bold text-center mb-6 text-cyan-400 tracking-wide">
            Login
          </Text>

          <TextInput
            className="bg-neutral-800 border border-neutral-700 text-gray-100 p-4 mb-4 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500"
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
            placeholderTextColor="#9CA3AF"
          />

          <TextInput
            className="bg-neutral-800 border border-neutral-700 text-gray-100 p-4 mb-4 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500"
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
            placeholderTextColor="#9CA3AF"
          />

          <TouchableOpacity
            className={`bg-cyan-600 hover:bg-cyan-700 p-4 rounded-xl mb-4 shadow-md active:scale-95 transition ${loading ? "opacity-50" : ""}`}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text className="text-white text-center font-semibold tracking-wide">
              {loading ? "Logging in..." : "Login"}
            </Text>
          </TouchableOpacity>

          <Link href="/signup" asChild>
            <TouchableOpacity className="p-3" disabled={loading}>
              <Text className="text-center text-cyan-400 underline">
                Don’t have an account? Sign up
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>

      <Toast />
    </ScreenWrapper>
  );
}
