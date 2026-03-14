import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import AdminHeader from "../../components/AdminHeader";
import ConfirmModal from "../../components/ConfirmModal";
import ScreenWrapper from "../../components/ScreenWrapper";
import StatsSummary from "../../components/StatsSummary";
import TeacherVerificationCard from "../../components/TeacherVerificationCard";
import { ThemedText } from '../../components/themed-text';
import { useAuth } from "../../contexts/AuthContext";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useUserRole } from "../../hooks/useUserRole";
import { supabase } from "../../supabase";

export default function VerifyTeachersScreen() {
  const { user } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const router = useRouter();
  const { textSecondary } = useAppTheme();
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmDeletePhoto, setConfirmDeletePhoto] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [imageUrls, setImageUrls] = useState(new Map());

  const isAdmin = role === "admin";

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      Toast.show({
        type: "error",
        text1: "Access Denied",
        text2: "Admin privileges required",
      });
      router.back();
    }
  }, [isAdmin, roleLoading, router]);

  const loadPendingUsers = useCallback(async () => {
    const { data, error } = await supabase
      .from("teachers")
      .select("*")
      .eq("verified", false)
      .order("created_at", { ascending: false });

    if (error) {
      Toast.show({
        type: "error",
        text1: "Failed to load teachers",
        text2: error.message,
      });
    } else {
      setPendingUsers(data || []);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    if (!roleLoading && isAdmin) {
      loadPendingUsers();
    }
  }, [isAdmin, roleLoading, loadPendingUsers]);

  useEffect(() => {
    const loadImageUrls = async () => {
      const urls = new Map();

      for (const teacher of pendingUsers) {
        if (teacher.photo_url) {
          const { data, error } = await supabase.storage
            .from("teacher-passes")
            .createSignedUrl(teacher.photo_url, 3600);

          if (!error && data?.signedUrl) {
            urls.set(teacher.id, data.signedUrl);
          }
        }
      }

      setImageUrls(urls);
    };

    if (pendingUsers.length > 0) {
      loadImageUrls();
    }
  }, [pendingUsers]);

  const handleApprove = useCallback(
    async (userId, photoUrl) => {
      setProcessing(true);

      const { error } = await supabase
        .from("teachers")
        .update({ verified: true })
        .eq("id", userId);

      if (error) {
        Toast.show({
          type: "error",
          text1: "Approval failed",
          text2: error.message,
        });
      } else {
        if (photoUrl) {
          await supabase.storage.from("teacher-passes").remove([photoUrl]);
        }
        Toast.show({ type: "success", text1: "Teacher verified successfully" });
        loadPendingUsers();
      }

      setProcessing(false);
    },
    [loadPendingUsers]
  );

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
        text1: "Deletion failed",
        text2: error.message,
      });
    } else {
      Toast.show({ type: "success", text1: "Teacher account removed" });
      loadPendingUsers();
    }

    setConfirmDeleteId(null);
    setConfirmDeletePhoto(null);
    setProcessing(false);
  };

  if (loading || roleLoading) {
    return (
      <ScreenWrapper>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#22d3ee" />
        </View>
      </ScreenWrapper>
    );
  }

  if (!isAdmin) return null;

  return (
    <ScreenWrapper>
      <View className="flex-1 px-5 pt-4">
        <AdminHeader
          title="Verify Teachers"
          subtitle={`${pendingUsers.length} pending verification${pendingUsers.length !== 1 ? "s" : ""}`}
        />

        <StatsSummary
          stats={[
            { label: "Pending", value: pendingUsers.length, color: "orange" },
          ]}
        />

        {pendingUsers.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <View className="bg-green-500/20 w-20 h-20 rounded-full items-center justify-center mb-4">
              <Ionicons name="checkmark-circle" size={40} color="#22c55e" />
            </View>
            <ThemedText className="text-white text-xl font-bold mb-2">All Clear!</ThemedText>
            <ThemedText className={`${textSecondary} text-center`}>
              No pending teacher verifications
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={pendingUsers}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  loadPendingUsers();
                }}
                tintColor="#22d3ee"
              />
            }
            renderItem={({ item }) => (
              <TeacherVerificationCard
                teacher={item}
                imageUrl={imageUrls.get(item.id)}
                onApprove={() => handleApprove(item.id, item.photo_url)}
                onReject={() => {
                  setConfirmDeleteId(item.id);
                  setConfirmDeletePhoto(item.photo_url);
                }}
                processing={processing}
              />
            )}
          />
        )}
      </View>

      <ConfirmModal
        visible={confirmDeleteId !== null}
        title="Reject Teacher?"
        message="This will permanently delete the teacher's account and photo. This action cannot be undone."
        confirmText="Reject & Delete"
        confirmColor="bg-red-500"
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
