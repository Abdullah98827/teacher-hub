import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';

export default function OnboardingModal({ visible, onClose, title, description, steps }) {
  const { isDark } = useAppTheme();
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, isDark && styles.containerDark]}>
          <Text style={styles.title}>{title}</Text>
          <Text style={[styles.description, isDark && styles.descriptionDark]}>{description}</Text>
          {steps && steps.length > 0 && (
            <View style={styles.steps}>
              {steps.map((step, idx) => (
                <Text key={idx} style={[styles.step, isDark && styles.stepDark]}>{`• ${step}`}</Text>
              ))}
            </View>
          )}
          <TouchableOpacity
            style={[styles.button, isDark && styles.buttonDark]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={[styles.buttonText, isDark && styles.buttonTextDark]}>Got it!</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0 2px 16px rgba(0,0,0,0.2)' },
      default: { elevation: 4 },
    }),
  },
  containerDark: {
    backgroundColor: '#0f172a', // slate-900
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
    color: '#0891b2', // cyan-600
  },
  description: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
    color: '#64748b', // slate-400
  },
  descriptionDark: {
    color: '#cbd5e1', // slate-300
  },
  steps: {
    marginBottom: 20,
    alignSelf: 'stretch',
  },
  step: {
    fontSize: 15,
    marginBottom: 6,
    textAlign: 'left',
    color: '#334155', // slate-700
  },
  stepDark: {
    color: '#e0f2fe', // cyan-100
  },
  button: {
    backgroundColor: '#06b6d4', // cyan-500
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 32,
  },
  buttonDark: {
    backgroundColor: '#22d3ee', // cyan-400
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  buttonTextDark: {
    color: '#0f172a', // slate-900
  },
});
