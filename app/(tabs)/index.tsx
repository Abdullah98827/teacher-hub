import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LogoHeader from '../../components/logoHeader';
import { supabase } from '../../supabase';

export default function HomeScreen() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [userName, setUserName] = useState('Teacher');
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const fetchUserName = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('teachers')
          .select('first_name')
          .eq('id', user.id)
          .single();
        if (profile) {
          setUserName(`${profile.first_name}`);
        }
      }
    };
    fetchUserName();
  }, []);

  const handleLogout = () => {
    setIsLoggingOut(true);
    supabase.auth.signOut()
      .then(({ error }) => {
        if (error) {
          Alert.alert('Error', error.message);
        } else {
          router.replace('/login');
        }
        setIsLoggingOut(false);
      })
      .catch(() => {
        Alert.alert('Error', 'An unexpected error occurred');
        setIsLoggingOut(false);
      });
  };

  return (
    <View className="flex-1 bg-neutral-950 px-5" style={{ paddingTop: insets.top }}>
      {/* LogoHeader at top left */}
      <LogoHeader position="left" />

      {/* Logout button at top right */}
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

      {/* Welcome card */}
      <View className="flex-1 justify-center items-center">
        <View className="bg-white rounded-xl p-8 shadow-lg w-full">
          <Text className="text-3xl font-bold text-cyan-600 mb-4 text-center">Hello {userName}!</Text>
          <Text className="text-base text-gray-700 text-center">Welcome to the Teacher-Hub.</Text>
        </View>
      </View>
    </View>
  );
}
