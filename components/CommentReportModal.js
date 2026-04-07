import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Toast from "react-native-toast-message";
import { useAppTheme } from "../hooks/useAppTheme";
import { supabase } from "../supabase";
import {
    COMMENT_REPORT_REASONS,
    getReportReasonColor,
} from "../utils/commentReportReasons";
import { logEvent } from "../utils/logging";
import { ThemedTextInput } from "./themed-textinput";

export default function CommentReportModal({
  visible,
  onClose,
  comment,
  currentUserId,
  userRole,
  onReport,
  onReply,
  onDelete,
  isMenuReply = false,
}) {
  const {
    textMuted,
    isDark,
  } = useAppTheme();

  const [reportMode, setReportMode] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!comment) return null;

  const isOwnComment = comment.user_id === currentUserId;
  const canDelete = isOwnComment || userRole === "admin" || userRole === "super_admin";

  const handleClose = () => {
    setReportMode(false);
    setSelectedReason("");
    setCustomDescription("");
    onClose?.();
  };

  // Helper function to parse message content
  const parseMessageContent = (commentText) => {
    try {
      const parsed = JSON.parse(commentText);
      if (parsed.type === "resource_share") {
        return {
          type: "resource_share",
          title: parsed.title || "Resource",
          resourceId: parsed.resourceId,
          link: parsed.link,
        };
      }
    } catch (_) {
      // Not JSON, return as plain text
    }
    return { type: "text", content: commentText };
  };

  // Helper function to get display text for comment
  const getCommentDisplayText = () => {
    const parsed = parseMessageContent(comment.comment_text);
    if (parsed.type === "resource_share") {
      return `Shared: ${parsed.title}`;
    }
    return comment.comment_text;
  };

  const handleDeleteClick = () => {
    if (onDelete) {
      onDelete(comment.id);
    }
    handleClose();
  };

  const handleReportSubmit = async () => {
    if (!selectedReason) {
      Toast.show({
        type: "error",
        text1: "Please select a reason",
      });
      return;
    }

    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Toast.show({ type: "error", text1: "Please log in" });
        setSubmitting(false);
        return;
      }

      // Insert report into database
      const { error } = await supabase.from("comment_reports").insert({
        comment_id: comment.id,
        reported_by: user.id,
        reported_user_id: comment.user_id,
        reason: selectedReason,
        description: customDescription || null,
        status: "pending",
      });

      if (error) throw error;

      // Log the report
      await logEvent({
        event_type: "COMMENT_REPORTED",
        user_id: user.id,
        target_id: comment.id,
        target_table: "resource_comments",
        details: { reason: selectedReason },
      });

      Toast.show({
        type: "success",
        text1: "Comment reported",
        text2: "Our team will review this shortly",
      });

      // Call parent callback if exists
      if (onReport) {
        await onReport(comment.id, comment.comment_text, selectedReason);
      }

      handleClose();
    } catch (error) {
      console.error("Error reporting comment:", error);
      Toast.show({
        type: "error",
        text1: "Failed to report comment",
        text2: error.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Report mode - show structured reasons
  if (reportMode) {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            justifyContent: "flex-end",
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1, justifyContent: "flex-end" }}
          >
            <View
              style={{
                backgroundColor: isDark ? "#111827" : "#FFFFFF",
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                paddingHorizontal: 20,
                paddingTop: 20,
                paddingBottom: 32,
                maxHeight: "90%",
              }}
            >
              {/* Header */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 20,
                }}
              >
                <TouchableOpacity
                  onPress={() => setReportMode(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={{ marginRight: 12 }}
                >
                  <Ionicons
                    name="arrow-back"
                    size={24}
                    color={isDark ? "#E5E7EB" : "#1F2937"}
                  />
                </TouchableOpacity>
                <Text
                  style={{ fontSize: 18, fontWeight: "700", flex: 1, color: isDark ? "#E5E7EB" : "#1F2937" }}
                >
                  Report Comment
                </Text>
                <TouchableOpacity
                  onPress={handleClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name="close-circle"
                    size={28}
                    color={isDark ? "#9CA3AF" : "#D1D5DB"}
                  />
                </TouchableOpacity>
              </View>

              {/* Comment Preview */}
              <View
                style={{
                  backgroundColor: isDark ? "#1F293620" : "#F3E8FF15",
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 20,
                  borderLeftWidth: 4,
                  borderLeftColor: "#F59E0B",
                }}
              >
                <Text
                  style={{ fontSize: 11, fontWeight: "600", color: "#F59E0B" }}
                >
                  COMMENT BY {comment.first_name?.toUpperCase() || "USER"}
                </Text>
                <Text
                  style={{
                    marginTop: 8,
                    fontSize: 13,
                    lineHeight: 20,
                    color: isDark ? "#E5E7EB" : "#1F2937",
                  }}
                >
                  {getCommentDisplayText()}
                </Text>
              </View>

              {/* Reason Selection Label */}
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  marginBottom: 12,
                  color: isDark ? "#E5E7EB" : "#1F2937",
                }}
              >
                Why are you reporting this?
              </Text>

              {/* Reason Selection List */}
              <ScrollView
                style={{ maxHeight: 280, marginBottom: 16 }}
                showsVerticalScrollIndicator={false}
                scrollEnabled={COMMENT_REPORT_REASONS.length > 5}
              >
                {COMMENT_REPORT_REASONS.map((reason) => (
                  <TouchableOpacity
                    key={reason.value}
                    onPress={() => setSelectedReason(reason.value)}
                    style={{
                      backgroundColor: selectedReason === reason.value 
                        ? (isDark ? "#1F3A4620" : "#0F172A15")
                        : "transparent",
                      borderRadius: 10,
                      paddingHorizontal: 14,
                      paddingVertical: 13,
                      marginBottom: 8,
                      flexDirection: "row",
                      alignItems: "center",
                      borderWidth: 1.5,
                      borderColor: selectedReason === reason.value
                        ? getReportReasonColor(reason.value)
                        : (isDark ? "#374151" : "#E5E7EB"),
                    }}
                  >
                    <Text
                      style={{
                        flex: 1,
                        fontSize: 14,
                        fontWeight: selectedReason === reason.value ? "600" : "500",
                        color: isDark ? "#E5E7EB" : "#1F2937",
                      }}
                    >
                      {reason.label}
                    </Text>
                    {selectedReason === reason.value && (
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: getReportReasonColor(reason.value),
                          marginLeft: 8,
                        }}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Description Field - Only show for "Other" reason */}
              {selectedReason === "other" && (
                <>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      marginBottom: 8,
                      color: isDark ? "#E5E7EB" : "#1F2937",
                    }}
                  >
                    Please describe the issue
                  </Text>

                  <ThemedTextInput
                    style={{
                      minHeight: 100,
                      textAlignVertical: "top",
                      marginBottom: 16,
                    }}
                    placeholder="Explain what's wrong with this comment..."
                    multiline
                    maxLength={500}
                    value={customDescription}
                    onChangeText={setCustomDescription}
                    editable={!submitting}
                  />

                  {/* Character Count */}
                  <Text
                    style={{
                      fontSize: 11,
                      textAlign: "right",
                      marginBottom: 16,
                      color: textMuted,
                    }}
                  >
                    {customDescription.length}/500
                  </Text>
                </>
              )}

              {/* Action Buttons */}
              <View style={{ flexDirection: "row", gap: 12 }}>
                <TouchableOpacity
                  onPress={() => setReportMode(false)}
                  style={{
                    flex: 1,
                    borderRadius: 10,
                    paddingVertical: 12,
                    alignItems: "center",
                    backgroundColor: isDark ? "#374151" : "#F3F4F6",
                    borderWidth: 1,
                    borderColor: isDark ? "#4B5563" : "#E5E7EB",
                  }}
                  disabled={submitting}
                >
                  <Text
                    style={{
                      fontWeight: "600",
                      fontSize: 13,
                      color: isDark ? "#E5E7EB" : "#1F2937",
                    }}
                  >
                    Back
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleReportSubmit}
                  style={{
                    flex: 1,
                    borderRadius: 10,
                    paddingVertical: 12,
                    alignItems: "center",
                    backgroundColor: "#EF4444",
                    flexDirection: "row",
                    justifyContent: "center",
                    gap: 8,
                    opacity: submitting || !selectedReason ? 0.6 : 1,
                  }}
                  disabled={submitting || !selectedReason}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <Ionicons name="flag" size={16} color="white" />
                      <Text
                        style={{
                          color: "white",
                          fontWeight: "600",
                          fontSize: 13,
                        }}
                      >
                        Report
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    );
  }

  // Menu mode - show Reply, Report, Delete options
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            backgroundColor: isDark ? "#1F2937" : "#F3F4F6",
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingHorizontal: 16,
            paddingVertical: 16,
            paddingBottom: 32,
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: isDark ? "#F3F4F6" : "#111827",
              }}
            >
              Comment
            </Text>
            <TouchableOpacity
              onPress={handleClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="close"
                size={24}
                color={isDark ? "#9CA3AF" : "#6B7280"}
              />
            </TouchableOpacity>
          </View>

          {/* Comment Preview */}
          <View
            style={{
              backgroundColor: isDark ? "#111827" : "#FFFFFF",
              borderRadius: 12,
              padding: 12,
              marginBottom: 16,
              borderLeftWidth: 3,
              borderLeftColor: "#22D3EE",
            }}
          >
            <Text
              style={{
                fontSize: 12,
                color: isDark ? "#9CA3AF" : "#6B7280",
                marginBottom: 4,
                fontWeight: "500",
              }}
            >
              {comment.first_name} {comment.last_name}
            </Text>
            <Text
              style={{
                fontSize: 13,
                lineHeight: 20,
                color: isDark ? "#E5E7EB" : "#1F2937",
              }}
              numberOfLines={2}
            >
              {comment.comment_text}
            </Text>
          </View>

          {/* Reply Option - Always shown */}
          <TouchableOpacity
            onPress={() => {
              if (onReply && comment) {
                onReply(
                  isMenuReply ? comment.parent_comment_id || comment.id : comment.id,
                  { id: comment.user_id, name: `${comment.first_name} ${comment.last_name}` }
                );
              }
              onClose?.();
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 12,
              paddingVertical: 12,
              backgroundColor: isDark ? "#111827" : "#FFFFFF",
              borderRadius: 10,
              marginBottom: 8,
              borderBottomWidth: 1,
              borderBottomColor: isDark ? "#374151" : "#E5E7EB",
            }}
          >
            <Ionicons
              name="arrow-undo"
              size={20}
              color={isDark ? "#06B6D4" : "#0891B2"}
              style={{ marginRight: 12 }}
            />
            <Text
              style={{
                flex: 1,
                fontWeight: "500",
                fontSize: 15,
                color: isDark ? "#E5E7EB" : "#1F2937",
              }}
            >
              Reply
            </Text>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={isDark ? "#6B7280" : "#9CA3AF"}
            />
          </TouchableOpacity>

          {/* Report Option - Hidden if own comment */}
          {!isOwnComment && (
            <TouchableOpacity
              onPress={() => setReportMode(true)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 12,
                paddingVertical: 12,
                backgroundColor: isDark ? "#111827" : "#FFFFFF",
                borderRadius: 10,
                marginBottom: 8,
                borderBottomWidth: 1,
                borderBottomColor: isDark ? "#374151" : "#E5E7EB",
              }}
            >
              <Ionicons
                name="flag"
                size={20}
                color={isDark ? "#FBBF24" : "#F59E0B"}
                style={{ marginRight: 12 }}
              />
              <Text
                style={{
                  flex: 1,
                  fontWeight: "500",
                  fontSize: 15,
                  color: isDark ? "#E5E7EB" : "#1F2937",
                }}
              >
                Report
              </Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={isDark ? "#6B7280" : "#9CA3AF"}
              />
            </TouchableOpacity>
          )}

          {/* Delete Option - Only for admins or comment owner */}
          {canDelete && (
            <TouchableOpacity
              onPress={handleDeleteClick}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 12,
                paddingVertical: 12,
                backgroundColor: isDark ? "#111827" : "#FFFFFF",
                borderRadius: 10,
              }}
            >
              <Ionicons
                name="trash"
                size={20}
                color={isDark ? "#F87171" : "#EF4444"}
                style={{ marginRight: 12 }}
              />
              <Text
                style={{
                  flex: 1,
                  fontWeight: "500",
                  fontSize: 15,
                  color: isDark ? "#E5E7EB" : "#1F2937",
                }}
              >
                Delete
              </Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={isDark ? "#6B7280" : "#9CA3AF"}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}
