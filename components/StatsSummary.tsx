import { Text, View } from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";

interface StatItem {
  label: string;
  value: number | string;
  color: "cyan" | "purple" | "red" | "green" | "orange";
}

interface StatsSummaryProps {
  stats: StatItem[];
}

const colorMap = {
  cyan: "text-cyan-400",
  purple: "text-purple-400",
  red: "text-red-400",
  green: "text-green-400",
  orange: "text-orange-400",
};

export default function StatsSummary({ stats }: StatsSummaryProps) {
  const { border, textMuted } = useAppTheme();

  return (
    <View className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-xl p-4 mb-4 border border-cyan-500/20">
      <View className="flex-row justify-around">
        {stats.map((stat, index) => (
          <View key={index}>
            {index > 0 && <View className={`w-px ${border}`} />}
            <View className="items-center">
              <Text className={`${colorMap[stat.color]} text-2xl font-bold`}>
                {stat.value}
              </Text>
              <Text className={`${textMuted} text-xs`}>{stat.label}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
