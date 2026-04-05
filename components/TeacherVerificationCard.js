import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Image, Modal, TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';
import { ThemedText } from './themed-text';

const TeacherVerificationCard = ({ teacher, imageUrl, onApprove, onReject, processing }) => {
  const [showImageModal, setShowImageModal] = useState(false);
  const { bgCard, textMuted, textPrimary } = useAppTheme();

  return (
    <View className={`p-4 m-2 rounded-lg ${bgCard} shadow-md`}>
      {imageUrl && (
        <>
          <TouchableOpacity onPress={() => setShowImageModal(true)} activeOpacity={0.8}>
            <Image
              source={{ uri: imageUrl }}
              className="w-20 h-20 rounded-full self-center mb-3 bg-gray-200"
              resizeMode="cover"
            />
          </TouchableOpacity>
          <Modal
            visible={showImageModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowImageModal(false)}
          >
            <View className="flex-1 bg-black/95 items-center justify-center">
              <TouchableOpacity 
                className="absolute top-10 right-5 z-10 bg-black/50 rounded-full p-1"
                onPress={() => setShowImageModal(false)}
              >
                <Ionicons name="close" size={36} color="#fff" />
              </TouchableOpacity>
              <Image
                source={{ uri: imageUrl }}
                className="w-11/12 h-3/5 rounded-2xl bg-white"
                resizeMode="contain"
              />
            </View>
          </Modal>
        </>
      )}
      <ThemedText className={`text-lg font-bold mb-1 text-center ${textPrimary}`}>
        {teacher.first_name} {teacher.last_name}
      </ThemedText>
      <ThemedText className={`text-sm ${textMuted} mb-0.5 text-center`}>{teacher.email}</ThemedText>
      <ThemedText className={`text-sm ${textMuted} mb-2 text-center`}>TRN: {teacher.trn}</ThemedText>
      <View className="flex-row justify-around mt-3 w-full">
        <TouchableOpacity 
          className="bg-green-500 px-6 py-2.5 rounded-lg min-w-20 items-center mx-2" 
          onPress={onApprove} 
          disabled={processing}
        >
          {processing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText className="text-white font-bold">Approve</ThemedText>
          )}
        </TouchableOpacity>
        <TouchableOpacity 
          className="bg-red-500 px-6 py-2.5 rounded-lg min-w-20 items-center mx-2" 
          onPress={onReject} 
          disabled={processing}
        >
          <ThemedText className="text-white font-bold">Reject</ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default TeacherVerificationCard;