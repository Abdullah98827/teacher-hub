// app/admin/verify.tsx
// Screen where admins approve or reject teacher verification requests
// Teachers need to upload their teacher ID to get verified

import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import AdminHeader from "../../components/AdminHeader";
import ConfirmModal from "../../components/ConfirmModal";
import EmptyState from "../../components/EmptyState";
import LogoHeader from "../../components/logoHeader";
import ScreenWrapper from "../../components/ScreenWrapper";
import { supabase } from "../../supabase";
import { useUserRole } from "../hooks/useUserRole";

interface PendingTeacher {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  trn: string;
  photo_url: string | null;
}

export default function VerifyTeachersScreen() {
  const [pendingUsers, setPendingUsers] = useState<PendingTeacher[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeletePhoto, setConfirmDeletePhoto] = useState<string | null>(
    null
  );
  const [processing, setProcessing] = useState(false);
  const [imageUrls, setImageUrls] = useState<Map<string, string>>(new Map());
  const { role, loading: roleLoading } = useUserRole();
  const router = useRouter();

  // Fetch all teachers waiting for verification
  const loadPendingUsers = useCallback(async () => {
    const { data, error } = await supabase
      .from("teachers")
      .select("*")
      .eq("verified", false)
      .order("created_at", { ascending: false });

    if (error) {
      Toast.show({
        type: "error",
        text1: "Load Failed",
        text2: error.message,
      });
      return;
    }

    setPendingUsers(data || []);
  }, []);

  // Check if user is admin, redirect if not
  useEffect(() => {
    if (roleLoading) return;
    if (role === "admin") {
      loadPendingUsers();
    } else {
      router.replace("/(tabs)");
    }
  }, [role, roleLoading, loadPendingUsers, router]);

  // Load signed URLs for all photos when users change
  useEffect(() => {
    const loadImageUrls = async () => {
      const urls = new Map<string, string>();

      for (const user of pendingUsers) {
        if (user.photo_url) {
          const { data, error } = await supabase.storage
            .from("teacher-passes")
            .createSignedUrl(user.photo_url, 3600); // Valid for 1 hour

          if (!error && data?.signedUrl) {
            urls.set(user.id, data.signedUrl);
          }
        }
      }

      setImageUrls(urls);
    };

    if (pendingUsers.length > 0) {
      loadImageUrls();
    }
  }, [pendingUsers]);

  // Approves teacher and delete their uploaded ID photo
  const handleApprove = useCallback(
    async (userId: string, photoUrl: string | null) => {
      setProcessing(true);

      const { error } = await supabase
        .from("teachers")
        .update({ verified: true })
        .eq("id", userId);

      if (error) {
        Toast.show({
          type: "error",
          text1: "Approval Failed",
          text2: error.message,
        });
        setProcessing(false);
        return;
      }

      // Deletes the photo after approval since we don't need it anymore
      if (photoUrl) {
        await supabase.storage.from("teacher-passes").remove([photoUrl]);
      }

      Toast.show({
        type: "success",
        text1: "Approved",
        text2: "Teacher verified successfully",
      });
      setProcessing(false);
      loadPendingUsers();
    },
    [loadPendingUsers]
  );

  // Reject teacher deletes their account and photo permanently
  const executeReject = async () => {
    setProcessing(true);

    if (confirmDeletePhoto) {
      await supabase.storage
        .from("teacher-passes")
        .remove([confirmDeletePhoto]);
    }

    const { error } = await supabase
      .from("teachers")
      .delete()
      .eq("id", confirmDeleteId);

    if (error) {
      Toast.show({
        type: "error",
        text1: "Deletion Failed",
        text2: error.message,
      });
      setProcessing(false);
      return;
    }

    Toast.show({
      type: "success",
      text1: "Account Deleted",
      text2: "Teacher account removed",
    });

    setConfirmDeleteId(null);
    setConfirmDeletePhoto(null);
    setProcessing(false);
    loadPendingUsers();
  };

  // Render each teacher verification card
  const renderUser = ({ item }: { item: PendingTeacher }) => {
    const imageUrl = imageUrls.get(item.id);

    return (
      <View className="bg-neutral-900 rounded-xl p-5 mb-4 border border-neutral-800">
        <Text className="text-xs text-gray-500">Email</Text>
        <Text className="text-base font-semibold text-white mb-3">
          {item.email}
        </Text>

        <Text className="text-xs text-gray-500">Name</Text>
        <Text className="text-base text-white mb-3">
          {item.first_name} {item.last_name}
        </Text>

        <Text className="text-xs text-gray-500">TRN</Text>
        <Text className="text-lg font-bold text-white mb-3">{item.trn}</Text>

        {/* Teacher pass photo if uploaded */}
        {imageUrl ? (
          <View className="mb-3">
            <Text className="text-xs text-gray-500 mb-2">
              Teacher Pass Photo
            </Text>
            <Image
              source={{ uri: imageUrl }}
              className="w-full h-48 rounded-lg bg-gray-200"
              resizeMode="contain"
            />
          </View>
        ) : (
          <Text className="text-xs text-red-500 mb-3">
            ⚠️ No photo available
          </Text>
        )}

        {/* Approve/Reject buttons */}
        <View className="flex-row gap-3">
          <TouchableOpacity
            className={`flex-1 bg-red-600 p-3 rounded-lg ${processing ? "opacity-50" : ""}`}
            onPress={() => {
              setConfirmDeleteId(item.id);
              setConfirmDeletePhoto(item.photo_url);
            }}
            disabled={processing}
          >
            <Text className="text-white text-center font-bold">Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 bg-green-600 p-3 rounded-lg ${processing ? "opacity-50" : ""}`}
            onPress={() => handleApprove(item.id, item.photo_url)}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text className="text-white text-center font-bold">Approve</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (roleLoading) {
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

      <View className="flex-1 px-5">
        <AdminHeader
          title="Verify Teachers"
          subtitle={`${pendingUsers.length} pending verification${pendingUsers.length !== 1 ? "s" : ""}`}
          showBack={false}
        />

        {pendingUsers.length === 0 ? (
          <EmptyState icon="✓" message="No pending verifications" />
        ) : (
          <FlatList
            data={pendingUsers}
            renderItem={renderUser}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={async () => {
                  setRefreshing(true);
                  await loadPendingUsers();
                  setRefreshing(false);
                }}
                tintColor="#22d3ee"
              />
            }
          />
        )}
      </View>

      {/* Delete confirmation modal */}
      <ConfirmModal
        visible={confirmDeleteId !== null}
        title="Confirm Deletion"
        message="This will permanently delete the teacher's account and photo. Are you sure?"
        confirmText="Delete"
        confirmColor="bg-red-600"
        onConfirm={executeReject}
        onCancel={() => {
          setConfirmDeleteId(null);
          setConfirmDeletePhoto(null);
        }}
        isProcessing={processing}
      />

      <Toast />
    </ScreenWrapper>
  );
}
