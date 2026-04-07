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
} from "react-native";
import Toast from "react-native-toast-message";
import { useAppTheme } from "../hooks/useAppTheme";
import { supabase } from "../supabase";
import { useAdminNotifications } from "../utils/adminNotificationIntegrations";
import { logEvent } from "../utils/logging";
import { ThemedText } from './themed-text';
import { ThemedTextInput } from './themed-textinput';

const REPORT_REASONS = [
  {
    id: "inappropriate",
    label: "Inappropriate Content",
    icon: "warning",
    description: "Contains offensive or harmful material",
  },
  {
    id: "copyright",
    label: "Copyright Violation",
    icon: "shield",
    description: "Uses copyrighted material without permission",
  },
  {
    id: "spam",
    label: "Spam or Misleading",
    icon: "close-circle",
    description: "Irrelevant or misleading content",
  },
  {
    id: "low_quality",
    label: "Low Quality",
    icon: "thumbs-down",
    description: "Poor quality or incomplete resource",
  },
  {
    id: "incorrect",
    label: "Incorrect Information",
    icon: "alert-circle",
    description: "Contains factual errors or mistakes",
  },
  {
    id: "other",
    label: "Other",
    icon: "ellipsis-horizontal",
    description: "Another reason not listed",
  },
];

export default function ReportModal({
  visible,
  resourceId,
  resourceTitle,
  onClose,
}) {
  const [selectedReason, setSelectedReason] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const {
    bgCard,
    bgCardAlt,
    bgInput,
    border,
    borderInput,
    textPrimary,
    textSecondary,
    textMuted,
    placeholderColor,
  } = useAppTheme();

  const { notifyAdminNewReport } = useAdminNotifications();

  const handleClose = () => {
    setSelectedReason("");
    setDescription("");
    onClose();
  };

  const submitReport = async () => {
    if (!selectedReason) {
      Toast.show({ type: "error", text1: "Please select a reason" });
      return;
    }

    if (selectedReason === "other" && !description.trim()) {
      Toast.show({
        type: "error",
        text1: "Please provide a description",
      });
      return;
    }

    setSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      Toast.show({ type: "error", text1: "Please log in" });
      setSubmitting(false);
      return;
    }

    const reasonLabel =
      REPORT_REASONS.find((r) => r.id === selectedReason)?.label ||
      selectedReason;

    const { error } = await supabase.from("resource_reports").insert({
      resource_id: resourceId,
      reporter_id: user.id,
      reason: reasonLabel,
      description: description.trim() || null,
      status: "pending",
    });

    if (error) {
      Toast.show({
        type: "error",
        text1: "Failed to submit report",
        text2: error.message,
      });
      logEvent({
        event_type: "RESOURCE_REPORT_FAILED",
        user_id: user.id,
        target_id: resourceId,
        target_table: "resources",
        details: { reason: selectedReason, error: error.message },
      });
      setSubmitting(false);
      return;
    }

    logEvent({
      event_type: "RESOURCE_REPORTED",
      user_id: user.id,
      target_id: resourceId,
      target_table: "resources",
      details: { reason: reasonLabel },
    });

    // Notify admins of new report
    const { data: adminUsers } = await supabase
      .from("user_roles")
      .select("id")
      .or("role.eq.admin,role.eq.super_admin");

    if (adminUsers && adminUsers.length > 0) {
      const adminIds = adminUsers.map(a => a.id);
      await notifyAdminNewReport(
        adminIds,
        user.id,
        user.email || 'Anonymous',
        resourceId,
        'resource',
        reasonLabel
      ).catch(err => console.warn('Failed to notify admin:', err));
    }

    Toast.show({
      type: "success",
      text1: "Report submitted",
      text2: "We'll review this resource shortly",
    });

    setSubmitting(false);
    handleClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 bg-black/80 justify-center items-center p-4">
          <View
            className={`${bgCard} rounded-2xl w-full max-w-md border-2 ${border}`}
            style={{ maxHeight: "80%" }}
          >
            <View
              className={`flex-row items-center justify-between p-4 border-b ${border}`}
            >
              <View className="flex-row items-center flex-1 pr-2">
                <View className="bg-red-600/20 w-10 h-10 rounded-full items-center justify-center mr-3">
                  <Ionicons name="flag" size={20} color="#ef4444" />
                </View>
                <View className="flex-1">
                  <ThemedText className={`${textPrimary} font-bold text-lg`}>
                    Report Resource
                  </ThemedText>
                  <ThemedText
                    className={`${textMuted} text-xs mt-1`}
                    numberOfLines={1}
                  >
                    {resourceTitle}
                  </ThemedText>
                </View>
              </View>
              <TouchableOpacity
                onPress={handleClose}
                className={`${bgCardAlt} w-10 h-10 rounded-full items-center justify-center`}
              >
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              <View className="p-4">
                <View className="bg-red-900/20 border border-red-800 rounded-xl p-3 mb-4">
                  <ThemedText className="text-red-400 text-xs leading-5">
                    Please select a reason for reporting this resource. Our team
                    will review it and take appropriate action.
                  </ThemedText>
                </View>

                <ThemedText className={`${textPrimary} font-semibold mb-3 text-sm`}>
                  Select a reason:
                </ThemedText>
                <View className="gap-2 mb-4">
                  {REPORT_REASONS.map((reason) => (
                    <TouchableOpacity
                      key={reason.id}
                      className={`${bgCardAlt} rounded-xl p-3 border-2 ${
                        selectedReason === reason.id
                          ? "border-red-600"
                          : "border-transparent"
                      }`}
                      onPress={() => setSelectedReason(reason.id)}
                      activeOpacity={0.7}
                    >
                      <View className="flex-row items-start">
                        <View
                          className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                            selectedReason === reason.id
                              ? "bg-red-600/20"
                              : bgCardAlt
                          }`}
                        >
                          <Ionicons
                            name={reason.icon}
                            size={18}
                            color={
                              selectedReason === reason.id
                                ? "#ef4444"
                                : "#9CA3AF"
                            }
                          />
                        </View>
                        <View className="flex-1">
                          <ThemedText
                            className={`font-semibold mb-1 text-sm ${
                              selectedReason === reason.id
                                ? "text-red-400"
                                : textPrimary
                            }`}
                          >
                            {reason.label}
                          </ThemedText>
                          <ThemedText className={`${textMuted} text-xs`}>
                            {reason.description}
                          </ThemedText>
                        </View>
                        {selectedReason === reason.id && (
                          <Ionicons
                            name="checkmark-circle"
                            size={22}
                            color="#ef4444"
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>

                <ThemedText className={`${textPrimary} font-semibold mb-2 text-sm`}>
                  Additional details (optional):
                </ThemedText>
                <ThemedTextInput
                  className={`${bgInput} ${textPrimary} px-3 py-3 rounded-xl border ${borderInput} mb-2 text-sm`}
                  placeholder="Provide more information..."
                  placeholderTextColor={placeholderColor}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  maxLength={500}
                  style={{ minHeight: 80 }}
                />

                <ThemedText className={`${textMuted} text-xs text-right mb-4`}>
                  {description.length}/500
                </ThemedText>

                <TouchableOpacity
                  className={`bg-red-600 py-3 rounded-xl mb-2 ${
                    submitting || !selectedReason ? "opacity-50" : ""
                  }`}
                  onPress={submitReport}
                  disabled={submitting || !selectedReason}
                  activeOpacity={0.8}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <ThemedText className="text-white text-center font-bold text-base">
                      Submit Report
                    </ThemedText>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  className="py-2"
                  onPress={handleClose}
                  disabled={submitting}
                  activeOpacity={0.7}
                >
                  <ThemedText className={`${textSecondary} text-center text-sm`}>
                    Cancel
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
      <Toast />
    </Modal>
  );
}
