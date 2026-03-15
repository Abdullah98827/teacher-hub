// Utility for managing onboarding walkthrough state per user and per screen
// Uses AsyncStorage for native and localStorage for web
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const STORAGE_KEY_PREFIX = 'onboarding_seen_';

// Returns a key like onboarding_seen_<userId>_<screen>
function getKey(userId, screen) {
  return `${STORAGE_KEY_PREFIX}${userId}_${screen}`;
}

export async function hasSeenOnboarding(userId, screen) {
  if (!userId) return false;
  const key = getKey(userId, screen);
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem(key) === 'true';
    }
    return false;
  } else {
    const value = await AsyncStorage.getItem(key);
    return value === 'true';
  }
}

export async function setOnboardingSeen(userId, screen) {
  if (!userId) return;
  const key = getKey(userId, screen);
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, 'true');
    }
  } else {
    await AsyncStorage.setItem(key, 'true');
  }
}
