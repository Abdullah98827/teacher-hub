import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { supabase } from "../supabase";
import { logEvent } from "../utils/logging";

export default function Logout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const showToast = (type, title, message) => {
    Toast.show({ type, text1: title, text2: message });
  };

  useEffect(() => {
    const logout = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      const { error } = await supabase.auth.signOut();

      if (error) {
        logEvent({
          event_type: "LOGOUT_FAILED",
          user_id: userId,
          details: { error: error.message },
        });
        showToast("error", "Logout Failed", error.message);
      } else {
        logEvent({
          event_type: "LOGOUT_SUCCESS",
          user_id: userId,
        });
        showToast("success", "Logged Out", "You have been signed out successfully.");
        setTimeout(() => {
          router.replace("/login");
        }, 1500);
      }
    };

    logout();
  }, [router]);

  return (
    <View
      className="flex-1 justify-center items-center bg-white"
      style={{ paddingTop: insets.top }}
    >
      <Text className="text-lg text-gray-600">Logging out...</Text>
      <Toast />
    </View>
  );
}
