import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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
import SearchBar from "../../components/SearchBar";
import { supabase } from "../../supabase";

interface Comment {
  id: string;
  comment_text: string;
  created_at: string;
  deleted_at: string | null;
  is_deleted: boolean;
  resource_id: string;
  resource_title: string;
  user_id: string;
  first_name: string;
  last_name: string;
}

export default function ManageCommentsScreen() {
  // State for comments list and UI controls
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeletedOnly, setShowDeletedOnly] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(
    null
  );
  const [processing, setProcessing] = useState(false);

  // Loads all comments from database with user and resource info
  const fetchComments = useCallback(async () => {
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

    // Gets the users name and resource titles for each comment
    const enrichedComments = await Promise.all(
      (commentsData || []).map(async (comment) => {
        const { data: userData } = await supabase
          .from("teachers")
          .select("first_name, last_name")
          .eq("id", comment.user_id)
          .single();

        const { data: resourceData } = await supabase
          .from("resources")
          .select("title")
          .eq("id", comment.resource_id)
          .single();

        return {
          ...comment,
          first_name: userData?.first_name || "Unknown",
          last_name: userData?.last_name || "",
          resource_title: resourceData?.title || "Unknown Resource",
        };
      })
    );

    setComments(enrichedComments);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Restore a deleted comment back to visible
  const restoreComment = async () => {
    if (!selectedCommentId) return;
    setProcessing(true);

    const { error } = await supabase
      .from("resource_comments")
      .update({ is_deleted: false, deleted_at: null })
      .eq("id", selectedCommentId);

    if (error) {
      Toast.show({
        type: "error",
        text1: "Failed to restore comment",
        text2: error.message,
      });
    } else {
      Toast.show({ type: "success", text1: "Comment restored" });
      fetchComments();
    }

    setShowRestoreConfirm(false);
    setSelectedCommentId(null);
    setProcessing(false);
  };

  // Permanently delete a comment from database
  const permanentlyDeleteComment = async () => {
    if (!selectedCommentId) return;
    setProcessing(true);

    const { error } = await supabase
      .from("resource_comments")
      .delete()
      .eq("id", selectedCommentId);

    if (error) {
      Toast.show({
        type: "error",
        text1: "Failed to delete comment",
        text2: error.message,
      });
    } else {
      Toast.show({ type: "success", text1: "Comment permanently deleted" });
      fetchComments();
    }

    setShowDeleteConfirm(false);
    setSelectedCommentId(null);
    setProcessing(false);
  };

  // Format timestamp into readable date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Filter comments based on search and deleted status
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

  // Show loading spinner while fetching data
  if (loading) {
    return (
      <ScreenWrapper>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#22d3ee" />
          <Text className="text-gray-400 mt-4">Loading comments...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <LogoHeader position="left" />
      <View className="flex-1 px-5">
        <AdminHeader title="Manage Comments" />

        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search comments, users, or resources..."
        />

        {/* Toggle to show only deleted comments */}
        <TouchableOpacity
          className={`px-4 py-2 rounded-xl mb-4 ${
            showDeletedOnly
              ? "bg-red-900/30 border border-red-600"
              : "bg-neutral-800"
          }`}
          onPress={() => setShowDeletedOnly(!showDeletedOnly)}
        >
          <Text
            className={`font-semibold ${showDeletedOnly ? "text-red-400" : "text-gray-400"}`}
          >
            {showDeletedOnly ? "Showing Deleted Only" : "Show Deleted Only"}
          </Text>
        </TouchableOpacity>

        {filteredComments.length === 0 ? (
          <EmptyState
            icon="💬"
            message={
              showDeletedOnly
                ? "No deleted comments found"
                : "No comments found"
            }
          />
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
              <View className="bg-neutral-900 rounded-xl mb-4 border border-neutral-800 overflow-hidden">
                <View className="p-5">
                  {/* Comment header with user name and date */}
                  <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-white font-semibold">
                      {item.first_name} {item.last_name}
                    </Text>
                    <Text className="text-gray-500 text-xs">
                      {formatDate(item.created_at)}
                    </Text>
                  </View>

                  {/* Comment text */}
                  <Text className="text-gray-300 mb-3 leading-5">
                    {item.comment_text}
                  </Text>

                  {/* Resource title */}
                  <Text className="text-gray-500 text-xs mb-3">
                    Resource: {item.resource_title}
                  </Text>

                  {/* Action buttons - different for deleted vs active comments */}
                  {item.is_deleted ? (
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        className="flex-1 bg-cyan-600 p-3 rounded-lg"
                        onPress={() => {
                          setSelectedCommentId(item.id);
                          setShowRestoreConfirm(true);
                        }}
                      >
                        <Text className="text-white text-center font-bold">
                          Restore
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="flex-1 bg-red-600 p-3 rounded-lg"
                        onPress={() => {
                          setSelectedCommentId(item.id);
                          setShowDeleteConfirm(true);
                        }}
                      >
                        <Text className="text-white text-center font-bold">
                          Delete Forever
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      className="bg-red-600 p-3 rounded-lg"
                      onPress={() => {
                        setSelectedCommentId(item.id);
                        setShowDeleteConfirm(true);
                      }}
                    >
                      <Text className="text-white text-center font-bold">
                        Delete
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          />
        )}

        {/* Restore confirmation modal */}
        <ConfirmModal
          visible={showRestoreConfirm}
          title="Restore Comment?"
          message="This will make the comment visible to users again."
          confirmText="Restore"
          confirmColor="bg-cyan-600"
          onConfirm={restoreComment}
          onCancel={() => {
            setShowRestoreConfirm(false);
            setSelectedCommentId(null);
          }}
          isProcessing={processing}
        />

        {/* Delete confirmation modal */}
        <ConfirmModal
          visible={showDeleteConfirm}
          title="Delete Comment?"
          message="This will permanently delete the comment. This action cannot be undone."
          confirmText="Delete"
          confirmColor="bg-red-600"
          onConfirm={permanentlyDeleteComment}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setSelectedCommentId(null);
          }}
          isProcessing={processing}
        />
      </View>
      <Toast />
    </ScreenWrapper>
  );
}
