import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import Toast from "react-native-toast-message";
import ScreenWrapper from "../components/ScreenWrapper";
import LogoHeader from "../components/logoHeader";
import { supabase } from "../supabase";

export default function ContactAdmin() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) setEmail(data.user.email);
    });
  }, []);

  const showToast = (type: "success" | "error", title: string, msg: string) =>
    Toast.show({ type, text1: title, text2: msg });

  const handleSubmit = async () => {
    if (!email || !message) {
      return showToast("error", "Missing Info", "Please enter your message");
    }

    setLoading(true);

    const { error } = await supabase.from("contact_requests").insert({
      email,
      message,
      status: "pending",
    });

    if (error) {
      showToast("error", "Error", error.message);
    } else {
      showToast("success", "Message Sent", "An admin will respond shortly");
      setTimeout(() => router.push("/pending"), 1500); // ✅ push instead of replace
    }

    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login"); // ✅ push instead of replace
  };

  return (
    <ScreenWrapper>
      <LogoHeader position="left" />
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-2xl font-bold text-cyan-400 mb-4 text-center">
          Contact Admin
        </Text>

        <TextInput
          className="bg-neutral-800 border border-neutral-700 text-gray-100 p-4 mb-4 rounded-xl w-full"
          placeholder="Your Email"
          value={email}
          onChangeText={setEmail}
          editable={false}
          placeholderTextColor="#9CA3AF"
        />

        <TextInput
          className="bg-neutral-800 border border-neutral-700 text-gray-100 p-4 mb-4 rounded-xl w-full"
          placeholder="Your Message"
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={4}
          placeholderTextColor="#9CA3AF"
        />

        <TouchableOpacity
          className={`p-4 rounded-xl w-full ${loading ? "bg-gray-400" : "bg-cyan-600"}`}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text className="text-white text-center font-bold">
            {loading ? "Sending..." : "Send Message"}
          </Text>
        </TouchableOpacity>

        {/* Footer Buttons */}
        <View className="flex-row justify-between mt-6 w-full">
          <TouchableOpacity
            className="bg-neutral-800 p-3 rounded-xl active:scale-95"
            onPress={() => router.back()}
          >
            <Text className="text-center text-cyan-400 font-medium">Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 bg-red-600 p-3 rounded-xl ml-2 active:scale-95"
            onPress={handleLogout}
          >
            <Text className="text-center text-white font-medium">Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Toast />
    </ScreenWrapper>
  );
}
