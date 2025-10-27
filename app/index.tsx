import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react'; // Added React for TS support
import { ActivityIndicator, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../supabase';

export default function Index() {
  const [isChecking, setIsChecking] = useState(true);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setIsChecking(false);
      router.replace('/login');
    }, 3000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeoutId);
      setIsChecking(false);
      if (session) {
        router.replace('/(tabs)');
      } else {
        router.replace('/login');
      }
    }).catch(() => {
      clearTimeout(timeoutId);
      setIsChecking(false);
      router.replace('/login');
    });

    return () => clearTimeout(timeoutId);
  }, [router]);

  // Use isChecking to conditionally show loading (fixes ESLint)
  if (isChecking) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100" style={{ paddingTop: insets.top }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text className="mt-4 text-lg text-gray-600">Loading...</Text>
      </View>
    );
  }

  // After check, return null to let routing take over (no blank screen)
  return null;
}