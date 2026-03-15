import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { hasSeenOnboarding, setOnboardingSeen } from '../utils/onboardingHelpers';
import OnboardingModal from './OnboardingModal';

export default function TranslateOnboarding({ children }) {
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (user && user.id) {
      hasSeenOnboarding(user.id, 'translate').then((seen) => {
        if (!seen) setShowOnboarding(true);
      });
    }
  }, [user]);

  const handleClose = () => {
    if (user && user.id) setOnboardingSeen(user.id, 'translate');
    setShowOnboarding(false);
  };

  return (
    <>
      <OnboardingModal
        visible={showOnboarding}
        onClose={handleClose}
        title="Translate Feature"
        description="Here's what you can do:"
        steps={[
          'Translate resources into multiple languages',
          'Choose your target language',
          'Copy or share translated content',
        ]}
      />
      {children}
    </>
  );
}
