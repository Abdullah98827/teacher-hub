import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import AdminHeader from "../../components/AdminHeader";
import ConfirmModal from "../../components/ConfirmModal";
import ScreenWrapper from "../../components/ScreenWrapper";
import StatsSummary from "../../components/StatsSummary";
import TeacherVerificationCard from "../../components/TeacherVerificationCard";
import { useAuth } from "../../contexts/AuthContext";
import { useUserRole } from "../../hooks/useUserRole";
import { supabase } from "../../supabase";

interface PendingTeacher {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  trn: string;
  photo_url: string | null;
}

export default function VerifyTeachersScreen() {
  const { user } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const router = useRouter();
  const [pendingUsers, setPendingUsers] = useState<PendingTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeletePhoto, setConfirmDeletePhoto] = useState<string | null>(
    null
  );
  const [processing, setProcessing] = useState(false);
  const [imageUrls, setImageUrls] = useState<Map<string, string>>(new Map());

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
    try {
      const { data, error } = await supabase
        .from("teachers")
        .select("*")
        .eq("verified", false)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setPendingUsers(data || []);
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Failed to load teachers",
        text2: error.message,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!roleLoading && isAdmin) {
      loadPendingUsers();
    }
  }, [isAdmin, roleLoading, loadPendingUsers]);

  useEffect(() => {
    const loadImageUrls = async () => {
      const urls = new Map<string, string>();

      for (const user of pendingUsers) {
        if (user.photo_url) {
          const { data, error } = await supabase.storage
            .from("teacher-passes")
            .createSignedUrl(user.photo_url, 3600);

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

  const handleApprove = useCallback(
    async (userId: string, photoUrl: string | null) => {
      setProcessing(true);

      try {
        const { error } = await supabase
          .from("teachers")
          .update({ verified: true })
          .eq("id", userId);

        if (error) throw error;

        if (photoUrl) {
          await supabase.storage.from("teacher-passes").remove([photoUrl]);
        }

        Toast.show({
          type: "success",
          text1: "Teacher verified successfully",
        });
        loadPendingUsers();
      } catch (error: any) {
        Toast.show({
          type: "error",
          text1: "Approval failed",
          text2: error.message,
        });
      } finally {
        setProcessing(false);
      }
    },
    [loadPendingUsers]
  );

  const executeReject = async () => {
    setProcessing(true);

    try {
      if (confirmDeletePhoto) {
        await supabase.storage
          .from("teacher-passes")
          .remove([confirmDeletePhoto]);
      }

      const { error } = await supabase
        .from("teachers")
        .delete()
        .eq("id", confirmDeleteId);

      if (error) throw error;

      Toast.show({
        type: "success",
        text1: "Teacher account removed",
      });

      loadPendingUsers();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Deletion failed",
        text2: error.message,
      });
    } finally {
      setConfirmDeleteId(null);
      setConfirmDeletePhoto(null);
      setProcessing(false);
    }
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
            <Text className="text-white text-xl font-bold mb-2">
              All Clear!
            </Text>
            <Text className="text-gray-400 text-center">
              No pending teacher verifications
            </Text>
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
