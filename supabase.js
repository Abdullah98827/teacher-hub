import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

if (Platform.OS !== 'web') {
  require('react-native-url-polyfill/auto');
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase env vars—add them to your .env file');
}

// On web, use localStorage (only available client-side).
// On native, use AsyncStorage.
function getStorage() {
  if (Platform.OS === 'web') {
    // During SSR window is not defined, so return undefined to let
    // Supabase fall back to in-memory storage.
    if (typeof window === 'undefined') {
      return undefined;
    }
    return window.localStorage;
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  return AsyncStorage;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: getStorage(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});