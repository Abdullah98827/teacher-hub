import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import LogoHeader from "../components/logoHeader";
import ScreenWrapper from "../components/ScreenWrapper";
import { supabase } from "../supabase";

export default function PendingApproval() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login"); // ✅ push instead of replace
  };

  return (
    <ScreenWrapper>
      <LogoHeader position="left" />
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-3xl font-bold text-cyan-400 mb-4 text-center">
          Account Pending Approval
        </Text>
        <Text className="text-gray-300 text-center text-base leading-relaxed">
          Your account has been submitted successfully and is awaiting
          verification by an admin. Once approved, you’ll be able to choose your
          membership and access Teacher Hub resources.
        </Text>
        <Text className="text-gray-400 text-sm mt-6 text-center mb-8">
          Approval usually takes 24–48 hours. You’ll receive an email once your
          account is verified.
        </Text>

        {/* Navigation Buttons */}
        <View className="flex-row justify-between w-full max-w-md">
          <TouchableOpacity
            className="flex-1 bg-cyan-600 p-3 rounded-xl mr-2 active:scale-95"
            onPress={() => router.push("/contact")}
          >
            <Text className="text-center text-white font-medium">
              Contact Admin
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 bg-red-600 p-3 rounded-xl ml-2 active:scale-95"
            onPress={handleLogout}
          >
            <Text className="text-center text-white font-medium">Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenWrapper>
  );
}
