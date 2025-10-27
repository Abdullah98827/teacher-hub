import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../supabase';

export default function HomeScreen() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleLogout = () => {
    setIsLoggingOut(true);
    supabase.auth.signOut().then(({ error }) => {
      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Success', 'You have been logged out.', [
          { text: 'OK', onPress: () => router.replace('/login') }
        ]);
      }
      setIsLoggingOut(false);
    }).catch(() => {
      Alert.alert('Error', 'An unexpected error occurred');
      setIsLoggingOut(false);
    });
  };

  return (
    <View className="flex-1 items-center justify-center bg-yellow-100 relative" style={{ paddingTop: insets.top }}>
      <TouchableOpacity 
        className="absolute top-4 right-4 bg-red-500 p-3 rounded-full shadow-lg" 
        onPress={handleLogout} 
        disabled={isLoggingOut}
        style={{ zIndex: 1 }}
      >
        {isLoggingOut ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text className="text-white font-bold">Logout</Text>
        )}
      </TouchableOpacity>

      <View className="bg-white rounded-lg p-8 m-4 shadow-lg">
        <Text className="text-3xl font-bold text-red-600 mb-4 text-center">Hello, Abdullah!</Text>
        <Text className="text-base text-green-700 mb-6 text-center">Welcome to the Teacher-Hub.</Text>
      </View>
    </View>
  );
}