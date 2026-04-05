import { Ionicons } from "@expo/vector-icons";
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
import { useAppTheme } from "../hooks/useAppTheme";
import { supabase } from "../supabase";

export default function Membership() {
  const [tier, setTier] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { bgCard, bg, border, textPrimary, textSecondary, textMuted } = useAppTheme();

  const pricing = {
    single: "£9.99/month",
    multi: "£17.99/month",
  };

  const fadeAnim = useRef(new Animated.Value(0)).current;

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

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [tier, fadeAnim]);

  const showToast = (type, title, msg) =>
    Toast.show({ type, text1: title, text2: msg });

  const toggleSubject = (subjectId) => {
    if (selectedSubjectIds.includes(subjectId)) {
      setSelectedSubjectIds((prev) => prev.filter((id) => id !== subjectId));
    } else {
      if (tier === "single" && selectedSubjectIds.length >= 1) return;
      if (tier === "multi" && selectedSubjectIds.length >= 2) return;
      setSelectedSubjectIds((prev) => [...prev, subjectId]);
    }
  };

  const confirmMembership = async () => {
    if (!tier || selectedSubjectIds.length === 0) {
      return showToast("error", "Incomplete", "Select a tier and subject(s)");
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("memberships").upsert({
      id: user.id,
      tier,
      subject_ids: selectedSubjectIds.map((id) => id),
      active: false,
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
      <View className={`flex-1 items-center justify-center p-6 ${bg}`}>
        <Text className="text-2xl font-bold text-cyan-400 mb-4 flex-row items-center justify-center">
          Choose Your Membership
        </Text>

        <View className="flex-row gap-4 mb-6">
          <TouchableOpacity
            className={`p-4 rounded-xl w-40 border ${tier === "single" ? "bg-cyan-600 border-cyan-600" : `${bgCard} ${border}`}`}
            onPress={() => {
              setTier("single");
              setSelectedSubjectIds([]);
              fadeAnim.setValue(0);
            }}
          >
            <Text className={`font-bold text-center ${tier === "single" ? "text-white" : "text-cyan-400"}`}>Single Subject</Text>
            {tier === "single" && (
              <Animated.Text
                style={{ opacity: fadeAnim }}
                className="text-cyan-100 text-xs text-center mt-1"
              >
                {pricing.single}
              </Animated.Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            className={`p-4 rounded-xl w-40 border ${tier === "multi" ? "bg-cyan-600 border-cyan-600" : `${bgCard} ${border}`}`}
            onPress={() => {
              setTier("multi");
              setSelectedSubjectIds([]);
              fadeAnim.setValue(0);
            }}
          >
            <Text className={`font-bold text-center ${tier === "multi" ? "text-white" : "text-cyan-400"}`}>Multi Subject</Text>
            {tier === "multi" && (
              <Animated.Text
                style={{ opacity: fadeAnim }}
                className="text-cyan-100 text-xs text-center mt-1"
              >
                {pricing.multi}
              </Animated.Text>
            )}
          </TouchableOpacity>
        </View>

        <Text className={`${textSecondary} mb-2`}>
          Select {tier === "multi" ? "up to 2" : "1"} subject(s):
        </Text>

        <ScrollView className="w-full max-w-md mb-6">
          {subjects.map((subject) => {
            const selected = selectedSubjectIds.includes(subject.id);
            return (
              <TouchableOpacity
                key={subject.id}
                className={`flex-row items-center p-3 mb-2 rounded-xl border ${selected ? "bg-cyan-600 border-cyan-400" : `${bgCard} ${border}`}`}
                onPress={() => toggleSubject(subject.id)}
              >
                {subject.icon_url ? (
                  <Image
                    source={{ uri: subject.icon_url }}
                    className="w-10 h-10 mr-3 rounded-full"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="w-10 h-10 mr-3 rounded-full bg-cyan-500/20 items-center justify-center">
                    <Ionicons name="school-outline" size={22} color="#22d3ee" />
                  </View>
                )}

                <View className="flex-1">
                  <Text className={`font-semibold ${selected ? "text-white" : textPrimary}`}>{subject.name}</Text>
                  {subject.description && (
                    <Text className={`text-xs ${selected ? "text-cyan-100" : textMuted}`}>{subject.description}</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <TouchableOpacity
          className={`p-4 rounded-xl ${loading ? "bg-gray-600" : "bg-cyan-600"}`}
          onPress={confirmMembership}
          disabled={loading}
        >
          <Text className="text-white text-center font-bold flex-row items-center justify-center">
            {loading ? "Saving..." : "Confirm Membership"}
          </Text>
        </TouchableOpacity>

        <View className="flex-row justify-between mt-6 w-full max-w-md">
          <TouchableOpacity
            className={`flex-1 ${bgCard} ${border} border p-3 rounded-xl mr-2 active:scale-95`}
            onPress={() => router.push("/contact")}
          >
            <Text className="text-center text-cyan-400 font-medium flex-row items-center justify-center">
              Contact Admin
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 bg-red-600 p-3 rounded-xl ml-2 active:scale-95"
            onPress={handleLogout}
          >
            <Text className="text-center text-white font-medium flex-row items-center justify-center">
              Logout
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <Toast />
    </ScreenWrapper>
  );
}