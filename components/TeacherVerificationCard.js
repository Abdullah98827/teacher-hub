import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Image, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './themed-text';

const TeacherVerificationCard = ({ teacher, imageUrl, onApprove, onReject, processing }) => {
  const [showImageModal, setShowImageModal] = useState(false);

  return (
    <View style={styles.card}>
      {imageUrl && (
        <>
          <TouchableOpacity onPress={() => setShowImageModal(true)} activeOpacity={0.8}>
            <Image
              source={{ uri: imageUrl }}
              style={styles.image}
              resizeMode="cover"
            />
          </TouchableOpacity>
          <Modal
            visible={showImageModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowImageModal(false)}
          >
            <View style={styles.modalOverlay}>
              <TouchableOpacity style={styles.closeButton} onPress={() => setShowImageModal(false)}>
                <Ionicons name="close" size={36} color="#fff" />
              </TouchableOpacity>
              <Image
                source={{ uri: imageUrl }}
                style={styles.fullImage}
                resizeMode="contain"
              />
            </View>
          </Modal>
        </>
      )}
      <ThemedText style={styles.teacherName}>
        {teacher.first_name} {teacher.last_name}
      </ThemedText>
      <ThemedText style={styles.email}>{teacher.email}</ThemedText>
      <ThemedText style={styles.trn}>TRN: {teacher.trn}</ThemedText>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.approve} onPress={onApprove} disabled={processing}>
          {processing ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.approveText}>Approve</ThemedText>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.reject} onPress={onReject} disabled={processing}>
          <ThemedText style={styles.rejectText}>Reject</ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    margin: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    alignItems: 'center',
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignSelf: 'center',
    marginBottom: 12,
    backgroundColor: '#e0e7ef',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '90%',
    height: '70%',
    borderRadius: 16,
    backgroundColor: '#fff',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 30,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 24,
    padding: 4,
  },
  teacherName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  email: {
    fontSize: 14,
    color: '#888',
    marginBottom: 2,
    textAlign: 'center',
  },
  trn: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    width: '100%',
  },
  approve: {
    backgroundColor: '#22c55e',
    padding: 10,
    borderRadius: 8,
    minWidth: 90,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  reject: {
    backgroundColor: '#ef4444',
    padding: 10,
    borderRadius: 8,
    minWidth: 90,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  approveText: { color: '#fff', fontWeight: 'bold' },
  rejectText: { color: '#fff', fontWeight: 'bold' },
});

export default TeacherVerificationCard;