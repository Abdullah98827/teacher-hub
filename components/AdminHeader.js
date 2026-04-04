import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';
import { ThemedText } from './themed-text';

export default function AdminHeader({ title, subtitle, onBack }) {
  const router = useRouter();
  const { isDark } = useAppTheme();

  const bgColor = isDark ? '#0a0a0a' : '#f8fafc';
  const borderColor = isDark ? 'rgba(6,182,212,0.15)' : 'rgba(6,182,212,0.10)';
  const backButtonBg = isDark ? 'rgba(34,211,238,0.15)' : '#e0f2fe';
  const titleColor = isDark ? '#22d3ee' : '#0891b2';
  const subtitleColor = isDark ? '#9ca3af' : '#64748b';

  return (
    <View
      style={{
        width: '100%',
        backgroundColor: bgColor,
        borderBottomWidth: 1,
        borderBottomColor: borderColor,
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
          backgroundColor: backButtonBg,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 16,
        }}
      >
        <Ionicons name="arrow-back" size={22} color="#22d3ee" />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <ThemedText style={{ fontSize: 22, fontWeight: 'bold', color: titleColor, marginBottom: 2 }}>
          {title}
        </ThemedText>
        {subtitle && (
          <ThemedText style={{ fontSize: 15, color: subtitleColor, fontWeight: '500' }}>{subtitle}</ThemedText>
        )}
      </View>
    </View>
  );
}
