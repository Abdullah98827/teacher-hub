import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import ScreenWrapper from "../components/ScreenWrapper";
import { supabase } from "../supabase";

type Subject = {
  id: string;
  name: string;
  description?: string;
  icon_url?: string;
};

export default function Membership() {
  const [tier, setTier] = useState<"single" | "multi" | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const pricing = {
    single: "£9.99/month",
    multi: "£17.99/month",
  };

  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Load all available subjects when page opens
  useEffect(() => {
    const fetchSubjects = async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("id, name, description, icon_url")
        .order("name", { ascending: true });

      if (error) {
        Toast.show({ type: "error", text1: "Error", text2: error.message });
      } else if (data) {
        setSubjects(data);
      }
    };

    fetchSubjects();
  }, []);

  // Fade in animation when tier is selected
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [tier, fadeAnim]);

  const showToast = (type: "success" | "error", title: string, msg: string) =>
    Toast.show({ type, text1: title, text2: msg });

  const toggleSubject = (subjectId: string) => {
    // If already selected, remove it
    if (selectedSubjectIds.includes(subjectId)) {
      setSelectedSubjectIds((prev) => prev.filter((id) => id !== subjectId));
    } else {
      // On Single tier user can max choose 1 subject, and for Multi tier user can choose max 2 subjects
      if (tier === "single" && selectedSubjectIds.length >= 1) return;
      if (tier === "multi" && selectedSubjectIds.length >= 2) return;
      setSelectedSubjectIds((prev) => [...prev, subjectId]);
    }
  };

  const confirmMembership = async () => {
    // Make sure user picked a tier and at least one subject
    if (!tier || selectedSubjectIds.length === 0) {
      return showToast("error", "Incomplete", "Select a tier and subject(s)");
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Saves the membership choice to database (starts as inactive until payment)
    const { error } = await supabase.from("memberships").upsert({
      id: user.id,
      tier,
      subject_ids: selectedSubjectIds,
      active: false, // Will be set to true after payment
    });

    if (error) {
      showToast("error", "Error", error.message);
      setLoading(false);
    } else {
      showToast("success", "Membership Saved", "Proceeding to payment...");
      setTimeout(() => router.push("../checkout"), 1500);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <ScreenWrapper>
      <View className="flex-1 items-center justify-center p-6">
        <Text className="text-2xl font-bold text-cyan-400 mb-4">
          Choose Your Membership
        </Text>

        <View className="flex-row gap-4 mb-6">
          <TouchableOpacity
            className={`p-4 rounded-xl w-40 ${
              tier === "single" ? "bg-cyan-600" : "bg-neutral-800"
            }`}
            onPress={() => {
              setTier("single");
              setSelectedSubjectIds([]); // Reset selections when changing tier
              fadeAnim.setValue(0);
            }}
          >
            <Text className="text-white font-bold text-center">
              Single Subject
            </Text>
            {tier === "single" && (
              <Animated.Text
                style={{ opacity: fadeAnim }}
                className="text-gray-300 text-xs text-center mt-1"
              >
                {pricing.single}
              </Animated.Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            className={`p-4 rounded-xl w-40 ${
              tier === "multi" ? "bg-cyan-600" : "bg-neutral-800"
            }`}
            onPress={() => {
              setTier("multi");
              setSelectedSubjectIds([]); // Reset selections when changing tier
              fadeAnim.setValue(0);
            }}
          >
            <Text className="text-white font-bold text-center">
              Multi Subject
            </Text>
            {tier === "multi" && (
              <Animated.Text
                style={{ opacity: fadeAnim }}
                className="text-gray-300 text-xs text-center mt-1"
              >
                {pricing.multi}
              </Animated.Text>
            )}
          </TouchableOpacity>
        </View>

        <Text className="text-gray-300 mb-2">
          Select {tier === "multi" ? "up to 2" : "1"} subject(s):
        </Text>

        <ScrollView className="w-full max-w-md mb-6">
          {subjects.map((subject) => (
            <TouchableOpacity
              key={subject.id}
              className={`flex-row items-center p-3 mb-2 rounded-xl border ${
                selectedSubjectIds.includes(subject.id)
                  ? "bg-cyan-600 border-cyan-400"
                  : "bg-neutral-800 border-neutral-700"
              }`}
              onPress={() => toggleSubject(subject.id)}
            >
              {subject.icon_url ? (
                <Image
                  source={{ uri: subject.icon_url }}
                  className="w-10 h-10 mr-3 rounded-full"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-10 h-10 mr-3 rounded-full bg-neutral-700 items-center justify-center">
                  <Text className="text-white text-xs">📚</Text>
                </View>
              )}

              <View className="flex-1">
                <Text className="text-white font-semibold">{subject.name}</Text>
                {subject.description && (
                  <Text className="text-gray-400 text-xs">
                    {subject.description}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity
          className={`p-4 rounded-xl ${loading ? "bg-gray-400" : "bg-cyan-600"}`}
          onPress={confirmMembership}
          disabled={loading}
        >
          <Text className="text-white text-center font-bold">
            {loading ? "Saving..." : "Confirm Membership"}
          </Text>
        </TouchableOpacity>

        <View className="flex-row justify-between mt-6 w-full max-w-md">
          <TouchableOpacity
            className="flex-1 bg-neutral-800 p-3 rounded-xl mr-2 active:scale-95"
            onPress={() => router.push("/contact")}
          >
            <Text className="text-center text-cyan-400 font-medium">
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

        <TouchableOpacity
          className="mt-4 bg-neutral-700 p-3 rounded-xl w-full max-w-md active:scale-95"
          onPress={() => router.back()}
        >
          <Text className="text-center text-cyan-300 font-medium">Back</Text>
        </TouchableOpacity>
      </View>
      <Toast />
    </ScreenWrapper>
  );
}
