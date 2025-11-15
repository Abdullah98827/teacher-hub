import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import LogoHeader from "../components/logoHeader";
import ScreenWrapper from "../components/ScreenWrapper";
import { supabase } from "../supabase";

export default function ChangePasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChangePassword = async () => {
    // Makes sure all fields are filled
    if (!currentPassword || !newPassword || !confirmPassword) {
      Toast.show({
        type: "error",
        text1: "Missing Fields",
        text2: "Please fill all fields",
      });
      return;
    }

    // Checks the strength of new password
    if (newPassword.length < 6) {
      Toast.show({
        type: "error",
        text1: "Weak Password",
        text2: "Password must be at least 6 characters",
      });
      return;
    }

    // this makes sure new passwords match
    if (newPassword !== confirmPassword) {
      Toast.show({
        type: "error",
        text1: "Mismatch",
        text2: "New passwords do not match",
      });
      return;
    }

    setLoading(true);

    // Updates password in Supabase Auth
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      Toast.show({
        type: "error",
        text1: "Update Failed",
        text2: error.message,
      });
    } else {
      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Password changed successfully",
      });
      setTimeout(() => router.back(), 1500);
    }

    setLoading(false);
  };

  return (
    <ScreenWrapper>
      <LogoHeader position="left" />
      <View className="flex-1 items-center justify-center px-6">
        <View className="w-full max-w-md">
          <Text className="text-3xl font-bold text-cyan-400 mb-2 text-center">
            Change Password
          </Text>
          <Text className="text-gray-400 text-center mb-6">
            Update your account password
          </Text>

          <View className="bg-neutral-900 rounded-xl p-6 border border-neutral-800">
            <Text className="text-gray-400 text-xs mb-2">Current Password</Text>
            <TextInput
              className="bg-neutral-800 border border-neutral-700 text-gray-100 p-4 mb-4 rounded-lg"
              placeholder="Enter current password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              placeholderTextColor="#9CA3AF"
            />

            <Text className="text-gray-400 text-xs mb-2">New Password</Text>
            <TextInput
              className="bg-neutral-800 border border-neutral-700 text-gray-100 p-4 mb-4 rounded-lg"
              placeholder="Enter new password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholderTextColor="#9CA3AF"
            />

            <Text className="text-gray-400 text-xs mb-2">
              Confirm New Password
            </Text>
            <TextInput
              className="bg-neutral-800 border border-neutral-700 text-gray-100 p-4 mb-6 rounded-lg"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholderTextColor="#9CA3AF"
            />

            <TouchableOpacity
              className={`p-4 rounded-lg mb-3 ${loading ? "bg-gray-400" : "bg-cyan-600"}`}
              onPress={handleChangePassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-white text-center font-bold">
                  Change Password
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-neutral-800 p-4 rounded-lg border border-neutral-700"
              onPress={() => router.back()}
            >
              <Text className="text-center text-cyan-400 font-semibold">
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <Toast />
    </ScreenWrapper>
  );
}
