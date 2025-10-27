import * as ImagePicker from 'expo-image-picker';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../supabase';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [trn, setTrn] = useState('');
  const [photoUri, setPhotoUri] = useState(null);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });
    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSignup = async () => {
    if (!email || !password || !trn || !photoUri || !consent) {
      Alert.alert('Error', 'Please fill all fields, upload photo and accept consent');
      return;
    }

    setLoading(true);

    // Step 1: Create account FIRST (so user is authenticated for storage upload)
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: {
          verified: false
        }
      }
    });
    
    if (error) {
      setLoading(false);
      Alert.alert('Error', error.message);
      return;
    }

    const userId = data.user.id;

    // Step 2: Now upload photo with identifiable name (email_trn.jpg)
    const cleanEmail = email.replace('@', '_at_').replace(/\./g, '_');
    const fileName = `${cleanEmail}_TRN${trn}.jpg`;
    const photo = {
      uri: photoUri,
      type: 'image/jpeg',
      name: fileName,
    } as any;

    const formData = new FormData();
    formData.append('', photo);

    const { error: uploadError } = await supabase.storage
      .from('teacher-passes')
      .upload(fileName, formData, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      setLoading(false);
      Alert.alert('Error', `Photo upload failed: ${uploadError.message}. Your account exists but needs photo. Contact admin.`);
      return;
    }

    // Step 3: Save profile with verified=false
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ 
        id: userId, 
        trn, 
        photo_url: fileName,
        verified: false
      });

    setLoading(false);

    if (profileError) {
      Alert.alert('Error', 'Account created but profile save failed. Contact admin.');
      return;
    }

    Alert.alert(
      'Success', 
      'Account created! An admin will verify your TRN and photo within 24-48 hours. You cannot login until approved.', 
      [{ text: 'OK', onPress: () => router.push('/login') }]
    );
  };

  return (
    <View className="flex-1 justify-center p-5 bg-white" style={{ paddingTop: insets.top }}>
      <Text className="text-2xl font-bold text-center mb-5">Sign Up</Text>
      
      <TextInput
        className="border border-gray-300 p-3 mb-3 rounded-md"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TextInput
        className="border border-gray-300 p-3 mb-3 rounded-md"
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <TextInput
        className="border border-gray-300 p-3 mb-3 rounded-md"
        placeholder="Teacher Reference Number (TRN)"
        value={trn}
        onChangeText={setTrn}
        keyboardType="number-pad"
      />
      
      <TouchableOpacity className="bg-blue-500 p-3 mb-3 rounded-md" onPress={pickPhoto}>
        <Text className="text-white text-center">Upload Teacher Pass Photo *</Text>
      </TouchableOpacity>
      
      {photoUri && <Text className="text-sm text-green-600 mb-3">Photo selected ✓</Text>}
      {!photoUri && <Text className="text-sm text-red-600 mb-3">Photo required</Text>}
      
      <TouchableOpacity className="flex-row items-center mb-3" onPress={() => setConsent(!consent)}>
        <View className={`w-5 h-5 border-2 rounded mr-2 ${consent ? 'bg-blue-500' : 'bg-white'}`} />
        <Text className="flex-1 text-sm">I consent to photo verification (deleted after approval)</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        className={`p-4 rounded-md mb-3 ${loading ? 'bg-gray-400' : 'bg-blue-500'}`}
        onPress={handleSignup} 
        disabled={loading}
      >
        <Text className="text-white text-center font-bold">
          {loading ? 'Signing up...' : 'Sign Up'}
        </Text>
      </TouchableOpacity>
      
      <Link href="/login" asChild>
        <TouchableOpacity className="p-3">
          <Text className="text-center text-blue-500">Already have an account? Login</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}