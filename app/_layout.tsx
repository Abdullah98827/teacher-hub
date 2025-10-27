import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase } from '../supabase';

export default function RootLayout() {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setIsLoading(false);
      router.replace({ pathname: '/login' });
    }, 5000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeoutId);
      setIsLoading(false);
      if (session) {
        router.replace({ pathname: '/(tabs)' });
      } else {
        router.replace({ pathname: '/login' });
      }
    }).catch((err) => {
      clearTimeout(timeoutId);
      setIsLoading(false);
      router.replace({ pathname: '/login' });
    });

    return () => clearTimeout(timeoutId);
  }, [router]);

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }} initialRouteName="login">
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="auth-callback" />
        <Stack.Screen name="logout" />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      {isLoading && (
        <View className="absolute inset-0 justify-center items-center bg-gray-100 z-50">
          <ActivityIndicator size="large" color="#007AFF" />
          <Text className="mt-4 text-lg text-gray-600">Loading app...</Text>
        </View>
      )}
    </SafeAreaProvider>
  );
}