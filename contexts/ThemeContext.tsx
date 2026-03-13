import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

interface ThemeContextType {
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setThemePreference: (theme: ThemePreference) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  themePreference: "system",
  resolvedTheme: "dark",
  setThemePreference: () => {},
  isDark: true,
});

const THEME_STORAGE_KEY = "@teacher_hub_theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themePreference, setThemePreferenceState] =
    useState<ThemePreference>("system");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved === "light" || saved === "dark" || saved === "system") {
          setThemePreferenceState(saved);
        }
      } catch {
        // fallback to system
      } finally {
        setLoaded(true);
      }
    };
    loadTheme();
  }, []);

  const setThemePreference = async (theme: ThemePreference) => {
    setThemePreferenceState(theme);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore
    }
  };

  const resolvedTheme: ResolvedTheme =
    themePreference === "system"
      ? systemColorScheme === "dark"
        ? "dark"
        : "light"
      : themePreference;

  const isDark = resolvedTheme === "dark";

  if (!loaded) return null;

  return (
    <ThemeContext.Provider
      value={{ themePreference, resolvedTheme, setThemePreference, isDark }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
