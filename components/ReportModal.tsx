// components/ReportModal.tsx
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
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
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-black/70 justify-end">
        <View className="bg-neutral-900 rounded-t-3xl max-h-[90%] border-t border-neutral-800">
          {/* Header */}
          <View className="p-5 border-b border-neutral-800">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                <View className="bg-red-600/20 w-10 h-10 rounded-full items-center justify-center mr-3">
                  <Ionicons name="flag" size={20} color="#ef4444" />
                </View>
                <Text className="text-white font-bold text-xl">
                  Report Resource
                </Text>
              </View>
              <TouchableOpacity onPress={handleClose}>
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            <Text className="text-gray-400 text-sm" numberOfLines={2}>
              {resourceTitle}
            </Text>
          </View>

          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            <View className="p-5">
              {/* Info */}
              <View className="bg-red-900/20 border border-red-800 rounded-xl p-4 mb-5">
                <Text className="text-red-400 text-sm leading-5">
                  Please select a reason for reporting this resource. Our team
                  will review it and take appropriate action.
                </Text>
              </View>

              {/* Reasons */}
              <Text className="text-white font-semibold mb-3">
                Select a reason:
              </Text>
              <View className="gap-3 mb-5">
                {REPORT_REASONS.map((reason) => (
                  <TouchableOpacity
                    key={reason.id}
                    className={`bg-neutral-800 rounded-xl p-4 border-2 ${
                      selectedReason === reason.id
                        ? "border-red-600"
                        : "border-transparent"
                    }`}
                    onPress={() => setSelectedReason(reason.id)}
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
                          size={20}
                          color={
                            selectedReason === reason.id ? "#ef4444" : "#9CA3AF"
                          }
                        />
                      </View>
                      <View className="flex-1">
                        <Text
                          className={`font-semibold mb-1 ${
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
                          size={24}
                          color="#ef4444"
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Additional Details */}
              <Text className="text-white font-semibold mb-3">
                Additional details (optional):
              </Text>
              <TextInput
                className="bg-neutral-800 text-white px-4 py-3 rounded-xl border border-neutral-700 mb-5"
                placeholder="Provide more information..."
                placeholderTextColor="#9CA3AF"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={500}
              />

              {/* Character count */}
              <Text className="text-gray-500 text-xs text-right mb-5">
                {description.length}/500
              </Text>

              {/* Submit Button */}
              <TouchableOpacity
                className={`bg-red-600 py-4 rounded-xl mb-3 ${
                  submitting || !selectedReason ? "opacity-50" : ""
                }`}
                onPress={submitReport}
                disabled={submitting || !selectedReason}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white text-center font-bold text-lg">
                    Submit Report
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                className="py-3"
                onPress={handleClose}
                disabled={submitting}
              >
                <Text className="text-gray-400 text-center">Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
      <Toast />
    </Modal>
  );
}
