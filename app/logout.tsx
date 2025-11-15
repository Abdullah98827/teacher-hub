import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { supabase } from "../supabase";

export default function Logout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const showToast = (
    type: "success" | "error",
    title: string,
    message: string
  ) => {
    Toast.show({ type, text1: title, text2: message });
  };

  useEffect(() => {
    const logout = async () => {
      const { error } = await supabase.auth.signOut();

      if (error) {
        showToast("error", "Logout Failed", error.message);
      } else {
        showToast(
          "success",
          "Logged Out",
          "You have been signed out successfully."
        );
        setTimeout(() => {
          router.replace("/login");
        }, 1500);
      }
    };

    logout();
  }, []);

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
