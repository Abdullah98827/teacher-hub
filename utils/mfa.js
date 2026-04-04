import { supabase } from '../supabase';

// Add this function to utils/mfa.js
export function getOtpAuthUrlFromEnrollment(data) {
  if (data?.totp?.uri) return data.totp.uri;
  if (data?.totp?.otpauth_url) return data.totp.otpauth_url;
  return null;
}

// Start TOTP enrollment for the current user
export async function startTotpEnrollment() {
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
  if (error) throw error;
  return data;
}

// Challenge and verify TOTP code
export async function verifyTotpEnrollment(factorId, code) {
  // Start challenge
  const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeError) throw challengeError;

  // Verify code
  const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    code,
    challengeId: challengeData.id,
  });
  if (verifyError) throw verifyError;
  return verifyData;
}

// Challenge and verify TOTP code during login
export async function verifyTotpOnLogin(factorId, code, challengeId) {
  const { data, error } = await supabase.auth.mfa.verify({
    factorId,
    code,
    challengeId,
  });
  if (error) throw error;
  return data;
}
