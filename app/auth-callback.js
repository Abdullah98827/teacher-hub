import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../supabase";

export default function AuthCallback() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace("/login");
        return;
      }

      // Check MFA assurance level before routing to app
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (aalData?.nextLevel === 'aal2' && aalData?.currentLevel !== 'aal2') {
        // Session exists but MFA not yet verified — re-challenge
        const { data: factorsData } = await supabase.auth.mfa.listFactors();
        const totpFactor = factorsData?.totp?.[0];

        if (totpFactor) {
          const { data: challenge } = await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
          router.replace({
            pathname: '/mfa-challenge',
            params: { factorId: totpFactor.id, challengeId: challenge.id }
          });
          return;
        }
      }

      router.replace("/(tabs)");
    });
  }, [router]);

  return (
    <View
      className="flex-1 justify-center items-center bg-gray-100"
      style={{ paddingTop: insets.top }}
    >
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );
}