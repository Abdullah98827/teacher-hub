// app/admin/manage-comments.tsx
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import LogoHeader from "../../components/logoHeader";
import ScreenWrapper from "../../components/ScreenWrapper";
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
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
          <Text className="text-gray-400 mt-4">Loading comments...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <LogoHeader position="left" />

      <View className="flex-1 px-5">
        <Text className="text-3xl font-bold text-cyan-400 mb-4">
          Manage Comments
        </Text>

        {/* Search + Filter */}
        <TextInput
          className="bg-neutral-800 text-white px-4 py-3 rounded-xl mb-4 border border-neutral-700"
          placeholder="Search comments, users, or resources..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

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
          <View className="bg-neutral-900 p-8 rounded-xl border border-neutral-800">
            <Text className="text-center text-2xl mb-2">💬</Text>
            <Text className="text-center text-gray-400">
              {showDeletedOnly
                ? "No deleted comments found"
                : "No comments found"}
            </Text>
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
              <View className="bg-neutral-900 rounded-xl mb-4 border border-neutral-800 overflow-hidden">
                <View className="p-5">
                  <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-white font-semibold">
                      {item.first_name} {item.last_name}
                    </Text>
                    <Text className="text-gray-500 text-xs">
                      {formatDate(item.created_at)}
                    </Text>
                  </View>

                  <Text className="text-gray-300 mb-3 leading-5">
                    {item.comment_text}
                  </Text>

                  <Text className="text-gray-500 text-xs mb-3">
                    Resource: {item.resource_title}
                  </Text>

                  {item.is_deleted ? (
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        className="flex-1 bg-cyan-600 p-3 rounded-lg active:scale-95"
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
                        className="flex-1 bg-red-600 p-3 rounded-lg active:scale-95"
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
                      className="bg-red-600 p-3 rounded-lg active:scale-95"
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

        {/* Restore Modal */}
        <Modal
          visible={showRestoreConfirm}
          transparent
          animationType="fade"
          onRequestClose={() => setShowRestoreConfirm(false)}
        >
          <View className="flex-1 bg-black/50 justify-center items-center p-5">
            <View className="bg-neutral-900 rounded-2xl p-6 w-full max-w-sm border border-neutral-800">
              <Text className="text-white text-xl font-bold mb-2">
                Restore Comment?
              </Text>
              <Text className="text-gray-400 mb-6">
                This will make the comment visible to users again.
              </Text>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  className="flex-1 bg-neutral-800 py-3 rounded-xl"
                  onPress={() => {
                    setShowRestoreConfirm(false);
                    setSelectedCommentId(null);
                  }}
                  disabled={processing}
                >
                  <Text className="text-white text-center font-bold">
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`flex-1 bg-cyan-600 py-3 rounded-xl ${
                    processing ? "opacity-50" : ""
                  }`}
                  onPress={restoreComment}
                  disabled={processing}
                >
                  {processing ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-white text-center font-bold">
                      Restore
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Delete Modal */}
        <Modal
          visible={showDeleteConfirm}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDeleteConfirm(false)}
        >
          <View className="flex-1 bg-black/50 justify-center items-center p-5">
            <View className="bg-neutral-900 rounded-2xl p-6 w-full max-w-sm border border-neutral-800">
              <Text className="text-white text-xl font-bold mb-2">
                Delete Comment?
              </Text>
              <Text className="text-gray-400 mb-6">
                This will permanently delete the comment. This action cannot be
                undone.
              </Text>
              <View className="flex-row gap-3">
                <TouchableOpacity
                  className="flex-1 bg-neutral-800 py-3 rounded-xl"
                  onPress={() => {
                    setShowDeleteConfirm(false);
                    setSelectedCommentId(null);
                  }}
                  disabled={processing}
                >
                  <Text className="text-white text-center font-bold">
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`flex-1 bg-red-600 py-3 rounded-xl ${
                    processing ? "opacity-50" : ""
                  }`}
                  onPress={permanentlyDeleteComment}
                  disabled={processing}
                >
                  {processing ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-white text-center font-bold">
                      Delete
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>

      <Toast />
    </ScreenWrapper>
  );
}
