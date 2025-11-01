import * as ImagePicker from 'expo-image-picker';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import LogoHeader from '../components/logoHeader';
import ScreenWrapper from '../components/ScreenWrapper';
import { supabase } from '../supabase';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [trn, setTrn] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const isValidEmail = (emailStr: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);

  const showToast = (type: 'success' | 'error', title: string, message: string) => {
    Toast.show({ type, text1: title, text2: message });
  };

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });
    if (!result.canceled && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSignup = async () => {
    if (!email || !password || !firstName || !lastName || !trn || !photoUri || !consent) {
      showToast('error', 'Missing Info', 'Please fill all fields, upload photo and accept consent');
      return;
    }
    if (!isValidEmail(email)) {
      showToast('error', 'Invalid Email', 'Please enter a valid email');
      return;
    }
    if (password.length < 6) {
      showToast('error', 'Weak Password', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { verified: false } }
    });

    if (error) {
      setLoading(false);
      showToast('error', 'Signup Failed', error.message);
      return;
    }

    const userId = data.user?.id;
    if (!userId) {
      setLoading(false);
      showToast('error', 'Signup Failed', 'Could not create account. Try again.');
      return;
    }

    const cleanEmail = email.replace(/[@.]/g, '_');
    const fileName = `${cleanEmail}_TRN${trn}.jpg`;

    try {
      const response = await fetch(photoUri!);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('teacher-passes')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) {
        setLoading(false);
        showToast('error', 'Photo Upload Failed', `${uploadError.message}. Account created but needs photo—contact admin.`);
        return;
      }
    } catch {
      setLoading(false);
      showToast('error', 'Upload Error', 'Could not process photo. Try again.');
      return;
    }

    const profileData = {
      id: userId,
      email,
      first_name: firstName,
      last_name: lastName,
      trn,
      photo_url: fileName,
      verified: false
    };

    const { error: profileError } = await supabase
      .from('teachers')
      .insert(profileData);

    if (profileError) {
      setLoading(false);
      showToast('error', 'Profile Error', `${profileError.message}. Hint: ${profileError.hint || 'Check TRN uniqueness'}`);
      return;
    }

    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({ id: userId, role: 'teacher' });

    if (roleError) {
      console.error('Role creation error:', roleError);
    }

    setLoading(false);
    showToast('success', 'Signup Complete', 'Admin will verify your TRN and photo within 24–48 hours.');

    setTimeout(() => {
      router.push('/login');
    }, 1500);
  };

  return (
    <ScreenWrapper>
      <LogoHeader position="left" />

      <View className="flex-1 justify-center items-center">
        <View className="w-full max-w-md bg-neutral-900 p-6 rounded-xl shadow-lg">
          <Text className="text-3xl font-bold text-center mb-6 text-cyan-400 tracking-wide">Sign Up</Text>

          <TextInput className="bg-neutral-800 border border-neutral-700 text-gray-100 p-4 mb-3 rounded-xl" placeholder="First Name" value={firstName} onChangeText={setFirstName} autoCapitalize="words" placeholderTextColor="#9CA3AF" />
          <TextInput className="bg-neutral-800 border border-neutral-700 text-gray-100 p-4 mb-3 rounded-xl" placeholder="Last Name" value={lastName} onChangeText={setLastName} autoCapitalize="words" placeholderTextColor="#9CA3AF" />
          <TextInput className="bg-neutral-800 border border-neutral-700 text-gray-100 p-4 mb-3 rounded-xl" placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" editable={!loading} placeholderTextColor="#9CA3AF" />
          <TextInput className="bg-neutral-800 border border-neutral-700 text-gray-100 p-4 mb-3 rounded-xl" placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry editable={!loading} placeholderTextColor="#9CA3AF" />
          <TextInput className="bg-neutral-800 border border-neutral-700 text-gray-100 p-4 mb-3 rounded-xl" placeholder="Teacher Reference Number (TRN)" value={trn} onChangeText={setTrn} keyboardType="number-pad" editable={!loading} placeholderTextColor="#9CA3AF" />

          <TouchableOpacity className="bg-cyan-600 hover:bg-cyan-700 p-4 mb-3 rounded-xl shadow-md active:scale-95 transition" onPress={pickPhoto}>
            <Text className="text-white text-center font-bold">Upload Teacher Pass Photo *</Text>
          </TouchableOpacity>

          {photoUri && <Image source={{ uri: photoUri }} className="w-24 h-24 rounded-lg self-center mb-3" />}
          <Text className={`text-sm mb-3 text-center ${photoUri ? 'text-green-500' : 'text-red-500'}`}>
            {photoUri ? 'Photo selected ✓' : 'Photo required'}
          </Text>

          <TouchableOpacity className="flex-row items-center mb-3 p-3" onPress={() => setConsent(!consent)}>
            <View className={`w-5 h-5 border-2 rounded mr-2 ${consent ? 'bg-cyan-600' : 'bg-white'}`} />
            <Text className="flex-1 text-sm text-gray-300">
              I consent to photo verification (deleted after approval)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`p-4 rounded-xl mb-3 shadow-md active:scale-95 transition ${loading ? 'bg-gray-400' : 'bg-cyan-600 hover:bg-cyan-700'}`}
            onPress={handleSignup}
            disabled={loading}
          >
            <Text className="text-white text-center font-bold">
              {loading ? 'Signing up...' : 'Sign Up'}
            </Text>
          </TouchableOpacity>

          <Link href="/login" asChild>
            <TouchableOpacity className="p-3">
              <Text className="text-center text-cyan-400 underline">Already have an account? Login</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>

      <Toast />
    </ScreenWrapper>
  );
}
