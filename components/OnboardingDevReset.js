// components/OnboardingDevReset.js
// A dev utility to clear onboarding state for the current user for all screens/features
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

const SCREENS = [
  'dashboard',
  'library',
  'community',
  'eal-adapter',
  'translate',
];

export default function OnboardingDevReset() {
  const { user } = useAuth();

  const handleReset = async () => {
    if (!user || !user.id) return;
    for (const screen of SCREENS) {
      await AsyncStorage.removeItem(`onboarding_seen_${user.id}_${screen}`);
    }
    alert('Onboarding state reset! Reload the screen to test onboarding again.');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={handleReset}>
        <Text style={styles.buttonText}>Reset Onboarding (Dev Only)</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 16,
  },
  button: {
    backgroundColor: '#22d3ee',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
