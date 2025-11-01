import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
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

    // ✅ Listen for logout events and redirect immediately
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        router.replace('/login');
      }
    });

    return () => {
      clearTimeout(timeoutId);
      subscription?.subscription.unsubscribe();

    };
  }, [router]);

  if (isChecking) {
    return (
      <View
        className="flex-1 justify-center items-center bg-neutral-950"
        style={{ paddingTop: insets.top }}
      >
        <Image
          source={require('../assets/images/logo.jpg')}
          style={{ width: 120, height: 120, marginBottom: 16 }}
        />
        <Text className="text-cyan-400 text-lg">Loading Teacher Hub...</Text>
      </View>
    );
  }

  return null;
}
