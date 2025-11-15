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
import ScreenWrapper from "../components/ScreenWrapper";
import LogoHeader from "../components/logoHeader";
import { supabase } from "../supabase";

export default function ContactAdmin() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingUser, setFetchingUser] = useState(true);
  const router = useRouter();

  //when page loads its logged in with user's email
  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      const user = data?.user;

      if (error || !user) {
        router.replace("/login");
        return;
      }

      setEmail(user.email || "");
      setUserId(user.id);
      setFetchingUser(false);
    };

    fetchUser();
  }, []);

  const showToast = (type: "success" | "error", title: string, msg: string) =>
    Toast.show({ type, text1: title, text2: msg });

  const handleSubmit = async () => {
    // Makes sure the message isn't empty
    if (!message.trim()) {
      return showToast("error", "Missing Info", "Please enter your message");
    }

    if (!userId) {
      return showToast("error", "Error", "User not authenticated");
    }

    setLoading(true);

    // Saves the contact request to database
    const { error } = await supabase.from("contact_requests").insert({
      email,
      message: message.trim(),
      status: "pending",
      user_id: userId,
    });

    if (error) {
      showToast("error", "Error", error.message);
    } else {
      showToast("success", "Message Sent", "An admin will respond shortly");
      setMessage("");
      setTimeout(() => router.back(), 1500);
    }

    setLoading(false);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showToast("error", "Logout Failed", error.message);
    } else {
      router.replace("/login");
    }
  };

  if (fetchingUser) {
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
            Contact Admin
          </Text>
          <Text className="text-gray-400 text-center mb-6">
            Send a message to the admin team
          </Text>

          <View className="bg-neutral-900 rounded-xl p-6 border border-neutral-800">
            <Text className="text-gray-400 text-xs mb-2">Your Email</Text>
            <TextInput
              className="bg-neutral-800 border border-neutral-700 text-gray-100 p-4 mb-4 rounded-lg"
              value={email}
              editable={false}
              placeholderTextColor="#9CA3AF"
            />

            <Text className="text-gray-400 text-xs mb-2">Your Message</Text>
            <TextInput
              className="bg-neutral-800 border border-neutral-700 text-gray-100 p-4 mb-4 rounded-lg"
              placeholder="Type your message here..."
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              placeholderTextColor="#9CA3AF"
            />

            <TouchableOpacity
              className={`p-4 rounded-lg mb-3 ${loading ? "bg-gray-400" : "bg-cyan-600"}`}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-white text-center font-bold">
                  Send Message
                </Text>
              )}
            </TouchableOpacity>

            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-neutral-800 p-4 rounded-lg border border-neutral-700"
                onPress={() => router.back()}
              >
                <Text className="text-center text-cyan-400 font-semibold">
                  Go Back
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1 bg-red-600 p-4 rounded-lg"
                onPress={handleLogout}
              >
                <Text className="text-center text-white font-semibold">
                  Logout
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
      <Toast />
    </ScreenWrapper>
  );
}
