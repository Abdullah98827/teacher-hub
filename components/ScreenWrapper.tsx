import { ReactNode } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../hooks/useAppTheme";

export default function ScreenWrapper({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const { bg } = useAppTheme();

  return (
    <View className={`flex-1 ${bg}`} style={{ paddingTop: insets.top }}>
      {children}
    </View>
  );
}
