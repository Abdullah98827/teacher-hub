import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";

interface Subscriber {
  id: string;
  full_name: string;
  email: string;
}

interface SubscribersModalProps {
  visible: boolean;
  onClose: () => void;
  subjectName: string;
  subscribers: Subscriber[];
  loading: boolean;
}

export default function SubscribersModal({
  visible,
  onClose,
  subjectName,
  subscribers,
  loading,
}: SubscribersModalProps) {
  const { bgCard, bgCardAlt, textPrimary, textSecondary, textMuted } =
    useAppTheme();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/80 justify-end">
        <View className={`${bgCard} rounded-t-3xl p-6 max-h-[80%]`}>
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-1">
              <Text className={`${textPrimary} text-2xl font-bold`}>
                Subscribers
              </Text>
              <Text className={`${textSecondary} text-sm`}>{subjectName}</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View className="items-center justify-center py-10">
              <ActivityIndicator size="large" color="#22d3ee" />
            </View>
          ) : subscribers.length === 0 ? (
            <View className="items-center justify-center py-10">
              <Ionicons name="people-outline" size={48} color="#6B7280" />
              <Text className={`${textSecondary} mt-4`}>
                No subscribers yet
              </Text>
            </View>
          ) : (
            <FlatList
              data={subscribers}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View
                  className={`${bgCardAlt} rounded-lg p-4 mb-2 flex-row items-center`}
                >
                  <View className="bg-cyan-500/20 w-10 h-10 rounded-full items-center justify-center mr-3">
                    <Ionicons name="person" size={20} color="#22d3ee" />
                  </View>
                  <View className="flex-1">
                    <Text className={`${textPrimary} font-semibold`}>
                      {item.full_name}
                    </Text>
                    <Text className={`${textMuted} text-sm`}>{item.email}</Text>
                  </View>
                </View>
              )}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
