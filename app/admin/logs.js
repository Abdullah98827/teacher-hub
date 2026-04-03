import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Text, View } from "react-native";
import AdminHeader from "../../components/AdminHeader";
import ScreenWrapper from "../../components/ScreenWrapper";
import { useAppTheme } from "../../hooks/useAppTheme";
import { supabase } from "../../supabase";

export default function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { bgCard, textPrimary, textSecondary } = useAppTheme();

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("app_logs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching logs:", error);
    } else {
      setLogs(data);
    }
    setLoading(false);
  };

  const renderLogItem = ({ item }) => (
    <View className={`p-4 mb-4 rounded-lg ${bgCard}`}>
      <Text className={`font-bold ${textPrimary}`}>
        {item.event_type}
      </Text>
      <Text className={`${textSecondary}`}>
        User: {item.user_id || "System"}
      </Text>
      <Text className={`${textSecondary}`}>
        Timestamp: {new Date(item.created_at).toLocaleString()}
      </Text>
      {item.details && (
        <Text className={`${textSecondary}`}>
          Details: {JSON.stringify(item.details)}
        </Text>
      )}
    </View>
  );

return (
  <ScreenWrapper>
    <AdminHeader
      title=" View Application Logs"
      subtitle="Review all application-wide events"
    />
    <View className="flex-1 p-4">
      {loading ? (
        <ActivityIndicator size="large" color="#22d3ee" />
      ) : (
        <FlatList
          data={logs}
          renderItem={renderLogItem}
          keyExtractor={(item) => item.id.toString()}
          onRefresh={fetchLogs}
          refreshing={loading}
        />
      )}
    </View>
  </ScreenWrapper>
);
}
