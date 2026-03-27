import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import LogoHeader from "../components/logoHeader";
import ScreenWrapper from "../components/ScreenWrapper";
import { useAppTheme } from "../hooks/useAppTheme";
import { supabase } from "../supabase";

export default function PendingApproval() {
  const router = useRouter();
  const { bgCard, textSecondary, textPrimary } = useAppTheme();
  const isDark = bgCard === "bg-gray-900" || bgCard === "dark:bg-gray-900";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <ScreenWrapper>
      <LogoHeader position="left" />
      <View className={`flex-1 items-center justify-center px-6 ${isDark ? "bg-gray-900" : "bg-white"}`}>
        <Text className={`text-3xl font-extrabold mb-6 tracking-wide text-center ${isDark ? "text-cyan-400" : "text-cyan-500"}`}>
          Account Pending Approval
        </Text>
        <Text className={`${textSecondary} text-center text-base leading-relaxed`}>
          Your account has been submitted successfully and is awaiting
          verification by an admin. Once approved, you&apos;ll be able to choose your
          membership and access Teacher Hub resources.
        </Text>
        <Text className={`${textSecondary} text-sm mt-6 text-center mb-8`}>
          Approval usually takes 24–48 hours. You&apos;ll receive an email once your
          account is verified.
        </Text>
        <View className="flex-row justify-between w-full max-w-md gap-4">
          <TouchableOpacity
            className={`flex-1 p-4 rounded-2xl active:scale-95 ${isDark ? "bg-cyan-950" : "bg-cyan-600"}`}
            onPress={() => router.push("/contact")}
            activeOpacity={0.85}
          >
            <Text className={`text-center font-semibold text-base ${isDark ? "text-cyan-200" : "text-white"}`}>Contact Admin</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 p-4 rounded-2xl active:scale-95 ${isDark ? "bg-red-800" : "bg-red-600"}`}
            onPress={handleLogout}
            activeOpacity={0.85}
          >
            <Text className="text-center text-white font-semibold text-base">Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenWrapper>
  );
}
