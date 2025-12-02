import { Text, View } from "react-native";

interface StatusBadgeProps {
  status: "pending" | "approved" | "rejected" | "resolved" | "reviewed";
  label?: string;
}

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const getStyles = () => {
    switch (status) {
      case "pending":
        return {
          bg: "bg-orange-900/30",
          border: "border-orange-800",
          text: "text-orange-400",
        };
      case "approved":
        return {
          bg: "bg-green-900/30",
          border: "border-green-800",
          text: "text-green-400",
        };
      case "rejected":
        return {
          bg: "bg-red-900/30",
          border: "border-red-800",
          text: "text-red-400",
        };
      case "resolved":
        return {
          bg: "bg-green-900/30",
          border: "border-green-800",
          text: "text-green-400",
        };
      case "reviewed":
        return {
          bg: "bg-blue-900/30",
          border: "border-blue-800",
          text: "text-blue-400",
        };
      default:
        return {
          bg: "bg-neutral-800",
          border: "border-neutral-700",
          text: "text-gray-400",
        };
    }
  };

  const styles = getStyles();
  const displayLabel = label || status.toUpperCase();

  return (
    <View
      className={`px-3 py-1 rounded-full ${styles.bg} border ${styles.border}`}
    >
      <Text className={`text-xs font-bold ${styles.text}`}>{displayLabel}</Text>
    </View>
  );
}
