import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import AdminHeader from "../../components/AdminHeader";
import CommentCard from "../../components/CommentCard";
import ConfirmModal from "../../components/ConfirmModal";
import ScreenWrapper from "../../components/ScreenWrapper";
import SearchBar from "../../components/SearchBar";
import StatsSummary from "../../components/StatsSummary";
import { ThemedText } from "../../components/themed-text";
import { useAppTheme } from "../../hooks/useAppTheme";
import { supabase } from "../../supabase";
import { logEvent } from "../../utils/logging";
import { useAuth } from "../../contexts/AuthContext";

export default function ManageCommentsScreen() {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeletedOnly, setShowDeletedOnly] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedCommentId, setSelectedCommentId] = useState(null);
  const [processing, setProcessing] = useState(false);

  const { bgCardAlt, textPrimary, textSecondary } = useAppTheme();

  const fetchComments = useCallback(async () => {
    setLoading(true); // Ensure loading state is set at the start
    const { data: commentsData, error } = await supabase
      .from("resource_comments")
      .select(
        "id, comment_text, created_at, deleted_at, is_deleted, resource_id, user_id"
      )
      .order("created_at", { ascending: false });

    if (error) {
      Toast.show({
        type: "error",
        text1: "Failed to load comments",
        text2: error.message,
      });
      setLoading(false);
      setRefreshing(false);
      return;
    }

    // Avoid unnecessary requests if no comments
    if (!commentsData || commentsData.length === 0) {
      setComments([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    // Batch fetch user and resource info for performance
    const userIds = [...new Set(commentsData.map((c) => c.user_id))];
    const resourceIds = [...new Set(commentsData.map((c) => c.resource_id))];

    const [{ data: users }, { data: resources }] = await Promise.all([
      supabase
        .from("teachers")
        .select("id, first_name, last_name")
        .in("id", userIds),
      supabase
        .from("resources")
        .select("id, title")
        .in("id", resourceIds),
    ]);

    const userMap = (users || []).reduce((acc, u) => {
      acc[u.id] = u;
      return acc;
    }, {});
    const resourceMap = (resources || []).reduce((acc, r) => {
      acc[r.id] = r;
      return acc;
    }, {});

    const enrichedComments = (commentsData || []).map((comment) => {
      const user = userMap[comment.user_id] || {};
      const resource = resourceMap[comment.resource_id] || {};
      return {
        ...comment,
        first_name: user.first_name || "Unknown",
        last_name: user.last_name || "",
        resource_title: resource.title || "Unknown Resource",
      };
    });

    setComments(enrichedComments);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const restoreComment = async () => {
    if (!selectedCommentId) return;
    setProcessing(true);

    const { error } = await supabase
      .from("resource_comments")
      .update({ is_deleted: false, deleted_at: null })
      .eq("id", selectedCommentId);

    if (error) {
      logEvent({
        event_type: "COMMENT_RESTORE_FAILED",
        user_id: user?.id,
        target_id: selectedCommentId,
        target_table: "resource_comments",
        details: { error: error.message },
      });
      Toast.show({
        type: "error",
        text1: "Failed to restore comment",
        text2: error.message,
      });
    } else {
      logEvent({
        event_type: "COMMENT_RESTORED",
        user_id: user?.id,
        target_id: selectedCommentId,
        target_table: "resource_comments",
      });
      Toast.show({ type: "success", text1: "Comment restored" });
      fetchComments();
    }

    setShowRestoreConfirm(false);
    setSelectedCommentId(null);
    setProcessing(false);
  };

  const permanentlyDeleteComment = async () => {
    if (!selectedCommentId) return;
    setProcessing(true);

    const { error } = await supabase
      .from("resource_comments")
      .delete()
      .eq("id", selectedCommentId);

    if (error) {
      logEvent({
        event_type: "COMMENT_DELETION_FAILED",
        user_id: user?.id,
        target_id: selectedCommentId,
        target_table: "resource_comments",
        details: { error: error.message },
      });
      Toast.show({
        type: "error",
        text1: "Failed to delete comment",
        text2: error.message,
      });
    } else {
      logEvent({
        event_type: "COMMENT_DELETED",
        user_id: user?.id,
        target_id: selectedCommentId,
        target_table: "resource_comments",
      });
      Toast.show({ type: "success", text1: "Comment permanently deleted" });
      fetchComments();
    }

    setShowDeleteConfirm(false);
    setSelectedCommentId(null);
    setProcessing(false);
  };

  const filteredComments = comments.filter((c) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !c.comment_text.toLowerCase().includes(q) &&
        !c.first_name.toLowerCase().includes(q) &&
        !c.last_name.toLowerCase().includes(q) &&
        !c.resource_title.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    if (showDeletedOnly && !c.is_deleted) return false;
    return true;
  });

  if (loading) {
    return (
      <ScreenWrapper>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#22d3ee" />
        </View>
      </ScreenWrapper>
    );
  }

  const activeCount = comments.filter((c) => !c.is_deleted).length;
  const deletedCount = comments.filter((c) => c.is_deleted).length;

  return (
    <ScreenWrapper>
      <View className="flex-1 px-5 pt-4">
        <AdminHeader
          title="Manage Comments"
          subtitle={`${comments.length} total comment${comments.length !== 1 ? "s" : ""}`}
        />

        <StatsSummary
          stats={[
            { label: "Total", value: comments.length, color: "cyan" },
            { label: "Active", value: activeCount, color: "green" },
            { label: "Deleted", value: deletedCount, color: "red" },
          ]}
        />

        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search comments, users, or resources..."
        />

        <TouchableOpacity
          className={`flex-row items-center justify-center px-4 py-3 rounded-xl mb-4 ${
            showDeletedOnly
              ? "bg-red-500/20 border-2 border-red-500"
              : bgCardAlt
          }`}
          onPress={() => setShowDeletedOnly(!showDeletedOnly)}
        >
          <Ionicons
            name={showDeletedOnly ? "eye-off" : "eye"}
            size={18}
            color={showDeletedOnly ? "#ef4444" : "#9CA3AF"}
          />
          <ThemedText
            className={`font-semibold ml-2 ${
              showDeletedOnly ? "text-red-400" : textSecondary
            }`}
          >
            {showDeletedOnly ? "Showing Deleted Only" : "Show Deleted Only"}
          </ThemedText>
        </TouchableOpacity>

        {filteredComments.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <View className="bg-cyan-500/20 w-20 h-20 rounded-full items-center justify-center mb-4">
              <Ionicons name="chatbubble-outline" size={40} color="#22d3ee" />
            </View>
            <ThemedText className={`${textPrimary} text-xl font-bold mb-2`}>
              No Comments
            </ThemedText>
            <ThemedText className={`${textSecondary} text-center`}>
              {showDeletedOnly
                ? "No deleted comments found"
                : "No comments match your search"}
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={filteredComments}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchComments();
                }}
                tintColor="#22d3ee"
              />
            }
            renderItem={({ item }) => (
              <CommentCard
                comment={item}
                onRestore={
                  item.is_deleted
                    ? () => {
                        setSelectedCommentId(item.id);
                        setShowRestoreConfirm(true);
                      }
                    : undefined
                }
                onDelete={() => {
                  setSelectedCommentId(item.id);
                  setShowDeleteConfirm(true);
                }}
              />
            )}
          />
        )}
      </View>

      <ConfirmModal
        visible={showRestoreConfirm}
        title="Restore Comment?"
        message="This will make the comment visible to users again."
        confirmText="Restore"
        confirmColor="bg-cyan-500"
        onConfirm={restoreComment}
        onCancel={() => {
          setShowRestoreConfirm(false);
          setSelectedCommentId(null);
        }}
        isProcessing={processing}
      />

      <ConfirmModal
        visible={showDeleteConfirm}
        title="Delete Comment?"
        message="This will permanently delete the comment. This action cannot be undone."
        confirmText="Delete"
        confirmColor="bg-red-500"
        onConfirm={permanentlyDeleteComment}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setSelectedCommentId(null);
        }}
        isProcessing={processing}
      />

      <Toast />
    </ScreenWrapper>
  );
}
