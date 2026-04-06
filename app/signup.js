import * as ImagePicker from "expo-image-picker";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Image, Text, TextInput, TouchableOpacity, View } from "react-native";
import Toast from "react-native-toast-message";
import LogoHeader from "../components/logoHeader";
import ScreenWrapper from "../components/ScreenWrapper";
import { useAppTheme } from "../hooks/useAppTheme";
import { supabase } from "../supabase";
import { logEvent } from "../utils/logging";

export default function Signup() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    trn: "",
  });
  const [photoUri, setPhotoUri] = useState(null);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const {
    bgCard,
    bgInput,
    borderInput,
    textPrimary,
    textSecondary,
    placeholderColor,
  } = useAppTheme();

  const showToast = (type, title, msg) =>
    Toast.show({ type, text1: title, text2: msg });

  const updateField = (field, value) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const pickPhoto = async () => {
    // Open the device's image library to select a photo
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    // If user didn't cancel, save the selected image URI
    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const base64ToBuffer = (base64) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  };

  const uploadPhoto = async (userId) => {
    // Create a unique filename for the photo using email and user ID
    const fileName = `${formData.email.replace(/[@.]/g, "_")}_${userId}.jpg`;
    
    // Fetch the photo from the device and convert to blob
    const response = await fetch(photoUri);
    const blob = await response.blob();

    // Create a promise to handle file reading
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      // Handle successful file read
      reader.onloadend = async () => {
        // Extract base64 data from the file reader result
        const base64 = reader.result.split(",")[1];

        // Upload the photo to Supabase storage
        const { error } = await supabase.storage
          .from("teacher-passes")
          .upload(fileName, base64ToBuffer(base64), {
            contentType: "image/jpeg",
            upsert: true,
          });

        // If upload failed, reject the promise with the error
        if (error) {
          reject(error);
        } else {
          // If upload succeeded, resolve with the filename
          resolve(fileName);
        }
      };
      
      // Handle file read errors
      reader.onerror = reject;
      
      // Start reading the blob as data URL
      reader.readAsDataURL(blob);
    });
  };

  const handleSignup = async () => {
    const { email, password, firstName, lastName, trn } = formData;

    // Step 1: Validate that all required fields are filled
    if (!email || !password || !firstName || !lastName || !trn || !photoUri || !consent) {
      return showToast("error", "Missing Info", "Fill all fields, upload photo & accept consent");
    }

    // Step 2: Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return showToast("error", "Invalid Email", "Enter a valid email address");
    }

    // Step 3: Validate password strength (minimum 6 characters)
    if (password.length < 6) {
      return showToast("error", "Weak Password", "Password must be at least 6 characters");
    }

    // Step 4: Start loading state
    setLoading(true);

    // Step 5: Create user account with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { verified: false } },
    });

    // Step 6: Check if user creation failed
    if (error || !data.user?.id) {
      logEvent({
        event_type: "SIGNUP_FAILED",
        details: { email, error: error?.message },
      });
      showToast("error", "Signup Failed", error?.message || "Could not create account");
      setLoading(false);
      return;
    }

    const userId = data.user.id;

    // Step 7: Log successful signup event
    logEvent({
      event_type: "SIGNUP_SUCCESS",
      user_id: userId,
      details: { email },
    });

    // Step 8: Upload the teacher pass photo
    const fileName = await uploadPhoto(userId);

    // Step 9: Check if photo upload failed
    if (!fileName) {
      showToast("error", "Upload Failed", "Could not upload photo");
      setLoading(false);
      return;
    }

    // Step 10: Create teacher profile in database
    const { error: profileError } = await supabase.from("teachers").insert({
      id: userId,
      email,
      first_name: firstName,
      last_name: lastName,
      trn,
      photo_url: fileName,
      verified: false,
    });

    // Step 11: Check if profile creation failed
    if (profileError) {
      showToast("error", "Profile Error", "Could not save profile. Please contact support.");
      setLoading(false);
      return;
    }

    // Step 12: Assign teacher role to the user
    await supabase.from("user_roles").insert({
      id: userId,
      role: "teacher",
    });

    // Step 13: Check if email verification is needed
    if (!data.user.email_confirmed_at && !data.user.confirmed_at) {
      showToast("info", "Verify Email", "Please verify your email before continuing.");
      setTimeout(() => router.replace("/verify-email"), 1000);
      setLoading(false);
      return;
    }

    // Step 14: Account creation complete - redirect to login
    showToast("success", "Success!", "Admin will verify within 24-48 hours");
    setTimeout(() => router.push("/login"), 1500);
    setLoading(false);
  };

  return (
    <ScreenWrapper>
      <LogoHeader position="left" />
      <View className="flex-1 justify-center items-center">
        <View className={`w-full max-w-md ${bgCard} p-6 rounded-xl shadow-lg`}>
          <Text className="text-3xl font-bold text-center mb-6 text-cyan-400">
            Sign Up
          </Text>

          <TextInput
            className={`${bgInput} border ${borderInput} ${textPrimary} p-4 mb-3 rounded-xl`}
            placeholder="First Name"
            value={formData.firstName}
            onChangeText={(val) => updateField("firstName", val)}
            autoCapitalize="words"
            editable={!loading}
            placeholderTextColor={placeholderColor}
          />

          <TextInput
            className={`${bgInput} border ${borderInput} ${textPrimary} p-4 mb-3 rounded-xl`}
            placeholder="Last Name"
            value={formData.lastName}
            onChangeText={(val) => updateField("lastName", val)}
            autoCapitalize="words"
            editable={!loading}
            placeholderTextColor={placeholderColor}
          />

          <TextInput
            className={`${bgInput} border ${borderInput} ${textPrimary} p-4 mb-3 rounded-xl`}
            placeholder="Email"
            value={formData.email}
            onChangeText={(val) => updateField("email", val)}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
            placeholderTextColor={placeholderColor}
          />

          <TextInput
            className={`${bgInput} border ${borderInput} ${textPrimary} p-4 mb-3 rounded-xl`}
            placeholder="Password"
            value={formData.password}
            onChangeText={(val) => updateField("password", val)}
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
            placeholderTextColor={placeholderColor}
          />

          <TextInput
            className={`${bgInput} border ${borderInput} ${textPrimary} p-4 mb-3 rounded-xl`}
            placeholder="Teacher Reference Number (TRN)"
            value={formData.trn}
            onChangeText={(val) => updateField("trn", val)}
            keyboardType="number-pad"
            autoCapitalize="none"
            editable={!loading}
            placeholderTextColor={placeholderColor}
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
            <Text className={`flex-1 text-sm ${textSecondary}`}>
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
