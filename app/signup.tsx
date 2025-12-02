import * as ImagePicker from "expo-image-picker";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Image, Text, TextInput, TouchableOpacity, View } from "react-native";
import Toast from "react-native-toast-message";
import LogoHeader from "../components/logoHeader";
import ScreenWrapper from "../components/ScreenWrapper";
import { supabase } from "../supabase";

export default function Signup() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    trn: "",
  });
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const showToast = (type: "success" | "error", title: string, msg: string) =>
    Toast.show({ type, text1: title, text2: msg });

  const updateField = (field: keyof typeof formData, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  // Converts base64 string to binary data for upload
  const base64ToBuffer = (base64: string) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  };

  const uploadPhoto = async (userId: string) => {
    const fileName = `${formData.email.replace(/[@.]/g, "_")}_${userId}.jpg`;

    // Reads the image file
    const response = await fetch(photoUri!);
    const blob = await response.blob();

    // Converts to base64 then uploads
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(",")[1];

        const { error } = await supabase.storage
          .from("teacher-passes")
          .upload(fileName, base64ToBuffer(base64), {
            contentType: "image/jpeg",
            upsert: true,
          });

        if (error) {
          reject(error);
        } else {
          resolve(fileName);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleSignup = async () => {
    const { email, password, firstName, lastName, trn } = formData;

    // Basic validation checks
    if (
      !email ||
      !password ||
      !firstName ||
      !lastName ||
      !trn ||
      !photoUri ||
      !consent
    ) {
      return showToast(
        "error",
        "Missing Info",
        "Fill all fields, upload photo & accept consent"
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return showToast("error", "Invalid Email", "Enter a valid email address");
    }
    if (password.length < 6) {
      return showToast(
        "error",
        "Weak Password",
        "Password must be at least 6 characters"
      );
    }

    setLoading(true);

    // Step 1: Creates the user account
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { verified: false } },
    });

    if (error || !data.user?.id) {
      showToast(
        "error",
        "Signup Failed",
        error?.message || "Could not create account"
      );
      setLoading(false);
      return;
    }

    const userId = data.user.id;

    // Step 2: Uploads the teacher pass photo
    const fileName = await uploadPhoto(userId);

    if (!fileName) {
      showToast("error", "Upload Failed", "Could not upload photo");
      setLoading(false);
      return;
    }

    // Step 3: Saves the teacher profile to database
    const { error: profileError } = await supabase.from("teachers").insert({
      id: userId,
      email,
      first_name: firstName,
      last_name: lastName,
      trn,
      photo_url: fileName,
      verified: false, // Admin will have to verify this
    });

    if (profileError) {
      showToast("error", "Profile Error", profileError.message);
      setLoading(false);
      return;
    }

    // Step 4: Assigns teacher role
    await supabase.from("user_roles").insert({
      id: userId,
      role: "teacher",
    });

    showToast("success", "Success!", "Admin will verify within 24-48 hours");
    setTimeout(() => router.push("/login"), 1500);
    setLoading(false);
  };

  return (
    <ScreenWrapper>
      <LogoHeader position="left" />
      <View className="flex-1 justify-center items-center">
        <View className="w-full max-w-md bg-neutral-900 p-6 rounded-xl shadow-lg">
          <Text className="text-3xl font-bold text-center mb-6 text-cyan-400">
            Sign Up
          </Text>

          <TextInput
            className="bg-neutral-800 border border-neutral-700 text-gray-100 p-4 mb-3 rounded-xl"
            placeholder="First Name"
            value={formData.firstName}
            onChangeText={(val) => updateField("firstName", val)}
            autoCapitalize="words"
            editable={!loading}
            placeholderTextColor="#9CA3AF"
          />

          <TextInput
            className="bg-neutral-800 border border-neutral-700 text-gray-100 p-4 mb-3 rounded-xl"
            placeholder="Last Name"
            value={formData.lastName}
            onChangeText={(val) => updateField("lastName", val)}
            autoCapitalize="words"
            editable={!loading}
            placeholderTextColor="#9CA3AF"
          />

          <TextInput
            className="bg-neutral-800 border border-neutral-700 text-gray-100 p-4 mb-3 rounded-xl"
            placeholder="Email"
            value={formData.email}
            onChangeText={(val) => updateField("email", val)}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
            placeholderTextColor="#9CA3AF"
          />

          <TextInput
            className="bg-neutral-800 border border-neutral-700 text-gray-100 p-4 mb-3 rounded-xl"
            placeholder="Password"
            value={formData.password}
            onChangeText={(val) => updateField("password", val)}
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
            placeholderTextColor="#9CA3AF"
          />

          <TextInput
            className="bg-neutral-800 border border-neutral-700 text-gray-100 p-4 mb-3 rounded-xl"
            placeholder="Teacher Reference Number (TRN)"
            value={formData.trn}
            onChangeText={(val) => updateField("trn", val)}
            keyboardType="number-pad"
            autoCapitalize="none"
            editable={!loading}
            placeholderTextColor="#9CA3AF"
          />

          <TouchableOpacity
            className="bg-cyan-600 p-4 mb-3 rounded-xl active:scale-95"
            onPress={pickPhoto}
          >
            <Text className="text-white text-center font-bold">
              Upload Teacher Pass Photo *
            </Text>
          </TouchableOpacity>

          {photoUri && (
            <Image
              source={{ uri: photoUri }}
              className="w-24 h-24 rounded-lg self-center mb-3"
            />
          )}

          <Text
            className={`text-sm mb-3 text-center ${photoUri ? "text-green-500" : "text-red-500"}`}
          >
            {photoUri ? "Photo selected ✓" : "Photo required"}
          </Text>

          <TouchableOpacity
            className="flex-row items-center mb-3 p-3"
            onPress={() => setConsent(!consent)}
          >
            <View
              className={`w-5 h-5 border-2 rounded mr-2 ${consent ? "bg-cyan-600" : "bg-white"}`}
            />
            <Text className="flex-1 text-sm text-gray-300">
              I consent to photo verification (deleted after approval)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`p-4 rounded-xl mb-3 active:scale-95 ${loading ? "bg-gray-400" : "bg-cyan-600"}`}
            onPress={handleSignup}
            disabled={loading}
          >
            <Text className="text-white text-center font-bold">
              {loading ? "Signing up..." : "Sign Up"}
            </Text>
          </TouchableOpacity>

          <Link href="/login" asChild>
            <TouchableOpacity className="p-3">
              <Text className="text-center text-cyan-400 underline">
                Already have an account? Login
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
      <Toast />
    </ScreenWrapper>
  );
}
