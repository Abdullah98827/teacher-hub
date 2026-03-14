import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import AdminHeader from "../../components/AdminHeader";
import ReportCard from "../../components/ReportCard";
import ScreenWrapper from "../../components/ScreenWrapper";
import StatsSummary from "../../components/StatsSummary";
import TabFilter from "../../components/TabFilter";
import { ThemedText } from "../../components/themed-text";
import { useAppTheme } from "../../hooks/useAppTheme";
import { supabase } from "../../supabase";

export default function ManageReportsScreen() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("pending");
  const [selectedReport, setSelectedReport] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [updating, setUpdating] = useState(false);

  const { bgCard, bgCardAlt, border, textPrimary, textSecondary, textMuted } =
    useAppTheme();

  const fetchReports = useCallback(async () => {
    const { data, error } = await supabase
      .from("resource_reports")
      .select(
        "id, reason, description, status, created_at, resource_id, reporter_id"
      )
      .order("created_at", { ascending: false });

    if (error) {
      Toast.show({
        type: "error",
        text1: "Failed to load reports",
        text2: error.message,
      });
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const enriched = await Promise.all(
      (data || []).map(async (report) => {
        const { data: resource } = await supabase
          .from("resources")
          .select("title")
          .eq("id", report.resource_id)
          .single();

        const { data: reporter } = await supabase
          .from("teachers")
          .select("first_name, last_name")
          .eq("id", report.reporter_id)
          .single();

        return {
          ...report,
          resource: resource || { title: "Deleted Resource" },
          reporter: reporter || { first_name: "Unknown", last_name: "" },
        };
      })
    );

    setReports(enriched);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const updateReportStatus = async (reportId, status) => {
    setUpdating(true);

    const { error } = await supabase
      .from("resource_reports")
      .update({ status })
      .eq("id", reportId);

    if (error) {
      Toast.show({
        type: "error",
        text1: "Failed to update report",
        text2: error.message,
      });
    } else {
      Toast.show({ type: "success", text1: `Report marked as ${status}` });
      setShowDetailModal(false);
      fetchReports();
    }

    setUpdating(false);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  if (loading) {
    return (
      <ScreenWrapper>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#22d3ee" />
        </View>
      </ScreenWrapper>
    );
  }

  const filteredReports = reports.filter((r) =>
    filter === "all" ? true : r.status === filter
  );

  const pendingCount = reports.filter((r) => r.status === "pending").length;
  const reviewedCount = reports.filter((r) => r.status === "reviewed").length;
  const resolvedCount = reports.filter((r) => r.status === "resolved").length;

  return (
    <ScreenWrapper>
      <View className="flex-1 px-5 pt-4">
        <AdminHeader
          title="Manage Reports"
          subtitle={`${reports.length} total report${reports.length !== 1 ? "s" : ""}`}
        />

        <StatsSummary
          stats={[
            { label: "Pending", value: pendingCount, color: "orange" },
            { label: "Reviewed", value: reviewedCount, color: "cyan" },
            { label: "Resolved", value: resolvedCount, color: "green" },
          ]}
        />

        <TabFilter
          tabs={[
            { key: "pending", label: "Pending", count: pendingCount },
            { key: "reviewed", label: "Reviewed", count: reviewedCount },
            { key: "resolved", label: "Resolved", count: resolvedCount },
            { key: "all", label: "All", count: reports.length },
          ]}
          activeTab={filter}
          onTabChange={(key) => setFilter(key)}
        />

        {filteredReports.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <View className="bg-cyan-500/20 w-20 h-20 rounded-full items-center justify-center mb-4">
              <Ionicons name="flag-outline" size={40} color="#22d3ee" />
            </View>
            <ThemedText className="text-white text-xl font-bold mb-2">No Reports</ThemedText>
            <ThemedText className={`${textSecondary} text-center`}>
              No {filter !== "all" ? filter : ""} reports found
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={filteredReports}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchReports();
                }}
                tintColor="#22d3ee"
              />
            }
            renderItem={({ item }) => (
              <ReportCard
                report={item}
                onPress={() => {
                  setSelectedReport(item);
                  setShowDetailModal(true);
                }}
              />
            )}
          />
        )}
      </View>

      {/* Report Detail Modal */}
      <Modal
        visible={showDetailModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View className="flex-1 bg-black/80 justify-end">
          <View className={`${bgCard} rounded-t-3xl max-h-[80%]`}>
            <ScrollView className="p-6">
              <View className="flex-row items-center justify-between mb-6">
                <ThemedText className={`${textPrimary} text-2xl font-bold`}>
                  Report Details
                </ThemedText>
                <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                  <Ionicons name="close" size={28} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {selectedReport && (
                <>
                  <View className="mb-4">
                    <View
                      className={`self-start px-3 py-1.5 rounded-full ${
                        selectedReport.status === "pending"
                          ? "bg-orange-500/20 border border-orange-500/30"
                          : selectedReport.status === "reviewed"
                            ? "bg-blue-500/20 border border-blue-500/30"
                            : "bg-green-500/20 border border-green-500/30"
                      }`}
                    >
                      <ThemedText
                        className={`text-xs font-bold ${
                          selectedReport.status === "pending"
                            ? "text-orange-400"
                            : selectedReport.status === "reviewed"
                              ? "text-blue-400"
                              : "text-green-400"
                        }`}
                      >
                        {selectedReport.status.toUpperCase()}
                      </ThemedText>
                    </View>
                  </View>

                  <View className="mb-4">
                    <ThemedText className={`${textMuted} text-xs mb-1`}>Reason</ThemedText>
                    <View className={`${bgCardAlt} rounded-lg p-3`}>
                      <ThemedText className={`${textPrimary} font-semibold`}>
                        {selectedReport.reason}
                      </ThemedText>
                    </View>
                  </View>

                  <View className="mb-4">
                    <ThemedText className={`${textMuted} text-xs mb-1`}>Resource</ThemedText>
                    <View className={`${bgCardAlt} rounded-lg p-3`}>
                      <ThemedText className={textPrimary}>
                        {selectedReport.resource.title}
                      </ThemedText>
                    </View>
                  </View>

                  {selectedReport.description && (
                    <View className="mb-4">
                      <ThemedText className={`${textMuted} text-xs mb-1`}>Description</ThemedText>
                      <View className={`${bgCardAlt} rounded-lg p-3`}>
                        <ThemedText className={`${textPrimary} leading-5`}>
                          {selectedReport.description}
                        </ThemedText>
                      </View>
                    </View>
                  )}

                  <View
                    className={`flex-row items-center justify-between mb-6 p-3 ${bgCardAlt} rounded-lg`}
                  >
                    <View className="flex-row items-center">
                      <Ionicons name="person" size={16} color="#6B7280" />
                      <ThemedText className={`${textSecondary} text-sm ml-2`}>
                        {selectedReport.reporter.first_name}{" "}
                        {selectedReport.reporter.last_name}
                      </ThemedText>
                    </View>
                    <ThemedText className={`${textMuted} text-xs`}>
                      {formatDate(selectedReport.created_at)}
                    </ThemedText>
                  </View>

                  {selectedReport.status === "pending" && (
                    <View className="gap-3">
                      <TouchableOpacity
                        className={`bg-blue-500 py-4 rounded-lg flex-row items-center justify-center ${
                          updating ? "opacity-50" : ""
                        }`}
                        onPress={() =>
                          updateReportStatus(selectedReport.id, "reviewed")
                        }
                        disabled={updating}
                      >
                        {updating ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <>
                            <Ionicons name="eye" size={18} color="#fff" />
                            <ThemedText className="text-white font-bold ml-2">
                              Mark as Reviewed
                            </ThemedText>
                          </>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        className={`bg-green-500 py-4 rounded-lg flex-row items-center justify-center ${
                          updating ? "opacity-50" : ""
                        }`}
                        onPress={() =>
                          updateReportStatus(selectedReport.id, "resolved")
                        }
                        disabled={updating}
                      >
                        <Ionicons name="checkmark-circle" size={18} color="#fff" />
                        <ThemedText className="text-white font-bold ml-2">
                          Mark as Resolved
                        </ThemedText>
                      </TouchableOpacity>
                    </View>
                  )}

                  {selectedReport.status === "reviewed" && (
                    <TouchableOpacity
                      className={`bg-green-500 py-4 rounded-lg flex-row items-center justify-center ${
                        updating ? "opacity-50" : ""
                      }`}
                      onPress={() =>
                        updateReportStatus(selectedReport.id, "resolved")
                      }
                      disabled={updating}
                    >
                      {updating ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle" size={18} color="#fff" />
                          <ThemedText className="text-white font-bold ml-2">
                            Mark as Resolved
                          </ThemedText>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  {selectedReport.status === "resolved" && (
                    <View className="bg-green-500/20 border-2 border-green-500/30 py-4 rounded-lg flex-row items-center justify-center">
                      <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
                      <ThemedText className="text-green-400 font-bold ml-2">
                        Report Resolved
                      </ThemedText>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Toast />
    </ScreenWrapper>
  );
}
