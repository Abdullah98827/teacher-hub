import { useRouter } from "expo-router";
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from "react-native-toast-message";
import LogoHeader from "../components/logoHeader";
import { ThemedText } from "../components/themed-text";
import { ThemedTextInput } from "../components/themed-textinput";
import { useAppTheme } from "../hooks/useAppTheme";
import { getOtpAuthUrlFromEnrollment, startTotpEnrollment, verifyTotpEnrollment } from '../utils/mfa';

function MFASetupScreen() {
  const [qrCode, setQrCode] = useState(null);
  const [factorId, setFactorId] = useState(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [otpAuthUrl, setOtpAuthUrl] = useState(null);

  const router = useRouter();
  const { bg, bgCard, border, textPrimary, textSecondary } = useAppTheme();

  const alreadyEnrolledError = (err) => {
    return (
      err?.message?.toLowerCase().includes('already exists') ||
      err?.message?.toLowerCase().includes('already enrolled')
    );
  };

  useEffect(() => {
    const checkMfaEnrollment = async () => {
      setLoading(true);
      try {
        const data = await startTotpEnrollment();
        setQrCode(data.totp.qr_code);
        setOtpAuthUrl(getOtpAuthUrlFromEnrollment(data));
        setFactorId(data.id);
        setEnrolled(false);
      } catch (err) {
        if (alreadyEnrolledError(err)) {
          setEnrolled(true);
        }
      }
      setLoading(false);
    };
    checkMfaEnrollment();
  }, []);

  const handleStartEnrollment = async () => {
    setLoading(true);
    try {
      const data = await startTotpEnrollment();
      setQrCode(data.totp.qr_code);
      setOtpAuthUrl(getOtpAuthUrlFromEnrollment(data));
      setFactorId(data.id);
      setEnrolled(false);
    } catch (err) {
      if (alreadyEnrolledError(err)) {
        setEnrolled(true);
      } else {
        Toast.show({
          type: "error",
          text1: "MFA Enrollment Error",
          text2: err.message || "Something went wrong. Please try again.",
        });
      }
    }
    setLoading(false);
  };

  const handleVerify = async () => {
    if (!code) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Code needs to be non-empty",
      });
      return;
    }
    setLoading(true);
    try {
      await verifyTotpEnrollment(factorId, code);
      setEnrolled(true);
      setQrCode(null);
      setOtpAuthUrl(null);
      Toast.show({
        type: "success",
        text1: "MFA enrollment complete!",
      });
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Verification Error",
        text2: err.message || "Invalid code. Please try again.",
      });
    }
    setLoading(false);
  };

  return (
    <SafeAreaView className={`flex-1 ${bg}`} edges={['top']}>
      <LogoHeader position="left" />
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 24,
          paddingVertical: 32,
        }}
      >
        <View className={`w-full max-w-md ${bgCard} rounded-2xl p-8 border ${border} shadow-lg items-center`}>
          <ThemedText className="text-2xl font-bold text-cyan-400 mb-2 text-center">
            Set Up Multi-Factor Authentication
          </ThemedText>
          <ThemedText className={`mb-6 ${textSecondary} text-center`}>
            Protect your account by enabling an extra layer of security.
          </ThemedText>

          {loading && (
            <ActivityIndicator size="large" color="#22d3ee" style={{ marginBottom: 16 }} />
          )}

          {enrolled && !qrCode && !loading && (
            <>
              <ThemedText className="text-green-500 mt-4 text-lg font-semibold text-center">
                MFA is already enabled for your account!
              </ThemedText>
              <ThemedText className={`mt-2 mb-6 ${textSecondary} text-center`}>
                If you want to reset MFA, please remove your existing factor in your account security settings.
              </ThemedText>
            </>
          )}

          {!qrCode && !enrolled && !loading && (
            <TouchableOpacity
              className="bg-cyan-600 px-6 py-3 rounded-lg mb-2 w-full"
              onPress={handleStartEnrollment}
              activeOpacity={0.8}
            >
              <ThemedText className="text-white font-bold text-base text-center">
                Start MFA Enrollment
              </ThemedText>
            </TouchableOpacity>
          )}

          {qrCode && !enrolled && (
            <>
              <ThemedText className={`mb-3 ${textSecondary} text-center`}>
                Scan this QR code with your Authenticator app:
              </ThemedText>
              <View style={{
                backgroundColor: "#fff",
                borderRadius: 16,
                padding: 8,
                marginBottom: 16,
                borderWidth: 2,
                borderColor: '#e5e7eb'
              }}>
                {otpAuthUrl ? (
                  <QRCode value={otpAuthUrl} size={200} />
                ) : (
                  <ThemedText className="text-red-500">QR code unavailable</ThemedText>
                )}
              </View>
              <ThemedTextInput
                placeholder="Enter code from app"
                value={code}
                onChangeText={setCode}
                keyboardType="numeric"
                className={`mb-3 w-full ${border} ${bg} px-4 py-2 rounded-lg text-center ${textPrimary}`}
                style={{ maxWidth: 220 }}
              />
              <TouchableOpacity
                className="bg-cyan-600 px-6 py-3 rounded-lg w-full"
                onPress={handleVerify}
                activeOpacity={0.8}
              >
                <ThemedText className="text-white font-bold text-base text-center">
                  Verify Code
                </ThemedText>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity className="mt-8" onPress={() => router.back()}>
            <ThemedText className="text-cyan-400 underline text-center">
              Back to Settings
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            className="mt-4"
            onPress={async () => {
              setQrCode(null);
              setFactorId(null);
              setEnrolled(false);
              setCode('');
              setOtpAuthUrl(null);
              setLoading(true);
              try {
                const data = await startTotpEnrollment();
                setQrCode(data.totp.qr_code);
                setOtpAuthUrl(getOtpAuthUrlFromEnrollment(data));
                setFactorId(data.id);
                setEnrolled(false);
              } catch (err) {
                if (alreadyEnrolledError(err)) {
                  setEnrolled(false);
                  Toast.show({
                    type: "info",
                    text1: "MFA factor still exists",
                    text2: "If you just removed MFA, please wait a minute and try again, or contact support.",
                  });
                }
              }
              setLoading(false);
            }}
          >
            <ThemedText className="text-cyan-400 underline text-center">
              Refresh MFA Status
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <Toast />
    </SafeAreaView>
  );
}

export default MFASetupScreen;