import {
    ActivityIndicator,
    Modal,
    TouchableOpacity,
    View,
} from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";
import { ThemedText } from './themed-text';

export default function ConfirmModal({
  visible,
  title,
  message,
  confirmText = "Confirm",
  confirmColor = "bg-red-600",
  onConfirm,
  onCancel,
  isProcessing = false,
}) {
  const { bgCard, bgCardAlt, border, textPrimary, textSecondary } =
    useAppTheme();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View className="flex-1 bg-black/50 justify-center items-center p-5">
        <View
          className={`${bgCard} rounded-2xl p-6 w-full max-w-sm border ${border}`}
        >
          <ThemedText className={`${textPrimary} text-xl font-bold mb-2`}>
            {title}
          </ThemedText>
          <ThemedText className={`${textSecondary} mb-6`}>{message}</ThemedText>
          <View className="flex-row gap-3">
            <TouchableOpacity
              className={`flex-1 ${bgCardAlt} py-3 rounded-xl ${
                isProcessing ? "opacity-50" : ""
              }`}
              onPress={onCancel}
              disabled={isProcessing}
            >
              <ThemedText className={`${textPrimary} text-center font-bold`}>
                Cancel
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 ${confirmColor} py-3 rounded-xl ${
                isProcessing ? "opacity-50" : ""
              }`}
              onPress={onConfirm}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText className="text-white text-center font-bold">
                  {confirmText}
                </ThemedText>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
