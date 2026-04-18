import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";

export default function MembershipCard({ membership }) {
  const { bgCard, bgCardAlt, border, textPrimary, textMuted, isDark } = useAppTheme();

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const isMulti = membership.tier === "multi";

  // Use consistent color values instead of Tailwind classes
  const cardBgColor = isDark ? "#111827" : "#ffffff"; // gray-900 vs white
  const cardBorderColor = isDark ? "#374151" : "#e5e7eb"; // gray-700 vs gray-200
  const altBgColor = isDark ? "#1f2937" : "#f9fafb"; // gray-800 vs gray-50
  const mutedTextColor = isDark ? "#9ca3af" : "#6b7280"; // gray-400 vs gray-500

  return (
    <View
      style={{
        backgroundColor: cardBgColor,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: cardBorderColor,
        padding: 16,
        marginBottom: 12,
      }}
    >
      {/* Email and tier badge */}
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <View
              style={{
                backgroundColor: isDark ? "rgba(6, 182, 212, 0.2)" : "rgba(6, 182, 212, 0.15)",
                width: 32,
                height: 32,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="person" size={16} color={isDark ? "#67e8f9" : "#22d3ee"} />
            </View>
            <Text
              style={{
                color: isDark ? "#f1f5f9" : "#0f172a",
                fontWeight: "600",
                fontSize: 13,
                flex: 1,
              }}
              numberOfLines={1}
            >
              {membership.email}
            </Text>
          </View>
        </View>

        {/* Tier Badge */}
        <View
          style={{
            backgroundColor: isMulti
              ? isDark
                ? "rgba(168, 85, 247, 0.25)"
                : "rgba(168, 85, 247, 0.15)"
              : isDark
              ? "rgba(6, 182, 212, 0.25)"
              : "rgba(6, 182, 212, 0.15)",
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 16,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              color: isMulti ? (isDark ? "#d8b4fe" : "#9333ea") : isDark ? "#67e8f9" : "#0891b2",
              letterSpacing: 0.5,
            }}
          >
            {isMulti ? "MULTI" : "SINGLE"}
          </Text>
        </View>
      </View>

      {/* Status badges */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {/* Approved Badge */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 12,
            backgroundColor: membership.approved
              ? isDark
                ? "rgba(34, 197, 94, 0.2)"
                : "rgba(34, 197, 94, 0.15)"
              : isDark
              ? "rgba(239, 68, 68, 0.2)"
              : "rgba(239, 68, 68, 0.15)",
          }}
        >
          <Ionicons
            name={membership.approved ? "checkmark-circle" : "close-circle"}
            size={12}
            color={membership.approved ? (isDark ? "#86efac" : "#22c55e") : isDark ? "#fca5a5" : "#ef4444"}
          />
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              marginLeft: 6,
              color: membership.approved ? (isDark ? "#86efac" : "#16a34a") : isDark ? "#fca5a5" : "#dc2626",
            }}
          >
            {membership.approved ? "APPROVED" : "PENDING"}
          </Text>
        </View>

        {/* Active Badge */}
        {membership.active && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 12,
              backgroundColor: isDark ? "rgba(34, 197, 94, 0.2)" : "rgba(34, 197, 94, 0.15)",
            }}
          >
            <Ionicons name="checkmark-circle" size={12} color={isDark ? "#86efac" : "#22c55e"} />
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                marginLeft: 6,
                color: isDark ? "#86efac" : "#16a34a",
              }}
            >
              ACTIVE
            </Text>
          </View>
        )}
      </View>

      {/* Subjects */}
      <View
        style={{
          backgroundColor: altBgColor,
          borderRadius: 8,
          padding: 12,
          marginBottom: 12,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
          <Ionicons name="book" size={14} color={mutedTextColor} />
          <Text
            style={{
              color: mutedTextColor,
              fontSize: 11,
              marginLeft: 8,
              fontWeight: "600",
            }}
          >
            Subjects
          </Text>
        </View>
        <Text
          style={{
            color: isDark ? "#e2e8f0" : "#0f172a",
            fontSize: 13,
            lineHeight: 20,
          }}
        >
          {membership.subject_names?.length > 0 ? membership.subject_names.join(", ") : "No subjects selected"}
        </Text>
      </View>

      {/* Date */}
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: cardBorderColor,
          paddingTop: 10,
        }}
      >
        <Text
          style={{
            color: mutedTextColor,
            fontSize: 11,
          }}
        >
          Created {formatDate(membership.created_at)}
        </Text>
      </View>
    </View>
  );
}