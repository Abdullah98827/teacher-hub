// components/ScreenWrapper.tsx
import { ReactNode } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ScreenWrapper({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-neutral-950" style={{ paddingTop: insets.top }}>
      {children}
    </View>
  );
}
