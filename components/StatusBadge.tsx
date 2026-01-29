import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

interface StatusBadgeProps {
  status:
    | "pending"
    | "approved"
    | "rejected"
    | "resolved"
    | "reviewed"
    | "active"
    | "inactive";
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

export default function StatusBadge({
  status,
  size = "md",
  showIcon = false,
}: StatusBadgeProps) {
  const getStyles = () => {
    switch (status) {
      case "pending":
        return {
          bg: "bg-orange-500/20",
          border: "border-orange-500/30",
          text: "text-orange-400",
          icon: "time" as const,
        };
      case "approved":
      case "active":
      case "resolved":
        return {
          bg: "bg-green-500/20",
          border: "border-green-500/30",
          text: "text-green-400",
          icon: "checkmark-circle" as const,
        };
      case "rejected":
      case "inactive":
        return {
          bg: "bg-red-500/20",
          border: "border-red-500/30",
          text: "text-red-400",
          icon: "close-circle" as const,
        };
      case "reviewed":
        return {
          bg: "bg-blue-500/20",
          border: "border-blue-500/30",
          text: "text-blue-400",
          icon: "eye" as const,
        };
      default:
        return {
          bg: "bg-neutral-800",
          border: "border-neutral-700",
          text: "text-gray-400",
          icon: "ellipse" as const,
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case "sm":
        return {
          padding: "px-2 py-0.5",
          text: "text-xs",
          icon: 12,
        };
      case "lg":
        return {
          padding: "px-4 py-2",
          text: "text-sm",
          icon: 18,
        };
      default: // md
        return {
          padding: "px-3 py-1",
          text: "text-xs",
          icon: 14,
        };
    }
  };

  const styles = getStyles();
  const sizeStyles = getSizeStyles();
  const label = status.toUpperCase().replace("_", " ");

  return (
    <View
      className={`rounded-full ${styles.bg} border ${styles.border} ${sizeStyles.padding} flex-row items-center`}
    >
      {showIcon && (
        <Ionicons
          name={styles.icon}
          size={sizeStyles.icon}
          color={styles.text.replace("text-", "#")}
          style={{ marginRight: 4 }}
        />
      )}
      <Text className={`font-bold ${styles.text} ${sizeStyles.text}`}>
        {label}
      </Text>
    </View>
  );
}
