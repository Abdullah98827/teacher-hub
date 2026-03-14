import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { TouchableOpacity, View } from 'react-native';
import { ThemedText } from './themed-text';

export default function AdminHeader({ title, subtitle, onBack }) {
  const router = useRouter();
  return (
    <View
      style={{
        width: '100%',
        backgroundColor: '#f8fafc',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(6,182,212,0.10)',
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
      }}
    >
      <TouchableOpacity
        onPress={onBack || (() => router.back())}
        activeOpacity={0.7}
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          backgroundColor: '#e0f2fe',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 16,
        }}
      >
        <Ionicons name="arrow-back" size={22} color="#06b6d4" />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <ThemedText style={{ fontSize: 22, fontWeight: 'bold', color: '#0891b2', marginBottom: 2 }}>
          {title}
        </ThemedText>
        {subtitle && (
          <ThemedText style={{ fontSize: 15, color: '#64748b', fontWeight: '500' }}>{subtitle}</ThemedText>
        )}
      </View>
    </View>
  );
}
