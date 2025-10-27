import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../supabase';

export default function AuthCallback() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/(tabs)');
      } else {
        router.replace('/login');
      }
    });
  }, [router]);

  return (
    <View className="flex-1 justify-center items-center bg-gray-100" style={{ paddingTop: insets.top }}>
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );
}