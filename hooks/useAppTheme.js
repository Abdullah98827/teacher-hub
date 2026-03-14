import { useTheme } from "../contexts/ThemeContext";

/**
 * Returns a set of common theme-aware class strings for NativeWind.
 * Use these instead of hardcoded "bg-black" / "bg-white" etc.
 */
export function useAppTheme() {
  const { isDark, themePreference, resolvedTheme, setThemePreference } =
    useTheme();

  return {
    isDark,
    themePreference,
    resolvedTheme,
    setThemePreference,

    // Backgrounds
    bg: isDark ? "bg-black" : "bg-white",
    bgCard: isDark ? "bg-neutral-900" : "bg-gray-50",
    bgCardAlt: isDark ? "bg-neutral-800" : "bg-gray-100",
    bgInput: isDark ? "bg-neutral-800" : "bg-gray-100",
    bgSubtle: isDark ? "bg-neutral-950" : "bg-gray-50",

    // Borders
    border: isDark ? "border-neutral-800" : "border-gray-200",
    borderInput: isDark ? "border-neutral-700" : "border-gray-300",

    // Text
    textPrimary: isDark ? "text-white" : "text-gray-900",
    textSecondary: isDark ? "text-gray-400" : "text-gray-500",
    textMuted: isDark ? "text-gray-500" : "text-gray-400",
    textLabel: isDark ? "text-gray-500" : "text-gray-500",

    // Tab bar
    tabBarBg: isDark ? "#0a0a0a" : "#ffffff",
    tabBarBorder: isDark ? "#262626" : "#e5e7eb",
    tabBarActive: "#22d3ee",
    tabBarInactive: isDark ? "#9ca3af" : "#6b7280",

    // Icon colors
    iconColor: isDark ? "#9ca3af" : "#6b7280",

    // Placeholder text color
    placeholderColor: isDark ? "#6B7280" : "#9CA3AF",

    // ActivityIndicator bg
    loadingBg: isDark ? "bg-black" : "bg-white",
  };
}
