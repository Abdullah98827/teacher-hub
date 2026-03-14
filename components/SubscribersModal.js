import { Ionicons } from "@expo/vector-icons";
import {
    ActivityIndicator,
    FlatList,
    Modal,
    TouchableOpacity,
    View,
} from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";
import { ThemedText } from './themed-text';

export default function SubscribersModal({
  visible,
  onClose,
  subjectName,
  subscribers,
  loading,
}) {
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
              <ThemedText className={`${textPrimary} text-2xl font-bold`}>
                Subscribers
              </ThemedText>
              <ThemedText className={`${textSecondary} text-sm`}>{subjectName}</ThemedText>
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
              <ThemedText className={`${textSecondary} mt-4`}>
                No subscribers yet
              </ThemedText>
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
                    <ThemedText className={`${textPrimary} font-semibold`}>
                      {item.full_name}
                    </ThemedText>
                    <ThemedText className={`${textMuted} text-sm`}>{item.email}</ThemedText>
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
