import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);

    // Step 1: Sign in with email and password
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setLoading(false);
      Alert.alert('Login Error', error.message);
      return;
    }

    if (!data.session) {
      setLoading(false);
      Alert.alert('Error', 'Login failed. Please try again.');
      return;
    }

    // Step 2: Check if user is verified
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('verified')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      setLoading(false);
      await supabase.auth.signOut();
      Alert.alert('Error', 'Could not load profile. Please contact admin.');
      return;
    }

    // Step 3: Block login if not verified
    if (!profile.verified) {
      setLoading(false);
      await supabase.auth.signOut();
      Alert.alert(
        'Account Not Verified', 
        'Your account is pending admin approval. You will receive an email once your TRN and photo are verified.'
      );
      return;
    }

    // Step 4: Allow login if verified
    setLoading(false);
    router.replace('/(tabs)');
  };

  return (
    <View className="flex-1 justify-center p-5 bg-white" style={{ paddingTop: insets.top }}>
      <Text className="text-2xl font-bold text-center mb-5">Login</Text>
      <TextInput
        className="border border-gray-300 p-3 mb-3 rounded-md"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        editable={!loading}
      />
      <TextInput
        className="border border-gray-300 p-3 mb-3 rounded-md"
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!loading}
      />
      <TouchableOpacity
        className={`bg-blue-500 p-4 rounded-md mb-3 ${loading ? 'opacity-50' : ''}`}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text className="text-white text-center font-bold">
          {loading ? 'Logging in...' : 'Login'}
        </Text>
      </TouchableOpacity>
      <Link href="/signup" asChild>
        <TouchableOpacity className="p-3" disabled={loading}>
          <Text className="text-center text-blue-500">Dont have an account? Sign up</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}