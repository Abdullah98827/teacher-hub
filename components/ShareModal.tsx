// components/ShareModal.tsx
import { Ionicons } from "@expo/vector-icons";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import Toast from "react-native-toast-message";

interface ShareModalProps {
  visible: boolean;
  resourceId: string;
  resourceTitle: string;
  onClose: () => void;
}

export default function ShareModal({
  visible,
  resourceId,
  resourceTitle,
  onClose,
}: ShareModalProps) {
  const handleCopyLink = () => {
    // For now, just show a message
    // When you implement chat, this will copy a shareable link
    Toast.show({
      type: "info",
      text1: "Coming Soon!",
      text2: "Share feature will be available with chat",
    });
    onClose();
  };

  const handleShareToChat = () => {
    Toast.show({
      type: "info",
      text1: "Coming Soon!",
      text2: "Share directly to teacher chats",
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/70 justify-center items-center px-5">
        <View className="bg-neutral-900 rounded-2xl w-full max-w-md border border-neutral-800">
          {/* Header */}
          <View className="p-5 border-b border-neutral-800">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                <View className="bg-cyan-600/20 w-10 h-10 rounded-full items-center justify-center mr-3">
                  <Ionicons name="share-social" size={20} color="#22d3ee" />
                </View>
                <Text className="text-white font-bold text-xl">
                  Share Resource
                </Text>
              </View>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            <Text className="text-gray-400 text-sm" numberOfLines={2}>
              {resourceTitle}
            </Text>
          </View>

          {/* Content */}
          <View className="p-5">
            {/* Coming Soon Banner */}
            <View className="bg-gradient-to-br from-cyan-900/30 to-purple-900/30 rounded-xl p-4 mb-5 border border-cyan-800/50">
              <View className="items-center">
                <View className="bg-cyan-500/20 w-16 h-16 rounded-full items-center justify-center mb-3">
                  <Ionicons name="chatbubbles" size={32} color="#22d3ee" />
                </View>
                <Text className="text-white font-bold text-lg mb-2 text-center">
                  Share with Teachers
                </Text>
                <Text className="text-gray-300 text-sm text-center">
                  Share resources directly in subject groups and one-on-one
                  chats when our Community feature launches!
                </Text>
              </View>
            </View>

            {/* Share Options (Disabled for now) */}
            <View className="gap-3 mb-4">
              <TouchableOpacity
                className="bg-neutral-800 rounded-xl p-4 flex-row items-center opacity-50"
                onPress={handleShareToChat}
                disabled
              >
                <View className="bg-purple-600/20 w-12 h-12 rounded-full items-center justify-center mr-4">
                  <Ionicons name="chatbubbles" size={24} color="#a855f7" />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-semibold mb-1">
                    Share to Group Chat
                  </Text>
                  <Text className="text-gray-400 text-xs">
                    Send to subject groups
                  </Text>
                </View>
                <View className="bg-yellow-600/20 px-2 py-1 rounded">
                  <Text className="text-yellow-400 text-xs font-bold">
                    Soon
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-neutral-800 rounded-xl p-4 flex-row items-center opacity-50"
                onPress={handleShareToChat}
                disabled
              >
                <View className="bg-blue-600/20 w-12 h-12 rounded-full items-center justify-center mr-4">
                  <Ionicons name="person" size={24} color="#3b82f6" />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-semibold mb-1">
                    Share to Teacher
                  </Text>
                  <Text className="text-gray-400 text-xs">
                    Send via direct message
                  </Text>
                </View>
                <View className="bg-yellow-600/20 px-2 py-1 rounded">
                  <Text className="text-yellow-400 text-xs font-bold">
                    Soon
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                className="bg-neutral-800 rounded-xl p-4 flex-row items-center"
                onPress={handleCopyLink}
              >
                <View className="bg-cyan-600/20 w-12 h-12 rounded-full items-center justify-center mr-4">
                  <Ionicons name="link" size={24} color="#22d3ee" />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-semibold mb-1">
                    Copy Link
                  </Text>
                  <Text className="text-gray-400 text-xs">
                    Share via other apps
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Info */}
            <View className="bg-cyan-900/20 border border-cyan-800 rounded-xl p-4">
              <Text className="text-cyan-400 text-xs leading-5">
                💡 The full sharing experience will be available when Community
                features are released. Stay tuned!
              </Text>
            </View>

            {/* Close Button */}
            <TouchableOpacity
              className="mt-5 py-4 bg-neutral-800 rounded-xl"
              onPress={onClose}
            >
              <Text className="text-white text-center font-semibold">
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <Toast />
    </Modal>
  );
}
