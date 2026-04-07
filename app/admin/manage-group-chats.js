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
import { useAuth } from "../../contexts/AuthContext";
import { useAppTheme } from "../../hooks/useAppTheme";
import { supabase } from "../../supabase";
import { logEvent } from "../../utils/logging";

export default function ManageGroupChatsScreen() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("pending");
  const [selectedReport, setSelectedReport] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [updating, setUpdating] = useState(false);

  const { bgCard, bgCardAlt, textPrimary, textSecondary, textMuted } =
    useAppTheme();

  const fetchReports = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("group_chat_reports")
        .select(
          "id, message_id, group_id, reason, description, status, created_at, reported_by, reported_user_id, reviewed_by, review_notes, resolved_at"
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Enrich with message and user details
      const enriched = await Promise.all(
        (data || []).map(async (report) => {
          const { data: message } = await supabase
            .from("group_messages")
            .select("id, message, sender_id, created_at, deleted_at")
            .eq("id", report.message_id)
            .single();

          let sender = null;
          if (message?.sender_id) {
            const { data: senderData } = await supabase
              .from("teachers")
              .select("first_name, last_name")
              .eq("id", message.sender_id)
              .single();
            sender = senderData;
          }

          let chat = null;
          if (report.group_id) {
            const { data: chatData } = await supabase
              .from("group_chats")
              .select("id, name")
              .eq("id", report.group_id)
              .single();
            chat = chatData;
          }

          const { data: reporter } = await supabase
            .from("teachers")
            .select("first_name, last_name")
            .eq("id", report.reported_by)
            .single();

          return {
            ...report,
            message: message || { message: "Deleted message" },
            sender: sender || { first_name: "Unknown", last_name: "" },
            chat: chat || { name: "Unknown Chat" },
            reporter: reporter || { first_name: "Unknown", last_name: "" },
          };
        })
      );

      setReports(enriched);
      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error("Error fetching reports:", error);
      Toast.show({
        type: "error",
        text1: "Failed to load reports",
        text2: error.message,
      });
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();

    const subscription = supabase
      .channel("group_chat_reports_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_chat_reports" }
      )
      .subscribe(() => {
        fetchReports();
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchReports]);

  const updateReportStatus = async (reportId, status, deleteMessage = false) => {
    setUpdating(true);

    try {
      const { error: reportError } = await supabase
        .from("group_chat_reports")
        .update({ status })
        .eq("id", reportId);

      if (reportError) throw reportError;

      if (deleteMessage && selectedReport?.message_id) {
        const { error: deleteError } = await supabase
          .from("group_messages")
          .update({
            deleted_at: new Date().toISOString(),
            deleted_by: user?.id,
          })
          .eq("id", selectedReport.message_id);

        if (deleteError) throw deleteError;
      }

      await logEvent({
        event_type:
          status === "resolved" ? "GROUP_CHAT_REPORT_APPROVED" : "GROUP_CHAT_REPORT_REJECTED",
        user_id: user?.id,
        target_id: reportId,
        target_table: "group_chat_reports",
        details: { deleted: deleteMessage },
      });

      Toast.show({
        type: "success",
        text1: status === "resolved" ? "Report approved" : "Report rejected",
        text2:
          status === "resolved" && deleteMessage ? "Message has been deleted" : undefined,
      });

      setShowDetailModal(false);
      await fetchReports();
    } catch (error) {
      console.error("Error updating report:", error);
      Toast.show({
        type: "error",
        text1: "Failed to update report",
        text2: error.message,
      });
    } finally {
      setUpdating(false);
    }
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

  const pendingCount = reports.filter((r) => r.status === "pending").length;
  const resolvedCount = reports.filter((r) => r.status === "resolved").length;
  const rejectedCount = reports.filter((r) => r.status === "rejected").length;

  const filteredReports = reports.filter((report) => {
    if (filter === "pending") return report.status === "pending";
    if (filter === "resolved") return report.status === "resolved";
    if (filter === "rejected") return report.status === "rejected";
    return true;
  });

  return (
    <ScreenWrapper>
      <View className="flex-1 px-5 pt-4">
        <AdminHeader
          title="Manage Group Chats"
          subtitle={`${reports.length} total report${reports.length !== 1 ? "s" : ""}`}
        />

        <StatsSummary
          stats={[
            { label: "Pending", value: pendingCount.toString(), color: "orange" },
            { label: "Resolved", value: resolvedCount.toString(), color: "green" },
            { label: "Rejected", value: rejectedCount.toString(), color: "red" },
            { label: "Total", value: reports.length.toString(), color: "blue" },
          ]}
        />

        <TabFilter
          tabs={[
            { key: "all", label: "All" },
            { key: "pending", label: "Pending" },
            { key: "resolved", label: "Resolved" },
            { key: "rejected", label: "Rejected" },
          ]}
          activeTab={filter}
          onTabChange={setFilter}
        />

        {filteredReports.length === 0 ? (
          <View className="flex-1 items-center justify-center py-8">
            <View className="bg-amber-500/20 w-20 h-20 rounded-full items-center justify-center mb-4">
              <Ionicons name="checkmark-circle-outline" size={40} color="#F59E0B" />
            </View>
            <ThemedText className={`${textPrimary} text-xl font-bold mb-2`}>
              No {filter !== "all" ? filter : ""} reports
            </ThemedText>
            <ThemedText className={`${textSecondary} text-center`}>
              All group chat reports have been reviewed.
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
                report={{
                  ...item,
                  resource: { title: `#${item.chat?.name || "Unknown Chat"}` },
                }}
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
                          : selectedReport.status === "resolved"
                            ? "bg-green-500/20 border border-green-500/30"
                            : "bg-gray-500/20 border border-gray-500/30"
                      }`}
                    >
                      <ThemedText
                        className={`text-xs font-bold ${
                          selectedReport.status === "pending"
                            ? "text-orange-400"
                            : selectedReport.status === "resolved"
                              ? "text-green-400"
                              : "text-gray-400"
                        }`}
                      >
                        {selectedReport.status.toUpperCase()}
                      </ThemedText>
                    </View>
                  </View>

                  <View className="mb-4">
                    <ThemedText className={`${textMuted} text-xs mb-1`}>Message</ThemedText>
                    <View className={`${bgCardAlt} rounded-lg p-3`}>
                      <ThemedText className={`${textPrimary} leading-5`}>
                        {selectedReport.message?.message || "Message deleted"}
                      </ThemedText>
                    </View>
                  </View>

                  <View className="mb-4">
                    <ThemedText className={`${textMuted} text-xs mb-1`}>Group Chat</ThemedText>
                    <View className={`${bgCardAlt} rounded-lg p-3`}>
                      <ThemedText className={textPrimary}>
                        #{selectedReport.chat?.name}
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

                  {selectedReport.reason === "other" && selectedReport.description && (
                    <View className="mb-4">
                      <ThemedText className={`${textMuted} text-xs mb-1`}>Details</ThemedText>
                      <View className={`${bgCardAlt} rounded-lg p-3`}>
                        <ThemedText className={`${textPrimary} leading-5`}>
                          {selectedReport.description}
                        </ThemedText>
                      </View>
                    </View>
                  )}

                  <View className="mb-4">
                    <ThemedText className={`${textMuted} text-xs mb-1`}>Reported By</ThemedText>
                    <View className={`${bgCardAlt} rounded-lg p-3`}>
                      <ThemedText className={textPrimary}>
                        {selectedReport.reporter?.first_name} {selectedReport.reporter?.last_name}
                      </ThemedText>
                    </View>
                  </View>

                  {selectedReport.status === "pending" && (
                    <View className="gap-3 mt-6">
                      <TouchableOpacity
                        onPress={() =>
                          updateReportStatus(selectedReport.id, "resolved", true)
                        }
                        disabled={updating}
                        className="bg-green-500 rounded-lg p-3 flex-row items-center justify-center gap-2"
                      >
                        {updating ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                            <ThemedText className="text-white font-semibold">
                              Approve & Delete Message
                            </ThemedText>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => updateReportStatus(selectedReport.id, "rejected")}
                        disabled={updating}
                        className={`${bgCardAlt} rounded-lg p-3 flex-row items-center justify-center gap-2`}
                      >
                        <Ionicons name="close-circle" size={18} color="#EF4444" />
                        <ThemedText className="text-red-500 font-semibold">
                          Reject Report
                        </ThemedText>
                      </TouchableOpacity>
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
