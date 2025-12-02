import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
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

export default function EditProfileScreen() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [trn, setTrn] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  // when page opens it loads the users current profile data
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("teachers")
      .select("first_name, last_name, email, trn")
      .eq("id", user.id)
      .single();

    if (data) {
      setFirstName(data.first_name);
      setLastName(data.last_name);
      setEmail(data.email);
      setTrn(data.trn);
    }

    setLoading(false);
  };

  const handleSave = async () => {
    // makes sure both names are filled
    if (!firstName || !lastName) {
      Toast.show({
        type: "error",
        text1: "Missing Fields",
        text2: "Please fill all required fields",
      });
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // only update first name and last name (email and TRN are locked for security)
    const { error } = await supabase
      .from("teachers")
      .update({
        first_name: firstName,
        last_name: lastName,
      })
      .eq("id", user.id);

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
        text2: "Profile updated successfully",
      });
      setTimeout(() => router.back(), 1500);
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <ScreenWrapper>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#22d3ee" />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <LogoHeader position="left" />
      <View className="flex-1 items-center justify-center px-6">
        <View className="w-full max-w-md">
          <Text className="text-3xl font-bold text-cyan-400 mb-2 text-center">
            Edit Profile
          </Text>
          <Text className="text-gray-400 text-center mb-6">
            Update your personal information
          </Text>

          <View className="bg-neutral-900 rounded-xl p-6 border border-neutral-800">
            <Text className="text-gray-400 text-xs mb-2">First Name *</Text>
            <TextInput
              className="bg-neutral-800 border border-neutral-700 text-gray-100 p-4 mb-4 rounded-lg"
              placeholder="First Name"
              value={firstName}
              onChangeText={setFirstName}
              placeholderTextColor="#9CA3AF"
            />

            <Text className="text-gray-400 text-xs mb-2">Last Name *</Text>
            <TextInput
              className="bg-neutral-800 border border-neutral-700 text-gray-100 p-4 mb-4 rounded-lg"
              placeholder="Last Name"
              value={lastName}
              onChangeText={setLastName}
              placeholderTextColor="#9CA3AF"
            />

            <Text className="text-gray-400 text-xs mb-2">
              Email (Cannot be changed)
            </Text>
            <TextInput
              className="bg-neutral-700 border border-neutral-600 text-gray-400 p-4 mb-4 rounded-lg"
              value={email}
              editable={false}
              placeholderTextColor="#9CA3AF"
            />

            <Text className="text-gray-400 text-xs mb-2">
              TRN (Cannot be changed)
            </Text>
            <TextInput
              className="bg-neutral-700 border border-neutral-600 text-gray-400 p-4 mb-6 rounded-lg"
              value={trn}
              editable={false}
              placeholderTextColor="#9CA3AF"
            />

            <TouchableOpacity
              className={`p-4 rounded-lg mb-3 ${saving ? "bg-gray-400" : "bg-cyan-600"}`}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-white text-center font-bold">
                  Save Changes
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
