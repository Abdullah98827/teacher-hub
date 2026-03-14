import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ScrollView, TouchableOpacity, View } from "react-native";
import Toast from "react-native-toast-message";
import LogoHeader from "../../components/logoHeader";
import ScreenWrapper from "../../components/ScreenWrapper";
import { ThemedText } from "../../components/themed-text";
import { useAppTheme } from "../../hooks/useAppTheme";

export default function AdminHub() {
  const router = useRouter();
  const { isDark } = useAppTheme();

  const links = [
    {
      label: "Verify Teachers",
      subtitle: "Review & approve teacher accounts",
      route: "/admin/verify",
      icon: "shield-checkmark-outline",
    },
    {
      label: "Manage Memberships",
      subtitle: "View and control user memberships",
      route: "/admin/manage-memberships",
      icon: "card-outline",
    },
    {
      label: "Manage Contact Requests",
      subtitle: "Respond to user enquiries",
      route: "/admin/manage-contact-requests",
      icon: "mail-outline",
    },
    {
      label: "Manage Resources",
      subtitle: "Approve, reject or delete uploads",
      route: "/admin/manage-resources",
      icon: "folder-open-outline",
    },
    {
      label: "Manage Reports",
      subtitle: "Review flagged content & reports",
      route: "/admin/manage-reports",
      icon: "flag-outline",
    },
    {
      label: "Manage Comments",
      subtitle: "Moderate community comments",
      route: "/admin/manage-comments",
      icon: "chatbubbles-outline",
    },
    {
      label: "Manage Subjects",
      subtitle: "Add, edit or remove subjects",
      route: "/admin/manage-subjects",
      icon: "book-outline",
    },
  ];

  const iconBg = isDark ? "rgba(6,182,212,0.12)" : "rgba(8,145,178,0.08)";
  const iconBorder = isDark ? "rgba(6,182,212,0.25)" : "rgba(8,145,178,0.2)";
  const iconColor = isDark ? "#22d3ee" : "#0891b2";
  const chevronColor = isDark ? "#4b5563" : "#d1d5db";

  return (
    <ScreenWrapper>
      <LogoHeader />
      <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 }}>
        <ThemedText
          style={{
            fontSize: 13,
            color: isDark ? "#6b7280" : "#9ca3af",
          }}
        >
          Manage your Teacher-Hub platform
        </ThemedText>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {links.map(({ label, subtitle, route, icon }) => (
          <TouchableOpacity
            key={route}
            activeOpacity={0.7}
            onPress={() => router.push(route)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: isDark ? "#111827" : "#ffffff",
              borderWidth: 1,
              borderColor: isDark ? "#1f2937" : "#e5e7eb",
              borderRadius: 14,
              padding: 14,
              marginBottom: 10,
            }}
          >
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                backgroundColor: iconBg,
                borderWidth: 1,
                borderColor: iconBorder,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 14,
              }}
            >
              <Ionicons name={icon} size={21} color={iconColor} />
            </View>

            <View style={{ flex: 1 }}>
              <ThemedText
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: isDark ? "#f1f5f9" : "#0f172a",
                }}
              >
                {label}
              </ThemedText>
              <ThemedText
                style={{
                  fontSize: 12,
                  marginTop: 1,
                  color: isDark ? "#6b7280" : "#9ca3af",
                }}
              >
                {subtitle}
              </ThemedText>
            </View>

            <Ionicons name="chevron-forward" size={18} color={chevronColor} />
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.replace("/(tabs)")}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            marginTop: 14,
            paddingVertical: 14,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: isDark
              ? "rgba(6,182,212,0.25)"
              : "rgba(8,145,178,0.2)",
            backgroundColor: isDark
              ? "rgba(6,182,212,0.08)"
              : "rgba(8,145,178,0.06)",
          }}
        >
          <Ionicons name="arrow-back-outline" size={18} color={iconColor} />
          <ThemedText
            style={{
              fontSize: 15,
              fontWeight: "600",
              color: iconColor,
            }}
          >
            Back to App
          </ThemedText>
        </TouchableOpacity>

        <Toast />
      </ScrollView>
    </ScreenWrapper>
  );
}
