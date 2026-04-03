import { useRouter } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    TouchableOpacity,
    View,
} from "react-native";
import Toast from "react-native-toast-message";
import LogoHeader from "../components/logoHeader";
import ScreenWrapper from "../components/ScreenWrapper";
import { ThemedText } from '../components/themed-text';
import { ThemedTextInput } from '../components/themed-textinput';
import { useAppTheme } from "../hooks/useAppTheme";
import { supabase } from "../supabase";
import { logEvent } from "../utils/logging";

export default function ChangePasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const {
    bgCard,
    bgInput,
    border,
    borderInput,
    textPrimary,
    textSecondary,
    placeholderColor,
  } = useAppTheme();

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

    // This makes sure new passwords match
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
        text2: "Could not update password. Please try again.",
      });
      const {
        data: { user },
      } = await supabase.auth.getUser();
      logEvent({
        event_type: "PASSWORD_CHANGE_FAILED",
        user_id: user?.id,
        details: { error: error.message },
      });
    } else {
      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Password changed successfully",
      });
      const {
        data: { user },
      } = await supabase.auth.getUser();
      logEvent({
        event_type: "PASSWORD_CHANGED",
        user_id: user?.id,
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
          <ThemedText className="text-3xl font-bold text-cyan-400 mb-2 text-center">
            Change Password
          </ThemedText>
          <ThemedText className={`${textSecondary} text-center mb-6`}>
            Update your account password
          </ThemedText>

          <View className={`${bgCard} rounded-xl p-6 border ${border}`}>
            <ThemedText className={`${textSecondary} text-xs mb-2`}>
              Current Password
            </ThemedText>
            <ThemedTextInput
              className={`${bgInput} border ${borderInput} ${textPrimary} p-4 mb-4 rounded-lg`}
              placeholder="Enter current password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              placeholderTextColor={placeholderColor}
            />

            <ThemedText className={`${textSecondary} text-xs mb-2`}>
              New Password
            </ThemedText>
            <ThemedTextInput
              className={`${bgInput} border ${borderInput} ${textPrimary} p-4 mb-4 rounded-lg`}
              placeholder="Enter new password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholderTextColor={placeholderColor}
            />

            <ThemedText className={`${textSecondary} text-xs mb-2`}>
              Confirm New Password
            </ThemedText>
            <ThemedTextInput
              className={`${bgInput} border ${borderInput} ${textPrimary} p-4 mb-6 rounded-lg`}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholderTextColor={placeholderColor}
            />

            <TouchableOpacity
              className={`p-4 rounded-lg mb-3 ${loading ? "bg-gray-400" : "bg-cyan-600"}`}
              onPress={handleChangePassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <ThemedText className="text-white text-center font-bold">
                  Change Password
                </ThemedText>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              className={`${bgInput} p-4 rounded-lg border ${borderInput}`}
              onPress={() => router.back()}
            >
              <ThemedText className="text-center text-cyan-400 font-semibold">
                Cancel
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScreenWrapper>
  );
}
