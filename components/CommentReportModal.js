import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
  Text,
} from "react-native";
import Toast from "react-native-toast-message";
import { useAppTheme } from "../hooks/useAppTheme";
import { supabase } from "../supabase";
import { logEvent } from "../utils/logging";
import {
  COMMENT_REPORT_REASONS,
  getReportReasonColor,
  getReportReasonIcon,
} from "../utils/commentReportReasons";
import { ThemedText } from "./themed-text";
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
}) {
  const {
    bg,
    bgCard,
    bgCardAlt,
    border,
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

  const handleReplyClick = () => {
    if (onReply) {
      onReply(comment.id, `${comment.first_name} ${comment.last_name}`);
    }
    handleClose();
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
                backgroundColor: bg,
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
                <ThemedText
                  style={{ fontSize: 18, fontWeight: "700", flex: 1 }}
                  type="default"
                >
                  Report Comment
                </ThemedText>
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
                  backgroundColor: bgCardAlt,
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 20,
                  borderLeftWidth: 4,
                  borderLeftColor: "#F59E0B",
                }}
              >
                <Text
                  style={{ fontSize: 11, fontWeight: "600", color: textMuted }}
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
                  {comment.comment_text}
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
                showsVerticalScrollIndicator={true}
                scrollEnabled={COMMENT_REPORT_REASONS.length > 5}
              >
                {COMMENT_REPORT_REASONS.map((reason) => (
                  <TouchableOpacity
                    key={reason.value}
                    onPress={() => setSelectedReason(reason.value)}
                    style={{
                      backgroundColor:
                        selectedReason === reason.value ? bgCard : bgCardAlt,
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      marginBottom: 10,
                      flexDirection: "row",
                      alignItems: "center",
                      borderWidth: 2,
                      borderColor:
                        selectedReason === reason.value
                          ? getReportReasonColor(reason.value)
                          : "transparent",
                    }}
                  >
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        backgroundColor:
                          getReportReasonColor(reason.value) + "15",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 12,
                      }}
                    >
                      <Ionicons
                        name={getReportReasonIcon(reason.value)}
                        size={16}
                        color={getReportReasonColor(reason.value)}
                      />
                    </View>
                    <Text
                      style={{
                        flex: 1,
                        fontSize: 13,
                        fontWeight: "500",
                        color: isDark ? "#E5E7EB" : "#1F2937",
                      }}
                    >
                      {reason.label}
                    </Text>
                    {selectedReason === reason.value && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={getReportReasonColor(reason.value)}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Description Field */}
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  marginBottom: 8,
                  color: isDark ? "#E5E7EB" : "#1F2937",
                }}
              >
                Additional Details (optional)
              </Text>

              <ThemedTextInput
                style={{
                  minHeight: 100,
                  textAlignVertical: "top",
                  marginBottom: 16,
                }}
                placeholder="Provide more context if needed..."
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

              {/* Action Buttons */}
              <View style={{ flexDirection: "row", gap: 12 }}>
                <TouchableOpacity
                  onPress={() => setReportMode(false)}
                  style={{
                    flex: 1,
                    borderRadius: 10,
                    paddingVertical: 12,
                    alignItems: "center",
                    backgroundColor: bgCardAlt,
                    borderWidth: 1,
                    borderColor: border,
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

          {/* Reply Option */}
          <TouchableOpacity
            onPress={handleReplyClick}
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
              color={isDark ? "#60A5FA" : "#3B82F6"}
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
