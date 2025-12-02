import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import AdminHeader from "../../components/AdminHeader";
import EmptyState from "../../components/EmptyState";
import LogoHeader from "../../components/logoHeader";
import ScreenWrapper from "../../components/ScreenWrapper";
import { supabase } from "../../supabase";

interface Report {
  id: string;
  reason: string;
  description: string;
  status: "pending" | "reviewed" | "resolved";
  created_at: string;
  resource: {
    title: string;
  };
  reporter: {
    first_name: string;
    last_name: string;
  };
}

export default function ManageReportsScreen() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<
    "all" | "pending" | "reviewed" | "resolved"
  >("pending");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Loads all reports with resources and detals of the person that reported
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

    // Gets the resource title and name of the person reported
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

    setReports(enriched as any);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Updates the report status to reviewed or resolved
  const updateReportStatus = async (
    reportId: string,
    status: "reviewed" | "resolved"
  ) => {
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
      return;
    }

    Toast.show({
      type: "success",
      text1: `Report marked as ${status}`,
    });

    setShowDetailModal(false);
    fetchReports();
  };

  // Formats the date into readable format
  const formatDate = (dateString: string) => {
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
          <Text className="text-gray-400 mt-4">Loading reports...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  // Filters the reports based on selected status
  const filteredReports = reports.filter((r) =>
    filter === "all" ? true : r.status === filter
  );

  // This count reports by status for status cards
  const pendingCount = reports.filter((r) => r.status === "pending").length;
  const reviewedCount = reports.filter((r) => r.status === "reviewed").length;
  const resolvedCount = reports.filter((r) => r.status === "resolved").length;

  return (
    <ScreenWrapper>
      <LogoHeader position="left" />
      <View className="flex-1 px-5">
        <AdminHeader title="Manage Reports" showBack={false} />

        {/* Status cards showing count for each status */}
        <View className="flex-row gap-2 mb-4">
          <View className="flex-1 bg-orange-900/30 p-3 rounded-xl border border-orange-800">
            <Text className="text-orange-400 text-2xl font-bold">
              {pendingCount}
            </Text>
            <Text className="text-orange-400 text-xs">Pending</Text>
          </View>
          <View className="flex-1 bg-blue-900/30 p-3 rounded-xl border border-blue-800">
            <Text className="text-blue-400 text-2xl font-bold">
              {reviewedCount}
            </Text>
            <Text className="text-blue-400 text-xs">Reviewed</Text>
          </View>
          <View className="flex-1 bg-green-900/30 p-3 rounded-xl border border-green-800">
            <Text className="text-green-400 text-2xl font-bold">
              {resolvedCount}
            </Text>
            <Text className="text-green-400 text-xs">Resolved</Text>
          </View>
        </View>

        {/* Filter tabs */}
        <View className="flex-row gap-2 mb-4">
          {["pending", "reviewed", "resolved", "all"].map((status) => (
            <TouchableOpacity
              key={status}
              className={`px-4 py-2 rounded-xl ${
                filter === status ? "bg-cyan-500" : "bg-neutral-800"
              }`}
              onPress={() => setFilter(status as any)}
            >
              <Text
                className={`font-semibold ${
                  filter === status ? "text-white" : "text-gray-400"
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {filteredReports.length === 0 ? (
          <EmptyState icon="🚩" message={`No ${filter} reports`} />
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
              <TouchableOpacity
                className="bg-neutral-900 rounded-xl p-4 mb-3 border border-neutral-800"
                onPress={() => {
                  setSelectedReport(item);
                  setShowDetailModal(true);
                }}
              >
                {/* Status badge and arrow */}
                <View className="flex-row items-center justify-between mb-2">
                  <View
                    className={`px-3 py-1 rounded-full ${
                      item.status === "pending"
                        ? "bg-orange-900/30 border border-orange-800"
                        : item.status === "reviewed"
                          ? "bg-blue-900/30 border border-blue-800"
                          : "bg-green-900/30 border border-green-800"
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        item.status === "pending"
                          ? "text-orange-400"
                          : item.status === "reviewed"
                            ? "text-blue-400"
                            : "text-green-400"
                      }`}
                    >
                      {item.status.toUpperCase()}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </View>

                {/* Report reason and resource */}
                <Text className="text-white font-bold mb-1">{item.reason}</Text>
                <Text className="text-gray-400 text-sm mb-2">
                  Resource: {item.resource.title}
                </Text>

                {/* Reporters name and date */}
                <View className="flex-row items-center justify-between">
                  <Text className="text-gray-500 text-xs">
                    By {item.reporter.first_name} {item.reporter.last_name}
                  </Text>
                  <Text className="text-gray-500 text-xs">
                    {formatDate(item.created_at)}
                  </Text>
                </View>
              </TouchableOpacity>
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
        <View className="flex-1 bg-black/70 justify-center items-center px-5">
          <View className="bg-neutral-900 rounded-2xl w-full max-w-md border border-neutral-800">
            {/* Modal header */}
            <View className="p-5 border-b border-neutral-800">
              <View className="flex-row items-center justify-between">
                <Text className="text-white font-bold text-xl">
                  Report Details
                </Text>
                <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                  <Ionicons name="close" size={24} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            </View>

            {selectedReport && (
              <View className="p-5">
                {/* Report information */}
                <View className="mb-4">
                  <Text className="text-gray-400 text-xs mb-1">Reason</Text>
                  <Text className="text-white font-semibold">
                    {selectedReport.reason}
                  </Text>
                </View>

                <View className="mb-4">
                  <Text className="text-gray-400 text-xs mb-1">Resource</Text>
                  <Text className="text-white">
                    {selectedReport.resource.title}
                  </Text>
                </View>

                {selectedReport.description && (
                  <View className="mb-4">
                    <Text className="text-gray-400 text-xs mb-1">
                      Description
                    </Text>
                    <Text className="text-white">
                      {selectedReport.description}
                    </Text>
                  </View>
                )}

                <View className="mb-4">
                  <Text className="text-gray-400 text-xs mb-1">
                    Reported by
                  </Text>
                  <Text className="text-white">
                    {selectedReport.reporter.first_name}{" "}
                    {selectedReport.reporter.last_name}
                  </Text>
                </View>

                <View className="mb-6">
                  <Text className="text-gray-400 text-xs mb-1">Date</Text>
                  <Text className="text-white">
                    {formatDate(selectedReport.created_at)}
                  </Text>
                </View>

                {/* Action buttons based on status */}
                {selectedReport.status === "pending" && (
                  <View className="gap-3">
                    <TouchableOpacity
                      className="bg-blue-600 py-3 rounded-xl"
                      onPress={() =>
                        updateReportStatus(selectedReport.id, "reviewed")
                      }
                    >
                      <Text className="text-white text-center font-bold">
                        Mark as Reviewed
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="bg-green-600 py-3 rounded-xl"
                      onPress={() =>
                        updateReportStatus(selectedReport.id, "resolved")
                      }
                    >
                      <Text className="text-white text-center font-bold">
                        Mark as Resolved
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {selectedReport.status === "reviewed" && (
                  <TouchableOpacity
                    className="bg-green-600 py-3 rounded-xl"
                    onPress={() =>
                      updateReportStatus(selectedReport.id, "resolved")
                    }
                  >
                    <Text className="text-white text-center font-bold">
                      Mark as Resolved
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>

      <Toast />
    </ScreenWrapper>
  );
}
