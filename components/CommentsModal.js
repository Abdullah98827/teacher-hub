import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Toast from "react-native-toast-message";
import { useAppTheme } from "../hooks/useAppTheme";
import { supabase } from "../supabase";
import ProfilePicture from "./ProfilePicture";
import UserProfileModal from "./UserProfileModal";
import { ThemedTextInput } from './themed-textinput';

export default function CommentsModal({
  visible,
  resourceId,
  resourceTitle,
  onClose,
}) {
  const router = useRouter();
  const {
    bg,
    bgCard,
    bgCardAlt,
    bgInput,
    border,
    borderInput,
    textPrimary,
    textSecondary,
    textMuted,
    placeholderColor,
    isDark,
  } = useAppTheme();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [replyToId, setReplyToId] = useState(null);
  const [replyToUser, setReplyToUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteCommentId, setDeleteCommentId] = useState(null);
  const [expandedThreads, setExpandedThreads] = useState(new Set());
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [showDmSuggestion, setShowDmSuggestion] = useState(false);
  const [dmSuggestionUsers, setDmSuggestionUsers] = useState(null);
  const pendingNavPath = useRef(null);

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

  const checkForDmSuggestion = useCallback((mainComment, replies) => {
    if (!replies || replies.length < 3) return false;

    const originalCommenterId = mainComment.user_id;
    let exchanges = 0;
    let previousUserId = originalCommenterId;

    for (const reply of replies) {
      if (reply.user_id !== previousUserId) {
        exchanges++;
        previousUserId = reply.user_id;
      }

      if (exchanges >= 3) {
        const user1 = originalCommenterId;
        const user2 = replies.find((r) => r.user_id !== user1)?.user_id;

        if (
          user1 &&
          user2 &&
          (currentUserId === user1 || currentUserId === user2)
        ) {
          const user1Name =
            user1 === mainComment.user_id
              ? `${mainComment.first_name} ${mainComment.last_name}`
              : `${replies.find((r) => r.user_id === user1)?.first_name} ${replies.find((r) => r.user_id === user1)?.last_name}`;

          const user2Name =
            user2 === mainComment.user_id
              ? `${mainComment.first_name} ${mainComment.last_name}`
              : `${replies.find((r) => r.user_id === user2)?.first_name} ${replies.find((r) => r.user_id === user2)?.last_name}`;

          setDmSuggestionUsers({
            user1: { id: user1, name: user1Name || "Unknown" },
            user2: { id: user2, name: user2Name || "Unknown" },
          });
          return true;
        }
      }
    }

    return false;
  }, [currentUserId]);

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
          .select("first_name, last_name, profile_picture_url")
          .eq("id", comment.user_id)
          .single();

        return {
          ...comment,
          first_name: userData?.first_name || "Unknown",
          last_name: userData?.last_name || "",
          profile_picture_url: userData?.profile_picture_url || null,
        };
      })
    );

    const mainComments = enrichedComments.filter((c) => !c.parent_comment_id);
    const repliesMap = new Map();

    enrichedComments
      .filter((c) => c.parent_comment_id)
      .forEach((reply) => {
        if (!repliesMap.has(reply.parent_comment_id)) {
          repliesMap.set(reply.parent_comment_id, []);
        }
        repliesMap.get(reply.parent_comment_id).push(reply);
      });

    const organized = mainComments.map((comment) => {
      const replies = repliesMap.get(comment.id) || [];

      if (checkForDmSuggestion(comment, replies)) {
        setShowDmSuggestion(true);
      }

      return {
        ...comment,
        replies,
      };
    });

    setComments(organized);
    setLoading(false);
  }, [resourceId, checkForDmSuggestion]);

  useEffect(() => {
    if (visible) {
      fetchCurrentUser();
      fetchComments();
    } else if (pendingNavPath.current) {
      // Modal has closed — now safe to navigate
      const path = pendingNavPath.current;
      pendingNavPath.current = null;
      router.push(path);
    }
  }, [visible, fetchComments, router]);

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
    setReplyToUser(null);
    setSubmitting(false);
    fetchComments();
  };

  const handleDeletePress = (commentId) => {
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

  const toggleThread = (commentId) => {
    setExpandedThreads((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  const handleUserPress = (userId) => {
    if (userId === currentUserId) return;
    // Set userId first, then open modal on next tick to avoid race
    setSelectedUserId(userId);
    setTimeout(() => setShowProfileModal(true), 0);
  };

  const handleDmSuggestionAccept = () => {
    if (!dmSuggestionUsers) return;
    const otherUser =
      dmSuggestionUsers.user1.id === currentUserId
        ? dmSuggestionUsers.user2
        : dmSuggestionUsers.user1;
    pendingNavPath.current = `/dm/${otherUser.id}`;
    setShowDmSuggestion(false);
    onClose();
  };

  const formatDate = (dateString) => {
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

  const renderComment = (comment, isReply = false) => {
    const canDelete =
      currentUserId === comment.user_id ||
      userRole === "admin" ||
      userRole === "super_admin";

    const hasReplies =
      !isReply && comment.replies && comment.replies.length > 0;
    const isExpanded = expandedThreads.has(comment.id);

    return (
      <View
        key={comment.id}
        className={`mb-3 ${isReply ? "ml-8 border-l-2 border-cyan-500/30 pl-3" : ""}`}
      >
        <View className={`${bgCardAlt} rounded-xl p-4`}>
          <View className="flex-row items-center justify-between mb-2">
            <TouchableOpacity
              className="flex-row items-center flex-1"
              onPress={() => handleUserPress(comment.user_id)}
              activeOpacity={comment.user_id === currentUserId ? 1 : 0.6}
            >
              <ProfilePicture
                imageUrl={comment.profile_picture_url}
                firstName={comment.first_name}
                lastName={comment.last_name}
                size="sm"
              />
              <View className="flex-1 ml-2">
                <Text className="text-cyan-400 font-semibold text-sm">
                  {comment.first_name} {comment.last_name}
                </Text>
                <Text className={`${textMuted} text-xs`}>
                  {formatDate(comment.created_at)}
                </Text>
              </View>
            </TouchableOpacity>

            {canDelete && (
              <TouchableOpacity
                onPress={() => handleDeletePress(comment.id)}
                className="p-1"
              >
                <Ionicons name="trash" size={16} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>

          <Text className={`${textSecondary} text-sm leading-5`}>
            {comment.comment_text}
          </Text>

          <View className="flex-row items-center mt-3 gap-4">
            <TouchableOpacity
              className="flex-row items-center"
              onPress={() => {
                setReplyToId(
                  isReply ? comment.parent_comment_id || comment.id : comment.id
                );
                setReplyToUser(`${comment.first_name} ${comment.last_name}`);
              }}
            >
              <Ionicons name="arrow-undo" size={14} color="#22d3ee" />
              <Text className="text-cyan-400 text-xs ml-1 font-semibold">
                Reply
              </Text>
            </TouchableOpacity>

            {hasReplies && (
              <TouchableOpacity
                className="flex-row items-center"
                onPress={() => toggleThread(comment.id)}
              >
                <Ionicons
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  size={14}
                  color="#22d3ee"
                />
                <Text className="text-cyan-400 text-xs ml-1 font-semibold">
                  {isExpanded
                    ? "Hide replies"
                    : `View ${comment.replies.length} ${comment.replies.length === 1 ? "reply" : "replies"}`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {isExpanded &&
          hasReplies &&
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
        className={`flex-1 ${bg}`}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className={`${bgCard} p-4 pt-12 border-b ${border}`}>
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={onClose} className="p-2">
              <Ionicons
                name="close"
                size={28}
                color={isDark ? "#fff" : "#111827"}
              />
            </TouchableOpacity>
            <Text
              className={`${textPrimary} font-bold text-lg flex-1 text-center mr-10`}
            >
              Comments
            </Text>
          </View>
          <Text className={`${textMuted} text-sm mt-2`} numberOfLines={1}>
            {resourceTitle}
          </Text>
        </View>

        {showDmSuggestion && dmSuggestionUsers && (
          <View className={`border-b border-cyan-500/30 p-4 ${bgCard}`}>
            <View className="flex-row items-start">
              <View className="bg-cyan-500/20 w-10 h-10 rounded-full items-center justify-center mr-3">
                <Ionicons name="chatbubbles" size={20} color="#22d3ee" />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center mb-1">
                  <Ionicons name="star" size={16} color="#22d3ee" />
                  <Text className={`${textPrimary} font-semibold ml-1`}>
                    Great conversation!
                  </Text>
                </View>
                <Text className={`${textSecondary} text-sm mb-3`}>
                  You`re having an active discussion. Consider moving to direct
                  messages for a more personal chat.
                </Text>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    className="flex-1 bg-cyan-500 py-2.5 rounded-lg flex-row items-center justify-center"
                    onPress={handleDmSuggestionAccept}
                  >
                    <Ionicons name="paper-plane" size={16} color="#fff" />
                    <Text className="text-white font-semibold ml-2 text-sm">
                      Send Message
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className={`${bgCardAlt} px-4 py-2.5 rounded-lg`}
                    onPress={() => setShowDmSuggestion(false)}
                  >
                    <Text className={`${textMuted} font-semibold text-sm`}>
                      Dismiss
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#22d3ee" />
          </View>
        ) : comments.length === 0 ? (
          <View className="flex-1 items-center justify-center px-5">
            <View className="bg-cyan-500/20 w-20 h-20 rounded-full items-center justify-center mb-4">
              <Ionicons name="chatbubble-outline" size={40} color="#22d3ee" />
            </View>
            <Text className={`${textPrimary} text-xl font-bold mb-2`}>
              No comments yet
            </Text>
            <Text className={`${textSecondary} text-center`}>
              Be the first to share your thoughts!
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

        {replyToId && replyToUser && (
          <View
            className={`${bgCardAlt} px-4 py-2 flex-row items-center justify-between border-t ${border}`}
          >
            <Text className="text-cyan-400 text-sm">
              Replying to {replyToUser}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setReplyToId(null);
                setReplyToUser(null);
              }}
            >
              <Ionicons name="close-circle" size={20} color="#22d3ee" />
            </TouchableOpacity>
          </View>
        )}

        <View className={`${bgCard} p-4 border-t ${border}`}>
          <View className="flex-row items-end gap-2">
            <ThemedTextInput
              className={`flex-1 ${bgInput} ${textPrimary} px-4 py-3 rounded-xl border ${borderInput}`}
              placeholder="Add a comment..."
              placeholderTextColor={placeholderColor}
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

      <UserProfileModal
        visible={showProfileModal}
        userId={selectedUserId}
        onClose={() => {
          setShowProfileModal(false);
          setSelectedUserId(null);
        }}
        onNavigateToPath={(path) => {
          pendingNavPath.current = path;
          setShowProfileModal(false);
          setSelectedUserId(null);
          // Wait for UserProfileModal slide-out animation to finish,
          // then close CommentsModal — the useEffect will fire router.push
          setTimeout(() => onClose(), 350);
        }}
      />

      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center p-5">
          <View className={`${bgCard} rounded-2xl p-6 w-full max-w-sm`}>
            <Text className={`${textPrimary} text-xl font-bold mb-2`}>
              Delete Comment?
            </Text>
            <Text className={`${textSecondary} mb-6`}>
              This action cannot be undone.
            </Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                className={`flex-1 ${bgCardAlt} py-3 rounded-xl`}
                onPress={() => {
                  setShowDeleteConfirm(false);
                  setDeleteCommentId(null);
                }}
                disabled={submitting}
              >
                <Text className={`${textPrimary} text-center font-bold`}>
                  Cancel
                </Text>
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
