import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    TouchableOpacity,
    View,
} from "react-native";
import Toast from "react-native-toast-message";
import LogoHeader from "../../components/logoHeader";
import ScreenWrapper from "../../components/ScreenWrapper";
import { ThemedText } from '../../components/themed-text';
import { ThemedTextInput } from '../../components/themed-textinput';
import { useAuth } from "../../contexts/AuthContext";
import { useAppTheme } from "../../hooks/useAppTheme";
import { supabase } from "../../supabase";
import { useAdminNotifications } from "../../utils/adminNotificationIntegrations";
import { logEvent } from "../../utils/logging";
import { uploadFile } from "../../utils/storage";

export default function UploadResourceScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { bgInput, borderInput, textPrimary, textSecondary, placeholderColor } =
    useAppTheme();

  const { notifyAdminResourcePending, notifyFollowersResourceUploaded } = useAdminNotifications();

  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  const categories = [
    { value: "powerpoint", label: "PowerPoint", icon: "easel" },
    { value: "worksheet", label: "Worksheet", icon: "document-text" },
    { value: "lesson_plan", label: "Lesson Plan", icon: "book" },
  ];

  const fetchSubjects = useCallback(async () => {
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

    if (subjectsError) {
      Toast.show({
        type: "error",
        text1: "Failed to load subjects",
        text2: subjectsError.message,
      });
    } else {
      setSubjects(subjectsData || []);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

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
        const maxSize = 10 * 1024 * 1024;
        if (file.size && file.size > maxSize) {
          Toast.show({
            type: "error",
            text1: "File too large",
            text2: "Maximum file size is 10MB",
          });
          return;
        }
        setSelectedFile(file);
        Toast.show({ type: "success", text1: "File selected", text2: file.name });
      }
    } catch (error) {
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

      const success = await uploadFile(filePath, blob);
      if (!success) throw new Error("Upload failed");

      const { error: dbError } = await supabase.from("resources").insert({
        title: title.trim(),
        description: description.trim() || null,
        file_url: filePath,
        file_name: selectedFile.name,
        file_type: fileExt,
        subject_id: selectedSubject,
        category: selectedCategory,
        uploaded_by: user?.id,
        status: isAdmin ? "approved" : "pending",
      });

      if (dbError) throw dbError;

      logEvent({
        event_type: "RESOURCE_UPLOADED",
        user_id: user?.id,
        details: {
          title: title.trim(),
          subject_id: selectedSubject,
          category: selectedCategory,
          status: isAdmin ? "approved" : "pending",
        },
      });

      // Notify admins if resource is pending approval
      if (!isAdmin) {
        const { data: adminUsers } = await supabase
          .from("user_roles")
          .select("id")
          .or("role.eq.admin,role.eq.super_admin");

        if (adminUsers && adminUsers.length > 0) {
          const adminIds = adminUsers.map(a => a.id);
          await notifyAdminResourcePending(
            adminIds,
            user?.id,
            user?.display_name || user?.email || 'Teacher',
            title.trim(),
            null, // resourceId will be available after insert, using null for now
            selectedCategory
          ).catch(err => console.warn('Failed to notify admin:', err));
        }
      }

      // Notify followers about new resource
      const { data: followers } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", user?.id);

      if (followers && followers.length > 0) {
        const followerIds = followers.map(f => f.follower_id);
        await notifyFollowersResourceUploaded(
          followerIds,
          user?.id,
          user?.display_name || user?.email || 'Teacher',
          title.trim(),
          null,
          selectedCategory
        ).catch(err => console.warn('Failed to notify followers:', err));
      }

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
    } catch (error) {
      logEvent({
        event_type: "RESOURCE_UPLOAD_FAILED",
        user_id: user?.id,
        details: {
          title: title.trim(),
          category: selectedCategory,
          error: error.message,
        },
      });
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
        <ThemedText className="text-3xl font-bold text-cyan-400 mb-2">
          Upload Resource
        </ThemedText>
        <ThemedText className={`${textSecondary} mb-6`}>
          Share your materials. Get 20% off after 10 approved uploads!
        </ThemedText>

        {/* Title */}
        <View className="mb-4">
          <ThemedText className={`${textPrimary} font-semibold mb-2`}>Title *</ThemedText>
          <ThemedTextInput
            className={`${bgInput} ${textPrimary} px-4 py-3 rounded-xl border ${borderInput}`}
            placeholder="e.g., Algebra Worksheet - Quadratic Equations"
            placeholderTextColor={placeholderColor}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Description */}
        <View className="mb-4">
          <ThemedText className={`${textPrimary} font-semibold mb-2`}>
            Description (Optional)
          </ThemedText>
          <ThemedTextInput
            className={`${bgInput} ${textPrimary} px-4 py-3 rounded-xl border ${borderInput}`}
            placeholder="Brief description..."
            placeholderTextColor={placeholderColor}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Subject Selection */}
        <View className="mb-4">
          <ThemedText className={`${textPrimary} font-semibold mb-2`}>Subject *</ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {subjects.map((subject) => (
                <TouchableOpacity
                  key={subject.id}
                  className={`px-4 py-3 rounded-xl border ${
                    selectedSubject === subject.id
                      ? "bg-cyan-500 border-cyan-500"
                      : `${bgInput} ${borderInput}`
                  }`}
                  onPress={() => setSelectedSubject(subject.id)}
                >
                  <ThemedText
                    className={`font-semibold ${
                      selectedSubject === subject.id ? "text-white" : textSecondary
                    }`}
                  >
                    {subject.name}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Category */}
        <View className="mb-4">
          <ThemedText className={`${textPrimary} font-semibold mb-2`}>
            Category *
          </ThemedText>
          <View className="flex-row gap-2 flex-wrap">
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                className={`flex-row items-center px-4 py-3 rounded-xl border ${
                  selectedCategory === cat.value
                    ? "bg-cyan-500 border-cyan-500"
                    : `${bgInput} ${borderInput}`
                }`}
                onPress={() => setSelectedCategory(cat.value)}
              >
                <Ionicons
                  name={cat.icon}
                  size={18}
                  color={selectedCategory === cat.value ? "#fff" : "#9CA3AF"}
                />
                <ThemedText
                  className={`ml-2 font-semibold ${
                    selectedCategory === cat.value ? "text-white" : textSecondary
                  }`}
                >
                  {cat.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* File Picker */}
        <View className="mb-6">
          <ThemedText className={`${textPrimary} font-semibold mb-2`}>File *</ThemedText>
          <TouchableOpacity
            className={`${bgInput} border ${borderInput} rounded-xl p-4 flex-row items-center justify-between`}
            onPress={pickDocument}
          >
            <View className="flex-row items-center flex-1">
              <Ionicons name="cloud-upload" size={24} color="#22d3ee" />
              <ThemedText className={`${textSecondary} ml-3 flex-1`} numberOfLines={1}>
                {selectedFile ? selectedFile.name : "Choose a file..."}
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
          <ThemedText className={`${textSecondary} text-xs mt-1`}>
            Supported: PDF, PPT, PPTX, DOC, DOCX
          </ThemedText>
        </View>

        {/* Upload Button */}
        <TouchableOpacity
          className={`bg-cyan-500 p-4 rounded-xl mb-6 ${uploading ? "opacity-50" : ""}`}
          onPress={uploadResource}
          disabled={uploading}
        >
          {uploading ? (
            <View className="flex-row items-center justify-center">
              <ActivityIndicator color="#fff" />
              <ThemedText className="text-white font-bold ml-2">Uploading...</ThemedText>
            </View>
          ) : (
            <ThemedText className="text-white text-center font-bold text-lg">
              Upload Resource
            </ThemedText>
          )}
        </TouchableOpacity>
      </ScrollView>
      <Toast />
    </ScreenWrapper>
  );
}
