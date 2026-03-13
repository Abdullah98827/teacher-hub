import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import useAppTheme from "../hooks/useAppTheme";

interface TeacherVerificationCardProps {
  teacher: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    trn: string;
    photo_url: string | null;
  };
  imageUrl?: string;
  onApprove: () => void;
  onReject: () => void;
  processing: boolean;
}

export default function TeacherVerificationCard({
  teacher,
  imageUrl,
  onApprove,
  onReject,
  processing,
}: TeacherVerificationCardProps) {
  const { bgCard, bgCardAlt, border, textPrimary, textSecondary, textMuted } = useAppTheme();
  return (
    <View className={`${bgCard} rounded-xl p-4 mb-3 border ${border}`}>
      {/* Teacher info */}
      <View className="mb-3">
        <View className="flex-row items-center gap-2 mb-3">
          <View className="bg-cyan-500/20 w-10 h-10 rounded-full items-center justify-center">
            <Ionicons name="person" size={20} color="#22d3ee" />
          </View>
          <View className="flex-1">
            <Text className={`${textPrimary} font-bold text-lg`}>
              {teacher.first_name} {teacher.last_name}
            </Text>
            <Text className={`${textSecondary} text-sm`}>{teacher.email}</Text>
          </View>
        </View>

        {/* TRN */}
        <View className={`${bgCardAlt} rounded-lg p-3 mb-3`}>
          <View className="flex-row items-center mb-1">
            <Ionicons name="card" size={14} color="#6B7280" />
            <Text className={`${textMuted} text-xs ml-1.5`}>
              Teacher Reference Number
            </Text>
          </View>
          <Text className={`${textPrimary} font-bold text-lg`}>{teacher.trn}</Text>
        </View>

        {/* Teacher pass photo */}
        {imageUrl ? (
          <View>
            <View className="flex-row items-center mb-2">
              <Ionicons name="image" size={14} color="#6B7280" />
              <Text className={`${textMuted} text-xs ml-1.5`}>
                Teacher Pass Photo
              </Text>
            </View>
            <Image
              source={{ uri: imageUrl }}
              className={`w-full h-48 rounded-lg ${bgCardAlt}`}
              resizeMode="contain"
            />
          </View>
        ) : (
          <View className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
            <View className="flex-row items-center">
              <Ionicons name="alert-circle" size={16} color="#ef4444" />
              <Text className="text-red-400 text-sm ml-2 font-semibold">
                No photo available
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Action buttons */}
      <View className="flex-row gap-2">
        <TouchableOpacity
          className={`flex-1 bg-red-500 py-3 rounded-lg flex-row items-center justify-center ${
            processing ? "opacity-50" : ""
          }`}
          onPress={onReject}
          disabled={processing}
        >
          <Ionicons name="close-circle" size={18} color="#fff" />
          <Text className="text-white font-semibold ml-2">Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 bg-green-500 py-3 rounded-lg flex-row items-center justify-center ${
            processing ? "opacity-50" : ""
          }`}
          onPress={onApprove}
          disabled={processing}
        >
          {processing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text className="text-white font-semibold ml-2">Approve</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
