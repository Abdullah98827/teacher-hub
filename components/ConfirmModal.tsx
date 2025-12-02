import {
  ActivityIndicator,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  confirmColor?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

export default function ConfirmModal({
  visible,
  title,
  message,
  confirmText = "Confirm",
  confirmColor = "bg-red-600",
  onConfirm,
  onCancel,
  isProcessing = false,
}: ConfirmModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View className="flex-1 bg-black/50 justify-center items-center p-5">
        <View className="bg-neutral-900 rounded-2xl p-6 w-full max-w-sm border border-neutral-800">
          <Text className="text-white text-xl font-bold mb-2">{title}</Text>
          <Text className="text-gray-400 mb-6">{message}</Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              className={`flex-1 bg-neutral-800 py-3 rounded-xl ${
                isProcessing ? "opacity-50" : ""
              }`}
              onPress={onCancel}
              disabled={isProcessing}
            >
              <Text className="text-white text-center font-bold">Cancel</Text>
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
                <Text className="text-white text-center font-bold">
                  {confirmText}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
