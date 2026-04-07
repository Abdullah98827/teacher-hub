import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";
import {
  getReportReasonColor,
  getReportReasonIcon,
  getReportReasonLabel,
} from "../utils/commentReportReasons";
import { ThemedText } from "./themed-text";

export default function ReportedCommentCard({ report, onResolve, processing }) {
  const { bgCard, bgInput, border, textPrimary, textMuted, isDark } = useAppTheme();
  const [showDetails, setShowDetails] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedResolution, setSelectedResolution] = useState(null);
  const [reviewNotesText, setReviewNotesText] = useState("");

  const handleResolve = async (resolution) => {
    setSelectedResolution(resolution);
    if (resolution === "dismissed") {
      // Dismiss without notes
      await onResolve(report.id, "dismissed", "");
      setShowReviewModal(false);
      setReviewNotesText("");
    } else {
      setShowReviewModal(true);
    }
  };

  const handleSubmitResolution = async () => {
    if (!selectedResolution) return;
    await onResolve(report.id, selectedResolution, reviewNotesText);
    setShowReviewModal(false);
    setReviewNotesText("");
    setSelectedResolution(null);
  };

  const reasonColor = getReportReasonColor(report.reason);
  const reasonIcon = getReportReasonIcon(report.reason);
  const reasonLabel = getReportReasonLabel(report.reason);

  return (
    <>
      <TouchableOpacity
        onPress={() => setShowDetails(!showDetails)}
        style={{
          backgroundColor: bgCard,
          borderLeftWidth: 4,
          borderLeftColor: reasonColor,
          borderRadius: 12,
          padding: 12,
          marginBottom: 12,
        }}
      >
        {/* Header with reason */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: reasonColor + "20",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            <Ionicons name={reasonIcon} size={16} color={reasonColor} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={{ fontWeight: "600", fontSize: 13 }} type="default">
              {reasonLabel}
            </ThemedText>
            <ThemedText style={{ fontSize: 11, color: textMuted, marginTop: 2 }} type="default">
              Reported {new Date(report.created_at).toLocaleDateString()}
            </ThemedText>
          </View>
          <Ionicons
            name={showDetails ? "chevron-up-outline" : "chevron-down-outline"}
            size={20}
            color={textMuted}
          />
        </View>

        {/* Comment Text Preview */}
        <View
          style={{
            backgroundColor: isDark ? "#1F2937" : "#F3F4F6",
            borderRadius: 8,
            padding: 10,
            marginBottom: 12,
          }}
        >
          <ThemedText
            style={{ fontSize: 12, color: textMuted, marginBottom: 4 }}
            type="default"
          >
            Comment by {report.reported_user_name}
          </ThemedText>
          <ThemedText
            style={{ fontSize: 13, lineHeight: 20 }}
            type="default"
            numberOfLines={showDetails ? undefined : 2}
          >
            {report.resource_comments?.comment_text || "Comment deleted"}
          </ThemedText>
        </View>

        {/* Reporter Info */}
        {showDetails && (
          <View
            style={{
              backgroundColor: isDark ? "#1F2937" : "#F9FAFB",
              borderRadius: 8,
              padding: 10,
              marginBottom: 12,
            }}
          >
            <ThemedText style={{ fontSize: 12, color: textMuted }} type="default">
              Reported by: {report.reported_by} (ID: {report.reported_by.substring(0, 8)})
            </ThemedText>
            {report.description && (
              <ThemedText
                style={{ fontSize: 12, marginTop: 8, lineHeight: 18 }}
                type="default"
              >
                Reporter notes: {report.description}
              </ThemedText>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View
          style={{
            flexDirection: "row",
            gap: 8,
          }}
        >
          <TouchableOpacity
            onPress={() => handleResolve("dismissed")}
            disabled={processing}
            style={{
              flex: 1,
              borderRadius: 8,
              paddingVertical: 10,
              alignItems: "center",
              backgroundColor: bgInput,
              borderWidth: 1,
              borderColor: border,
            }}
          >
            {processing && selectedResolution === "dismissed" ? (
              <ActivityIndicator size="small" color={textPrimary} />
            ) : (
              <ThemedText style={{ fontWeight: "600", fontSize: 12 }} type="default">
                Dismiss
              </ThemedText>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleResolve("resolved")}
            disabled={processing}
            style={{
              flex: 1,
              borderRadius: 8,
              paddingVertical: 10,
              alignItems: "center",
              backgroundColor: "#10B981" + "20",
              borderWidth: 1,
              borderColor: "#10B981",
            }}
          >
            {processing && selectedResolution === "resolved" ? (
              <ActivityIndicator size="small" color="#10B981" />
            ) : (
              <ThemedText style={{ fontWeight: "600", fontSize: 12, color: "#10B981" }} type="default">
                Resolve
              </ThemedText>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleResolve("reviewed")}
            disabled={processing}
            style={{
              flex: 1,
              borderRadius: 8,
              paddingVertical: 10,
              alignItems: "center",
              backgroundColor: "#3B82F6" + "20",
              borderWidth: 1,
              borderColor: "#3B82F6",
            }}
          >
            {processing && selectedResolution === "reviewed" ? (
              <ActivityIndicator size="small" color="#3B82F6" />
            ) : (
              <ThemedText style={{ fontWeight: "600", fontSize: 12, color: "#3B82F6" }} type="default">
                Review
              </ThemedText>
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* Review Modal */}
      <Modal visible={showReviewModal} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: bgCard,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: 32,
              maxHeight: "80%",
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
              <ThemedText style={{ fontSize: 18, fontWeight: "600" }} type="default">
                Add Review Notes
              </ThemedText>
              <TouchableOpacity
                onPress={() => {
                  setShowReviewModal(false);
                  setReviewNotesText("");
                  setSelectedResolution(null);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-outline" size={24} color={textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Resolution Info */}
            <View
              style={{
                backgroundColor: bgInput,
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
              }}
            >
              <ThemedText style={{ fontSize: 12, color: textMuted }} type="default">
                Resolution Status
              </ThemedText>
              <ThemedText style={{ fontSize: 14, fontWeight: "600", marginTop: 4 }} type="default">
                {selectedResolution === "reviewed"
                  ? "Mark as Reviewed"
                  : "Mark as Resolved"}
              </ThemedText>
            </View>

            {/* Notes Input */}
            <TextInput
              style={{
                backgroundColor: bgInput,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: border,
                color: textPrimary,
                paddingHorizontal: 12,
                paddingVertical: 10,
                minHeight: 100,
                textAlignVertical: "top",
                marginBottom: 16,
                fontFamily: "System",
              }}
              placeholder="Add notes about this report..."
              placeholderTextColor={textMuted}
              multiline
              value={reviewNotesText}
              onChangeText={setReviewNotesText}
              editable={!processing}
            />

            {/* Action Buttons */}
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowReviewModal(false);
                  setReviewNotesText("");
                  setSelectedResolution(null);
                }}
                style={{
                  flex: 1,
                  borderRadius: 8,
                  paddingVertical: 12,
                  alignItems: "center",
                  backgroundColor: bgInput,
                  borderWidth: 1,
                  borderColor: border,
                }}
                disabled={processing}
              >
                <ThemedText type="default" style={{ fontWeight: "600" }}>
                  Cancel
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSubmitResolution}
                style={{
                  flex: 1,
                  borderRadius: 8,
                  paddingVertical: 12,
                  alignItems: "center",
                  backgroundColor:
                    selectedResolution === "reviewed" ? "#3B82F6" : "#10B981",
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 8,
                }}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons
                      name={
                        selectedResolution === "reviewed"
                          ? "checkmark-outline"
                          : "checkmark-done-outline"
                      }
                      size={16}
                      color="white"
                    />
                    <ThemedText
                      style={{ color: "white", fontWeight: "600" }}
                      type="default"
                    >
                      {selectedResolution === "reviewed"
                        ? "Mark Reviewed"
                        : "Mark Resolved"}
                    </ThemedText>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
