import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../supabase';

export default function Logout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);

  const handleLogout = () => {
    setLoading(true);
    supabase.auth.signOut().then(({ error }) => {
      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Success', 'You have been logged out.', [
          { text: 'OK', onPress: () => router.replace({ pathname: '/login' }) }
        ]);
      }
      setLoading(false);
    }).catch(() => {
      Alert.alert('Error', 'An unexpected error occurred');
      setLoading(false);
    });
  };

  useEffect(() => {
    handleLogout();
  }, []);

  return (
    <View className="flex-1 justify-center items-center p-5 bg-white" style={{ paddingTop: insets.top }}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text className="text-lg text-center mt-4 text-gray-600">Logging out...</Text>
    </View>
  );
}