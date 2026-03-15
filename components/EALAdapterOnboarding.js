import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { hasSeenOnboarding, setOnboardingSeen } from '../utils/onboardingHelpers';
import OnboardingModal from './OnboardingModal';

export default function EALAdapterOnboarding({ children }) {
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (user && user.id) {
      hasSeenOnboarding(user.id, 'eal-adapter').then((seen) => {
        if (!seen) setShowOnboarding(true);
      });
    }
  }, [user]);

  const handleClose = () => {
    if (user && user.id) setOnboardingSeen(user.id, 'eal-adapter');
    setShowOnboarding(false);
  };

  return (
    <>
      <OnboardingModal
        visible={showOnboarding}
        onClose={handleClose}
        title="EAL Adapter Feature"
        description="Here's what you can do:"
        steps={[
          'Adapt resources for English as an Additional Language (EAL) learners',
          'Select a language and simplify content',
          'Download or share adapted resources',
        ]}
      />
      {children}
    </>
  );
}
