import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import LogoHeader from "../../components/logoHeader";
import ScreenWrapper from "../../components/ScreenWrapper";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../supabase";
import { uploadFile } from "../../utils/storage"; // ✅ centralized helper

interface Subject {
  id: string;
  name: string;
}

type Category = "powerpoint" | "worksheet" | "lesson_plan";

export default function UploadResourceScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<Category | "">("");
  const [selectedFile, setSelectedFile] = useState<any>(null);

  const categories = [
    { value: "powerpoint", label: "PowerPoint", icon: "easel" },
    { value: "worksheet", label: "Worksheet", icon: "document-text" },
    { value: "lesson_plan", label: "Lesson Plan", icon: "book" },
  ];

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const { data: membershipData, error: membershipError } = await supabase
        .from("memberships")
        .select("subject_ids")
        .eq("id", user?.id)
        .eq("active", true)
        .single();

      if (membershipError) {
        const { data: allSubjects } = await supabase
          .from("subjects")
          .select("id, name")
          .order("name");
        setSubjects(allSubjects || []);
        setLoading(false);
        return;
      }

      const subjectIds = membershipData?.subject_ids || [];
      if (subjectIds.length === 0) {
        Toast.show({
          type: "error",
          text1: "No active subjects",
          text2: "Please subscribe to subjects first",
        });
        setLoading(false);
        return;
      }

      const { data: subjectsData, error: subjectsError } = await supabase
        .from("subjects")
        .select("id, name")
        .in("id", subjectIds)
        .order("name");

      if (subjectsError) throw subjectsError;
      setSubjects(subjectsData || []);
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Failed to load subjects",
        text2: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "application/vnd.ms-powerpoint",
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size && file.size > maxSize) {
          Toast.show({
            type: "error",
            text1: "File too large",
            text2: "Maximum file size is 10MB",
          });
          return;
        }
        setSelectedFile(file);
        Toast.show({
          type: "success",
          text1: "File selected",
          text2: file.name,
        });
      }
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Error picking file",
        text2: error.message,
      });
    }
  };

  const uploadResource = async () => {
    if (!title.trim()) {
      Toast.show({ type: "error", text1: "Please enter a title" });
      return;
    }
    if (!selectedSubject) {
      Toast.show({ type: "error", text1: "Please select a subject" });
      return;
    }
    if (!selectedCategory) {
      Toast.show({ type: "error", text1: "Please select a category" });
      return;
    }
    if (!selectedFile) {
      Toast.show({ type: "error", text1: "Please select a file" });
      return;
    }

    setUploading(true);

    try {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("id", user?.id)
        .single();

      const isAdmin =
        roleData?.role === "admin" || roleData?.role === "super_admin";

      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;

      const response = await fetch(selectedFile.uri);
      const blob = await response.blob();

      const success = await uploadFile(filePath, blob); // ✅ use helper
      if (!success) throw new Error("Upload failed");

      // ✅ Store only the file path in DB
      const { error: dbError } = await supabase.from("resources").insert({
        title: title.trim(),
        description: description.trim() || null,
        file_url: filePath, // path only
        file_name: selectedFile.name,
        file_type: fileExt,
        subject_id: selectedSubject,
        category: selectedCategory,
        uploaded_by: user?.id,
        status: isAdmin ? "approved" : "pending",
      });

      if (dbError) throw dbError;

      Toast.show({
        type: "success",
        text1: "Resource uploaded!",
        text2: isAdmin ? "Auto-approved" : "Waiting for admin approval",
      });

      setTitle("");
      setDescription("");
      setSelectedSubject("");
      setSelectedCategory("");
      setSelectedFile(null);

      setTimeout(() => router.back(), 1000);
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Upload failed",
        text2: error.message,
      });
    } finally {
      setUploading(false);
    }
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
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        <Text className="text-3xl font-bold text-cyan-400 mb-2">
          Upload Resource
        </Text>
        <Text className="text-gray-400 mb-6">
          Share your materials. Get 20% off after 10 approved uploads! 🎉
        </Text>

        {/* Title */}
        <View className="mb-4">
          <Text className="text-white font-semibold mb-2">Title *</Text>
          <TextInput
            className="bg-neutral-800 text-white px-4 py-3 rounded-xl border border-neutral-700"
            placeholder="e.g., Algebra Worksheet - Quadratic Equations"
            placeholderTextColor="#9CA3AF"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Description */}
        <View className="mb-4">
          <Text className="text-white font-semibold mb-2">
            Description (Optional)
          </Text>
          <TextInput
            className="bg-neutral-800 text-white px-4 py-3 rounded-xl border border-neutral-700"
            placeholder="Brief description..."
            placeholderTextColor="#9CA3AF"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Subject Selection */}
        <View className="mb-4">
          <Text className="text-white font-semibold mb-2">Subject *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {subjects.map((subject) => (
                <TouchableOpacity
                  key={subject.id}
                  className={`px-4 py-3 rounded-xl border ${
                    selectedSubject === subject.id
                      ? "bg-cyan-500 border-cyan-500"
                      : "bg-neutral-800 border-neutral-700"
                  }`}
                  onPress={() => setSelectedSubject(subject.id)}
                >
                  <Text
                    className={`font-semibold ${
                      selectedSubject === subject.id
                        ? "text-white"
                        : "text-gray-400"
                    }`}
                  >
                    {subject.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Category */}
        <View className="mb-4">
          <Text className="text-white font-semibold mb-2">Category *</Text>
          <View className="flex-row gap-2 flex-wrap">
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                className={`flex-row items-center px-4 py-3 rounded-xl border ${
                  selectedCategory === cat.value
                    ? "bg-cyan-500 border-cyan-500"
                    : "bg-neutral-800 border-neutral-700"
                }`}
                onPress={() => setSelectedCategory(cat.value as Category)}
              >
                <Ionicons
                  name={cat.icon as any}
                  size={18}
                  color={selectedCategory === cat.value ? "#fff" : "#9CA3AF"}
                />
                <Text
                  className={`ml-2 font-semibold ${
                    selectedCategory === cat.value
                      ? "text-white"
                      : "text-gray-400"
                  }`}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* File Picker */}
        <View className="mb-6">
          <Text className="text-white font-semibold mb-2">File *</Text>
          <TouchableOpacity
            className="bg-neutral-800 border border-neutral-700 rounded-xl p-4 flex-row items-center justify-between"
            onPress={pickDocument}
          >
            <View className="flex-row items-center flex-1">
              <Ionicons name="cloud-upload" size={24} color="#22d3ee" />
              <Text className="text-gray-400 ml-3 flex-1" numberOfLines={1}>
                {selectedFile ? selectedFile.name : "Choose a file..."}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
          <Text className="text-gray-500 text-xs mt-1">
            Supported: PDF, PPT, PPTX, DOC, DOCX
          </Text>
        </View>

        {/* Upload Button */}
        <TouchableOpacity
          className={`bg-cyan-500 p-4 rounded-xl mb-6 ${
            uploading ? "opacity-50" : ""
          }`}
          onPress={uploadResource}
          disabled={uploading}
        >
          {uploading ? (
            <View className="flex-row items-center justify-center">
              <ActivityIndicator color="#fff" />
              <Text className="text-white font-bold ml-2">Uploading...</Text>
            </View>
          ) : (
            <Text className="text-white text-center font-bold text-lg">
              Upload Resource
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
      <Toast />
    </ScreenWrapper>
  );
}
