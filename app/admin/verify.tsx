import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Image,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import LogoHeader from "../../components/logoHeader";
import ScreenWrapper from "../../components/ScreenWrapper";
import { supabase } from "../../supabase";
import { useUserRole } from "../hooks/useUserRole";

interface PendingTeacher {
  id: string;
  email: string;
  trn: string;
  photo_url: string | null;
  [key: string]: any;
}

export default function VerifyTeachersScreen() {
  const [pendingUsers, setPendingUsers] = useState<PendingTeacher[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeletePhoto, setConfirmDeletePhoto] = useState<string | null>(
    null
  );
  const { role, loading: roleLoading } = useUserRole();
  const router = useRouter();

  const showToast = (
    type: "success" | "error",
    title: string,
    message: string
  ) => {
    Toast.show({ type, text1: title, text2: message });
  };

  const checkAccess = useCallback(() => {
    if (role !== "admin") {
      showToast("error", "Access Denied", "You are not an admin");
      router.replace("/(tabs)");
      return false;
    }
    return true;
  }, [role, router]);

  const loadPendingUsers = useCallback(async () => {
    const { data, error } = await supabase
      .from("teachers")
      .select("*")
      .eq("verified", false)
      .order("created_at", { ascending: false });

    if (error) {
      showToast("error", "Load Failed", error.message);
      return;
    }

    setPendingUsers(data || []);
  }, []);

  useEffect(() => {
    if (roleLoading) return;
    if (role === "admin") {
      loadPendingUsers();
    } else {
      checkAccess();
    }
  }, [role, roleLoading, loadPendingUsers, checkAccess]);

  const getPhotoUrl = (photoPath: string | null) => {
    if (!photoPath) return null;
    const { data } = supabase.storage
      .from("teacher-passes")
      .getPublicUrl(photoPath);
    return data?.publicUrl || null;
  };

  const handleApprove = useCallback(
    async (userId: string, photoUrl: string | null) => {
      const { error } = await supabase
        .from("teachers")
        .update({ verified: true })
        .eq("id", userId);

      if (error) {
        showToast("error", "Approval Failed", error.message);
        return;
      }

      if (photoUrl) {
        const { error: deleteError } = await supabase.storage
          .from("teacher-passes")
          .remove([photoUrl]);
        if (deleteError) {
          console.error("Photo delete failed:", deleteError.message);
          showToast("error", "Photo Delete Failed", deleteError.message);
        }
      }

      showToast("success", "Approved", "Teacher verified successfully.");
      loadPendingUsers();
    },
    [loadPendingUsers]
  );

  const confirmReject = useCallback(
    (userId: string, photoUrl: string | null) => {
      setConfirmDeleteId(userId);
      setConfirmDeletePhoto(photoUrl);
    },
    []
  );

  const executeReject = useCallback(async () => {
    if (confirmDeletePhoto) {
      const { error: deleteError } = await supabase.storage
        .from("teacher-passes")
        .remove([confirmDeletePhoto]);
      if (deleteError) {
        console.error("Photo delete failed:", deleteError.message);
        showToast("error", "Photo Delete Failed", deleteError.message);
      }
    }

    const { error } = await supabase
      .from("teachers")
      .delete()
      .eq("id", confirmDeleteId);

    if (error) {
      showToast("error", "Deletion Failed", error.message);
    } else {
      showToast("success", "Account Deleted", "Teacher account removed.");
      loadPendingUsers();
    }

    setConfirmDeleteId(null);
    setConfirmDeletePhoto(null);
  }, [confirmDeleteId, confirmDeletePhoto, loadPendingUsers]);

  const renderUser = ({ item }: { item: PendingTeacher }) => {
    const imageUrl = getPhotoUrl(item.photo_url);

    return (
      <View className="bg-white p-5 rounded-xl mb-4 shadow-lg">
        <Text className="text-xs text-gray-500">Email</Text>
        <Text className="text-base font-semibold mb-3">
          {item.email || "No email"}
        </Text>
        <Text className="text-xs text-gray-500">TRN</Text>
        <Text className="text-lg font-bold mb-3">{item.trn}</Text>
        <Text className="text-xs text-gray-500">ID</Text>
        <Text className="text-xs mb-3">{item.id}</Text>

        {imageUrl ? (
          <View className="mb-3">
            <Text className="text-xs text-gray-500 mb-2">Photo</Text>
            <Image
              source={{ uri: imageUrl }}
              className="w-full h-48 rounded-lg bg-gray-200"
              resizeMode="contain"
            />
          </View>
        ) : (
          <Text className="text-xs text-red-500 mb-3">No photo available</Text>
        )}

        <View className="flex-row gap-3">
          <TouchableOpacity
            className="flex-1 bg-red-500 p-3 rounded-lg"
            onPress={() => confirmReject(item.id, item.photo_url)}
          >
            <Text className="text-white text-center font-bold">Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-green-600 p-3 rounded-lg"
            onPress={() => handleApprove(item.id, item.photo_url)}
          >
            <Text className="text-white text-center font-bold">Approve</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <ScreenWrapper>
      <LogoHeader position="left" />

      <View className="w-full max-w-3xl mx-auto">
        <View className="mb-6">
          <Text className="text-3xl font-bold text-cyan-400 mb-2">
            Verify Teachers
          </Text>
          <Text className="text-gray-400">
            {pendingUsers.length} pending verification
            {pendingUsers.length !== 1 ? "s" : ""}
          </Text>
        </View>

        <FlatList
          data={pendingUsers}
          renderItem={renderUser}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={
            <View className="bg-white p-8 rounded-xl shadow-lg">
              <Text className="text-center text-gray-500">
                No pending verifications
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await loadPendingUsers();
                setRefreshing(false);
              }}
            />
          }
        />
      </View>

      {confirmDeleteId && (
        <View className="absolute inset-0 bg-black/50 justify-center items-center z-50 px-5">
          <View className="bg-white rounded-xl p-5 w-full max-w-md">
            <Text className="text-lg font-bold mb-3 text-red-600">
              Confirm Deletion
            </Text>
            <Text className="text-gray-700 mb-4">
              This will permanently delete the teacher’s account and photo. Are
              you sure?
            </Text>
            <View className="flex-row justify-end gap-3">
              <TouchableOpacity
                className="px-4 py-2 bg-gray-300 rounded-lg"
                onPress={() => {
                  setConfirmDeleteId(null);
                  setConfirmDeletePhoto(null);
                }}
              >
                <Text className="text-gray-800 font-semibold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="px-4 py-2 bg-red-600 rounded-lg"
                onPress={executeReject}
              >
                <Text className="text-white font-semibold">Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <Toast />
    </ScreenWrapper>
  );
}
