// components/ReportModal.tsx
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { supabase } from "../supabase";

interface ReportModalProps {
  visible: boolean;
  resourceId: string;
  resourceTitle: string;
  onClose: () => void;
}

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
}: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      setSubmitting(false);
      return;
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
            className="bg-neutral-900 rounded-2xl w-full max-w-md border-2 border-neutral-700"
            style={{ maxHeight: "80%" }}
          >
            <View className="flex-row items-center justify-between p-4 border-b border-neutral-800">
              <View className="flex-row items-center flex-1 pr-2">
                <View className="bg-red-600/20 w-10 h-10 rounded-full items-center justify-center mr-3">
                  <Ionicons name="flag" size={20} color="#ef4444" />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-bold text-lg">
                    Report Resource
                  </Text>
                  <Text
                    className="text-gray-400 text-xs mt-1"
                    numberOfLines={1}
                  >
                    {resourceTitle}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={handleClose}
                className="bg-neutral-800 w-10 h-10 rounded-full items-center justify-center"
              >
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {/* Scrollable Content */}
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              <View className="p-4">
                {/* Info */}
                <View className="bg-red-900/20 border border-red-800 rounded-xl p-3 mb-4">
                  <Text className="text-red-400 text-xs leading-5">
                    Please select a reason for reporting this resource. Our team
                    will review it and take appropriate action.
                  </Text>
                </View>

                {/* Reasons */}
                <Text className="text-white font-semibold mb-3 text-sm">
                  Select a reason:
                </Text>
                <View className="gap-2 mb-4">
                  {REPORT_REASONS.map((reason) => (
                    <TouchableOpacity
                      key={reason.id}
                      className={`bg-neutral-800 rounded-xl p-3 border-2 ${
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
                              : "bg-neutral-700"
                          }`}
                        >
                          <Ionicons
                            name={reason.icon as any}
                            size={18}
                            color={
                              selectedReason === reason.id
                                ? "#ef4444"
                                : "#9CA3AF"
                            }
                          />
                        </View>
                        <View className="flex-1">
                          <Text
                            className={`font-semibold mb-1 text-sm ${
                              selectedReason === reason.id
                                ? "text-red-400"
                                : "text-white"
                            }`}
                          >
                            {reason.label}
                          </Text>
                          <Text className="text-gray-400 text-xs">
                            {reason.description}
                          </Text>
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

                {/* Additional Details */}
                <Text className="text-white font-semibold mb-2 text-sm">
                  Additional details (optional):
                </Text>
                <TextInput
                  className="bg-neutral-800 text-white px-3 py-3 rounded-xl border border-neutral-700 mb-2 text-sm"
                  placeholder="Provide more information..."
                  placeholderTextColor="#9CA3AF"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  maxLength={500}
                  style={{ minHeight: 80 }}
                />

                {/* Character count */}
                <Text className="text-gray-500 text-xs text-right mb-4">
                  {description.length}/500
                </Text>

                {/* Submit Button */}
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
                    <Text className="text-white text-center font-bold text-base">
                      Submit Report
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  className="py-2"
                  onPress={handleClose}
                  disabled={submitting}
                  activeOpacity={0.7}
                >
                  <Text className="text-gray-400 text-center text-sm">
                    Cancel
                  </Text>
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
