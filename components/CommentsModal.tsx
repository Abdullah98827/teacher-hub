// components/CommentsModal.tsx
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { supabase } from "../supabase";

interface Comment {
  id: string;
  comment_text: string;
  created_at: string;
  user_id: string;
  first_name: string;
  last_name: string;
  replies?: Comment[];
}

interface CommentsModalProps {
  visible: boolean;
  resourceId: string;
  resourceTitle: string;
  onClose: () => void;
}

export default function CommentsModal({
  visible,
  resourceId,
  resourceTitle,
  onClose,
}: CommentsModalProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);

  const fetchCurrentUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("id", user.id)
        .single();

      setUserRole(roleData?.role || null);
    }
  };

  const fetchComments = useCallback(async () => {
    if (!resourceId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("resource_comments")
      .select("id, comment_text, created_at, parent_comment_id, user_id")
      .eq("resource_id", resourceId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    if (error) {
      Toast.show({
        type: "error",
        text1: "Failed to load comments",
        text2: error.message,
      });
      setLoading(false);
      return;
    }

    const enrichedComments = await Promise.all(
      (data || []).map(async (comment) => {
        const { data: userData } = await supabase
          .from("teachers")
          .select("first_name, last_name")
          .eq("id", comment.user_id)
          .single();

        return {
          ...comment,
          first_name: userData?.first_name || "Unknown",
          last_name: userData?.last_name || "",
        };
      })
    );

    const mainComments = enrichedComments.filter((c) => !c.parent_comment_id);
    const repliesMap = new Map<string, Comment[]>();

    enrichedComments
      .filter((c) => c.parent_comment_id)
      .forEach((reply) => {
        if (!repliesMap.has(reply.parent_comment_id!)) {
          repliesMap.set(reply.parent_comment_id!, []);
        }
        repliesMap.get(reply.parent_comment_id!)?.push(reply as any);
      });

    const organized = mainComments.map((comment) => ({
      ...comment,
      replies: repliesMap.get(comment.id) || [],
    }));

    setComments(organized);
    setLoading(false);
  }, [resourceId]);

  useEffect(() => {
    if (visible) {
      fetchCurrentUser();
      fetchComments();
    }
  }, [visible, fetchComments]);

  const submitComment = async () => {
    if (!commentText.trim()) return;
    setSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      Toast.show({ type: "error", text1: "Please log in" });
      setSubmitting(false);
      return;
    }

    const { error } = await supabase.from("resource_comments").insert({
      resource_id: resourceId,
      user_id: user.id,
      comment_text: commentText.trim(),
      parent_comment_id: replyToId,
    });

    if (error) {
      Toast.show({
        type: "error",
        text1: "Failed to post comment",
        text2: error.message,
      });
      setSubmitting(false);
      return;
    }

    Toast.show({
      type: "success",
      text1: replyToId ? "Reply posted!" : "Comment posted!",
    });
    setCommentText("");
    setReplyToId(null);
    setSubmitting(false);
    fetchComments();
  };

  const handleDeletePress = (commentId: string) => {
    setDeleteCommentId(commentId);
    setShowDeleteConfirm(true);
  };

  const deleteComment = async () => {
    if (!deleteCommentId) return;
    setSubmitting(true);

    const { error } = await supabase
      .from("resource_comments")
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq("id", deleteCommentId);

    if (error) {
      Toast.show({
        type: "error",
        text1: "Failed to delete comment",
        text2: error.message,
      });
      setSubmitting(false);
      return;
    }

    Toast.show({ type: "success", text1: "Comment deleted" });
    setShowDeleteConfirm(false);
    setDeleteCommentId(null);
    setSubmitting(false);
    fetchComments();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const renderComment = (comment: Comment, isReply = false) => {
    const canDelete =
      currentUserId === comment.user_id ||
      userRole === "admin" ||
      userRole === "super_admin";

    return (
      <View
        key={comment.id}
        className={`mb-3 ${isReply ? "ml-8 border-l-2 border-neutral-700 pl-3" : ""}`}
      >
        <View className="bg-neutral-800 rounded-xl p-4">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center flex-1">
              <View className="bg-cyan-600 w-8 h-8 rounded-full items-center justify-center mr-2">
                <Text className="text-white font-bold text-sm">
                  {comment.first_name?.[0] || "?"}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-white font-semibold text-sm">
                  {comment.first_name} {comment.last_name}
                </Text>
                <Text className="text-gray-500 text-xs">
                  {formatDate(comment.created_at)}
                </Text>
              </View>
            </View>

            {canDelete && (
              <TouchableOpacity
                onPress={() => handleDeletePress(comment.id)}
                className="p-1"
              >
                <Ionicons name="trash" size={16} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>

          <Text className="text-gray-300 text-sm leading-5">
            {comment.comment_text}
          </Text>

          {!isReply && (
            <TouchableOpacity
              className="mt-2 flex-row items-center"
              onPress={() => setReplyToId(comment.id)}
            >
              <Ionicons name="arrow-undo" size={14} color="#22d3ee" />
              <Text className="text-cyan-400 text-xs ml-1">Reply</Text>
            </TouchableOpacity>
          )}
        </View>

        {!isReply &&
          comment.replies &&
          comment.replies.map((reply) => renderComment(reply, true))}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        className="flex-1 bg-black"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View className="bg-neutral-900 p-4 pt-12 border-b border-neutral-800">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={onClose} className="p-2">
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text className="text-white font-bold text-lg flex-1 text-center mr-10">
              Comments
            </Text>
          </View>
          <Text className="text-gray-400 text-sm mt-2" numberOfLines={1}>
            {resourceTitle}
          </Text>
        </View>

        {/* Comments list */}
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#22d3ee" />
          </View>
        ) : comments.length === 0 ? (
          <View className="flex-1 items-center justify-center px-5">
            <Text className="text-6xl mb-4">💬</Text>
            <Text className="text-gray-400 text-center">
              No comments yet. Be the first to share your thoughts!
            </Text>
          </View>
        ) : (
          <FlatList
            data={comments}
            renderItem={({ item }) => renderComment(item)}
            keyExtractor={(item) => item.id}
            contentContainerClassName="p-4"
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Reply banner */}
        {replyToId && (
          <View className="bg-cyan-900/20 px-4 py-2 flex-row items-center justify-between border-t border-cyan-800">
            <Text className="text-cyan-400 text-sm">
              Replying to comment...
            </Text>
            <TouchableOpacity onPress={() => setReplyToId(null)}>
              <Ionicons name="close-circle" size={20} color="#22d3ee" />
            </TouchableOpacity>
          </View>
        )}

        {/* Input box */}
        <View className="bg-neutral-900 p-4 border-t border-neutral-800">
          <View className="flex-row items-end gap-2">
            <TextInput
              className="flex-1 bg-neutral-800 text-white px-4 py-3 rounded-xl border border-neutral-700"
              placeholder="Add a comment..."
              placeholderTextColor="#9CA3AF"
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              className={`bg-cyan-500 w-12 h-12 rounded-xl items-center justify-center ${
                submitting || !commentText.trim() ? "opacity-50" : ""
              }`}
              onPress={submitComment}
              disabled={submitting || !commentText.trim()}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="send" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Delete confirmation modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center p-5">
          <View className="bg-neutral-900 rounded-2xl p-6 w-full max-w-sm">
            <Text className="text-white text-xl font-bold mb-2">
              Delete Comment?
            </Text>
            <Text className="text-gray-400 mb-6">
              This action cannot be undone.
            </Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-neutral-800 py-3 rounded-xl"
                onPress={() => {
                  setShowDeleteConfirm(false);
                  setDeleteCommentId(null);
                }}
                disabled={submitting}
              >
                <Text className="text-white text-center font-bold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 bg-red-600 py-3 rounded-xl ${
                  submitting ? "opacity-50" : ""
                }`}
                onPress={deleteComment}
                disabled={submitting}
              >
                {submitting ? (
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

      <Toast />
    </Modal>
  );
}
