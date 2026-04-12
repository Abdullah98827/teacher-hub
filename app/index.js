import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LogoHeader from "../components/logoHeader";
import ScreenWrapper from "../components/ScreenWrapper";
import { ThemedText } from "../components/themed-text";
import { useAppTheme } from "../hooks/useAppTheme";
import { supabase } from "../supabase";

export default function Index() {
  const [isChecking, setIsChecking] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { bg, bgCard, border, textPrimary, textSecondary, isDark } = useAppTheme();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    const timeoutId = setTimeout(() => setIsChecking(false), 3000);

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        clearTimeout(timeoutId);
        setIsChecking(false);
        if (session) {
          setIsLoggedIn(true);
          router.replace("/(tabs)");
        } else {
          setIsLoggedIn(false);
        }
      })
      .catch(() => {
        clearTimeout(timeoutId);
        setIsChecking(false);
        setIsLoggedIn(false);
      });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) setIsLoggedIn(false);
    });

    return () => {
      clearTimeout(timeoutId);
      subscription?.subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (!isChecking && !isLoggedIn) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]).start();
    }
  }, [isChecking, isLoggedIn]);

  const features = [
    {
      icon: "share-social-outline",
      title: "Share Teaching Resources",
      description: "Upload and share lesson plans, worksheets and materials with fellow educators",
      color: "#06b6d4",
    },
    {
      icon: "people-outline",
      title: "Build Your Network",
      description: "Follow and connect with UK teachers across subjects and schools",
      color: "#0891b2",
    },
    {
      icon: "chatbubbles-outline",
      title: "Direct Messaging",
      description: "Message educators directly and collaborate on teaching ideas",
      color: "#0e7490",
    },
    {
      icon: "shield-checkmark-outline",
      title: "Verified Educators Only",
      description: "Every member is verified using their Teacher Reference Number (TRN)",
      color: "#155e75",
    },
  ];

  const membershipPerks = [
  { icon: "checkmark-circle", text: "Access to resources in your chosen subject(s)" },
  { icon: "checkmark-circle", text: "Subject-specific group chats for discussion & collaboration" },
  { icon: "checkmark-circle", text: "Upload and share your own teaching resources" },
  { icon: "checkmark-circle", text: "Direct messaging with fellow educators" },
  { icon: "checkmark-circle", text: "Follow and be followed by other teachers" },
];

  if (isChecking) {
    return (
      <View className={`flex-1 justify-center items-center ${bg}`} style={{ paddingTop: insets.top }}>
        <Image
          source={require("../assets/images/splash.png")}
          style={{ width: 100, height: 100, marginBottom: 12 }}
        />
        <ThemedText className="text-cyan-400 text-base">Loading Teacher Hub...</ThemedText>
      </View>
    );
  }

  if (isLoggedIn) return null;

  const cardBg = isDark ? "rgba(6,182,212,0.06)" : "rgba(8,145,178,0.04)";
  const cardBorder = isDark ? "rgba(6,182,212,0.15)" : "rgba(8,145,178,0.15)";

  return (
    <ScreenWrapper>
      {/* Logo — tapping goes back to this index page (no-op here, but consistent on login/signup) */}
      <LogoHeader
        position="left"
        showNotificationIcon={false}
        showSignOutIcon={false}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 36 }}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* ── Hero ── */}
          <View style={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: 20 }}>
            {/* Badge */}
            <View style={{
              backgroundColor: isDark ? "rgba(6,182,212,0.12)" : "rgba(8,145,178,0.08)",
              borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
              alignSelf: "flex-start", marginBottom: 14,
              borderWidth: 1, borderColor: cardBorder,
            }}>
              <Text style={{ color: "#06b6d4", fontSize: 11, fontWeight: "700", letterSpacing: 1 }}>
                🇬🇧  FOR UK TEACHERS ONLY
              </Text>
            </View>

            <Text style={{
              fontSize: 30, fontWeight: "800",
              color: isDark ? "#f1f5f9" : "#0f172a",
              lineHeight: 36, marginBottom: 10,
            }}>
              The Professional{"\n"}
              <Text style={{ color: "#06b6d4" }}>Educator Community</Text>
            </Text>

            <Text style={{
              fontSize: 14, color: isDark ? "#94a3b8" : "#64748b",
              lineHeight: 22, marginBottom: 22,
            }}>
              A dedicated platform for verified UK teachers to share resources,
              connect with peers, and grow professionally.
            </Text>

            {/* CTA Buttons */}
            <TouchableOpacity
              onPress={() => router.push("/signup")}
              style={{
                backgroundColor: "#0891b2", borderRadius: 12,
                paddingVertical: 14, flexDirection: "row",
                alignItems: "center", justifyContent: "center",
                gap: 8, marginBottom: 10,
              }}
              activeOpacity={0.85}
            >
              <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>
                Join Teacher-Hub
              </Text>
              <Ionicons name="arrow-forward" size={17} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/login")}
              style={{
                borderRadius: 12, paddingVertical: 13,
                flexDirection: "row", alignItems: "center", justifyContent: "center",
                borderWidth: 1.5, borderColor: isDark ? "rgba(6,182,212,0.4)" : "rgba(8,145,178,0.35)",
              }}
              activeOpacity={0.8}
            >
              <Text style={{ color: "#0891b2", fontSize: 15, fontWeight: "600" }}>
                Sign In to Your Account
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── How It Works ── */}
          <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
            <Text style={{
              fontSize: 16, fontWeight: "700",
              color: isDark ? "#f1f5f9" : "#0f172a", marginBottom: 12,
            }}>
              How It Works
            </Text>
            <View style={{ gap: 8 }}>
              {[
                { step: "1", title: "Apply & Verify", desc: "Sign up with your TRN, an admin verifies you within 24-48 hours" },
                { step: "2", title: "Choose a Membership", desc: "Select a plan to unlock full platform access - payment required" },
                { step: "3", title: "Start Connecting", desc: "Share resources, message teachers, and grow your network" },
              ].map((item, i) => (
                <View key={i} style={{
                  backgroundColor: cardBg, borderRadius: 12,
                  borderWidth: 1, borderColor: cardBorder,
                  padding: 14, flexDirection: "row", alignItems: "flex-start", gap: 12,
                }}>
                  <View style={{
                    width: 32, height: 32, borderRadius: 16,
                    backgroundColor: "#0891b2", alignItems: "center",
                    justifyContent: "center", flexShrink: 0,
                  }}>
                    <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}>{item.step}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontSize: 13, fontWeight: "700",
                      color: isDark ? "#e2e8f0" : "#0f172a", marginBottom: 2,
                    }}>{item.title}</Text>
                    <Text style={{ fontSize: 12, color: isDark ? "#64748b" : "#94a3b8", lineHeight: 17 }}>
                      {item.desc}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Features */}
          <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
            <Text style={{
              fontSize: 16, fontWeight: "700",
              color: isDark ? "#f1f5f9" : "#0f172a", marginBottom: 12,
            }}>
              What You Get
            </Text>
            <View style={{ gap: 8 }}>
              {features.map((feature, index) => (
                <View key={index} style={{
                  backgroundColor: cardBg, borderRadius: 12,
                  borderWidth: 1, borderColor: cardBorder,
                  padding: 14, flexDirection: "row", alignItems: "center", gap: 12,
                }}>
                  <View style={{
                    width: 40, height: 40, borderRadius: 10,
                    backgroundColor: feature.color + "18",
                    alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <Ionicons name={feature.icon} size={20} color={feature.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontSize: 13, fontWeight: "700",
                      color: isDark ? "#e2e8f0" : "#0f172a", marginBottom: 2,
                    }}>{feature.title}</Text>
                    <Text style={{ fontSize: 12, color: isDark ? "#64748b" : "#94a3b8", lineHeight: 17 }}>
                      {feature.description}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Membership Notice */}
<View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
  <View style={{
    backgroundColor: isDark ? "rgba(251,191,36,0.08)" : "rgba(251,191,36,0.06)",
    borderRadius: 14, borderWidth: 1,
    borderColor: isDark ? "rgba(251,191,36,0.25)" : "rgba(251,191,36,0.3)",
    padding: 16,
  }}>
    {/* Header */}
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <Ionicons name="card-outline" size={20} color="#f59e0b" />
      <Text style={{ fontSize: 14, fontWeight: "700", color: "#f59e0b" }}>
        Membership Required
      </Text>
    </View>

    <Text style={{
      fontSize: 12, color: isDark ? "#94a3b8" : "#64748b",
      lineHeight: 19, marginBottom: 14,
    }}>
      After your account is verified, a paid membership is required to access
      the platform. Plans are available by subject. A credit or debit card is needed.
    </Text>

    {/* Pricing Cards */}
    <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
      {/* Single Subject */}
      <View style={{
        flex: 1, backgroundColor: isDark ? "rgba(6,182,212,0.08)" : "rgba(8,145,178,0.06)",
        borderRadius: 10, borderWidth: 1,
        borderColor: isDark ? "rgba(6,182,212,0.2)" : "rgba(8,145,178,0.2)",
        padding: 12, alignItems: "center",
      }}>
        <Text style={{ fontSize: 10, fontWeight: "600", color: isDark ? "#94a3b8" : "#64748b", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>
          Single Subject
        </Text>
        <Text style={{ fontSize: 22, fontWeight: "800", color: "#06b6d4", lineHeight: 26 }}>
          £9.99
        </Text>
        <Text style={{ fontSize: 10, color: isDark ? "#64748b" : "#94a3b8" }}>
          per month
        </Text>
      </View>

      {/* Multi Subject */}
      <View style={{
        flex: 1, backgroundColor: isDark ? "rgba(245,158,11,0.1)" : "rgba(245,158,11,0.07)",
        borderRadius: 10, borderWidth: 1.5,
        borderColor: isDark ? "rgba(245,158,11,0.35)" : "rgba(245,158,11,0.4)",
        padding: 12, alignItems: "center",
      }}>
        <View style={{
          backgroundColor: "#f59e0b", borderRadius: 4,
          paddingHorizontal: 6, paddingVertical: 2, marginBottom: 4,
        }}>
          <Text style={{ fontSize: 9, fontWeight: "700", color: "#fff", letterSpacing: 0.5 }}>
            MULTI SUBJECTS
          </Text>
        </View>
        <Text style={{ fontSize: 22, fontWeight: "800", color: "#f59e0b", lineHeight: 26 }}>
          £17.99
        </Text>
        <Text style={{ fontSize: 10, color: isDark ? "#64748b" : "#94a3b8" }}>
          per month
        </Text>
        <Text style={{ fontSize: 10, color: isDark ? "#64748b" : "#94a3b8" }}>
          for 2 subjects
        </Text>
      </View>
    </View>

    {/* Perks */}
    <View style={{ gap: 6 }}>
      {membershipPerks.map((perk, i) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name={perk.icon} size={14} color="#06b6d4" />
          <Text style={{ fontSize: 12, color: isDark ? "#94a3b8" : "#64748b" }}>
            {perk.text}
          </Text>
        </View>
      ))}
    </View>
  </View>
</View>

          {/* Trust / Verification Banner */}
          <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
            <View style={{
              backgroundColor: isDark ? "rgba(6,182,212,0.06)" : "rgba(8,145,178,0.04)",
              borderRadius: 12, borderWidth: 1, borderColor: cardBorder,
              padding: 14, flexDirection: "row", alignItems: "center", gap: 12,
            }}>
              <View style={{
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: isDark ? "rgba(6,182,212,0.15)" : "rgba(8,145,178,0.1)",
                alignItems: "center", justifyContent: "center",
              }}>
                <Ionicons name="shield-checkmark" size={20} color="#06b6d4" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 13, fontWeight: "700",
                  color: isDark ? "#e2e8f0" : "#0f172a", marginBottom: 2,
                }}>
                  Verified Professionals Only
                </Text>
                <Text style={{ fontSize: 12, color: isDark ? "#64748b" : "#94a3b8", lineHeight: 17 }}>
                  Every member is manually verified using their Teacher Reference Number.
                  No unverified users can access the platform.
                </Text>
              </View>
            </View>
          </View>

          {/* ── Bottom CTA ── */}
          <View style={{ paddingHorizontal: 20 }}>
            <TouchableOpacity
              onPress={() => router.push("/signup")}
              style={{
                backgroundColor: "#0891b2", borderRadius: 12,
                paddingVertical: 14, flexDirection: "row",
                alignItems: "center", justifyContent: "center", gap: 8,
              }}
              activeOpacity={0.85}
            >
              <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>
                Apply to Join Teacher Hub
              </Text>
              <Ionicons name="arrow-forward" size={17} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Footer  */}
          {/* <View style={{
            flexDirection: "row", justifyContent: "center", gap: 20,
            marginTop: 24, paddingTop: 16, marginHorizontal: 20,
            borderTopWidth: 1, borderTopColor: cardBorder,
          }}>
            {["Privacy", "Terms", "Contact"].map((item, i) => (
              <TouchableOpacity key={i} onPress={() => item === "Contact" && router.push("/contact")}>
                <Text style={{ color: "#0891b2", fontSize: 12 }}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View> */}

        </Animated.View>
      </ScrollView>
    </ScreenWrapper>
  );
}