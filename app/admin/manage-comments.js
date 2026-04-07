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
import CommentCard from "../../components/CommentCard";
import ConfirmModal from "../../components/ConfirmModal";
import ReportCard from "../../components/ReportCard";
import ScreenWrapper from "../../components/ScreenWrapper";
import SearchBar from "../../components/SearchBar";
import StatsSummary from "../../components/StatsSummary";
import TabFilter from "../../components/TabFilter";
import { ThemedText } from "../../components/themed-text";
import { useAuth } from "../../contexts/AuthContext";
import { useAppTheme } from "../../hooks/useAppTheme";
import { supabase } from "../../supabase";
import { logEvent } from "../../utils/logging";

export default function ManageCommentsScreen() {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [reportedComments, setReportedComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all"); // all, deleted, reported
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedCommentId, setSelectedCommentId] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const { textPrimary, textSecondary, bgCard, bgCardAlt, textMuted } = useAppTheme();

  const fetchComments = useCallback(async () => {
    setLoading(true); // Ensure loading state is set at the start
    const { data: commentsData, error } = await supabase
      .from("resource_comments")
      .select(
        "id, comment_text, created_at, deleted_at, is_deleted, resource_id, user_id"
      )
      .order("created_at", { ascending: false });

    if (error) {
      Toast.show({
        type: "error",
        text1: "Failed to load comments",
        text2: error.message,
      });
      setLoading(false);
      setRefreshing(false);
      return;
    }

    // Avoid unnecessary requests if no comments
    if (!commentsData || commentsData.length === 0) {
      setComments([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    // Batch fetch user and resource info for performance
    const userIds = [...new Set(commentsData.map((c) => c.user_id))];
    const resourceIds = [...new Set(commentsData.map((c) => c.resource_id))];

    const [{ data: users }, { data: resources }] = await Promise.all([
      supabase
        .from("teachers")
        .select("id, first_name, last_name")
        .in("id", userIds),
      supabase
        .from("resources")
        .select("id, title")
        .in("id", resourceIds),
    ]);

    const userMap = (users || []).reduce((acc, u) => {
      acc[u.id] = u;
      return acc;
    }, {});
    const resourceMap = (resources || []).reduce((acc, r) => {
      acc[r.id] = r;
      return acc;
    }, {});

    const enrichedComments = (commentsData || []).map((comment) => {
      const user = userMap[comment.user_id] || {};
      const resource = resourceMap[comment.resource_id] || {};
      return {
        ...comment,
        first_name: user.first_name || "Unknown",
        last_name: user.last_name || "",
        resource_title: resource.title || "Unknown Resource",
      };
    });

    setComments(enrichedComments);
    
    // Fetch reported comments
    const { data: reportsData } = await supabase
      .from("comment_reports")
      .select("id, comment_id, reason, description, status, created_at, reported_by, reported_user_id, reviewed_by, review_notes, resolved_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (reportsData && reportsData.length > 0) {
      // Fetch comment details for each report
      const commentIds = [...new Set(reportsData.map((r) => r.comment_id))];
      const { data: commentsData } = await supabase
        .from("resource_comments")
        .select("id, comment_text, user_id, resource_id")
        .in("id", commentIds);

      const commentMap = (commentsData || []).reduce((acc, c) => {
        acc[c.id] = c;
        return acc;
      }, {});

      // Fetch user and resource info
      const reporterIds = [...new Set(reportsData.map((r) => r.reported_by))];
      const commentAuthorIds = [...new Set((commentsData || []).map((c) => c.user_id).filter(Boolean))];
      const resourceIds = [...new Set((commentsData || []).map((c) => c.resource_id).filter(Boolean))];

      const [{ data: reporters }, { data: commentAuthors }, { data: reportResources }] = await Promise.all([
        reporterIds.length > 0 ? supabase
          .from("teachers")
          .select("id, first_name, last_name")
          .in("id", reporterIds) : Promise.resolve({ data: [] }),
        commentAuthorIds.length > 0 ? supabase
          .from("teachers")
          .select("id, first_name, last_name")
          .in("id", commentAuthorIds) : Promise.resolve({ data: [] }),
        resourceIds.length > 0 ? supabase
          .from("resources")
          .select("id, title")
          .in("id", resourceIds) : Promise.resolve({ data: [] }),
      ]);

      const reporterMap = (reporters || []).reduce((acc, u) => {
        acc[u.id] = u;
        return acc;
      }, {});
      const commentAuthorMap = (commentAuthors || []).reduce((acc, u) => {
        acc[u.id] = u;
        return acc;
      }, {});
      const reportResourceMap = (reportResources || []).reduce((acc, r) => {
        acc[r.id] = r;
        return acc;
      }, {});

      const enrichedReports = reportsData.map((report) => {
        const comment = commentMap[report.comment_id] || {};
        const reporterUser = reporterMap[report.reported_by] || {};
        const commentAuthor = commentAuthorMap[comment.user_id] || {};
        const resource = reportResourceMap[comment.resource_id] || {};
        return {
          ...report,
          comment: comment,
          reporter: {
            first_name: reporterUser.first_name || "Unknown",
            last_name: reporterUser.last_name || "",
          },
          commentAuthor: {
            first_name: commentAuthor.first_name || "Unknown",
            last_name: commentAuthor.last_name || "",
          },
          resource_title: resource.title || "Unknown Resource",
        };
      });

      setReportedComments(enrichedReports);
    } else {
      setReportedComments([]);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const restoreComment = async () => {
    if (!selectedCommentId) return;
    setProcessing(true);

    const { error } = await supabase
      .from("resource_comments")
      .update({ is_deleted: false, deleted_at: null })
      .eq("id", selectedCommentId);

    if (error) {
      logEvent({
        event_type: "COMMENT_RESTORE_FAILED",
        user_id: user?.id,
        target_id: selectedCommentId,
        target_table: "resource_comments",
        details: { error: error.message },
      });
      Toast.show({
        type: "error",
        text1: "Failed to restore comment",
        text2: error.message,
      });
    } else {
      logEvent({
        event_type: "COMMENT_RESTORED",
        user_id: user?.id,
        target_id: selectedCommentId,
        target_table: "resource_comments",
      });
      Toast.show({ type: "success", text1: "Comment restored" });
      fetchComments();
    }

    setShowRestoreConfirm(false);
    setSelectedCommentId(null);
    setProcessing(false);
  };

  const permanentlyDeleteComment = async () => {
    if (!selectedCommentId) return;
    setProcessing(true);

    const { error } = await supabase
      .from("resource_comments")
      .delete()
      .eq("id", selectedCommentId);

    if (error) {
      logEvent({
        event_type: "COMMENT_DELETION_FAILED",
        user_id: user?.id,
        target_id: selectedCommentId,
        target_table: "resource_comments",
        details: { error: error.message },
      });
      Toast.show({
        type: "error",
        text1: "Failed to delete comment",
        text2: error.message,
      });
    } else {
      logEvent({
        event_type: "COMMENT_DELETED",
        user_id: user?.id,
        target_id: selectedCommentId,
        target_table: "resource_comments",
      });
      Toast.show({ type: "success", text1: "Comment permanently deleted" });
      fetchComments();
    }

    setShowDeleteConfirm(false);
    setSelectedCommentId(null);
    setProcessing(false);
  };

  const resolveReport = async (reportId, resolution, notes = "") => {
    setProcessing(true);
    try {
      // Update report status
      const { error: reportError } = await supabase
        .from("comment_reports")
        .update({
          status: resolution,
          reviewed_by: user?.id,
          review_notes: notes,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", reportId);

      if (reportError) throw reportError;

      // If approved (resolved), delete the comment
      if (resolution === "resolved" && selectedReport?.comment_id) {
        const { error: deleteError } = await supabase
          .from("resource_comments")
          .update({
            is_deleted: true,
            deleted_at: new Date().toISOString(),
          })
          .eq("id", selectedReport.comment_id);

        if (deleteError) throw deleteError;
      }

      logEvent({
        event_type: "COMMENT_REPORT_RESOLVED",
        user_id: user?.id,
        target_id: reportId,
        target_table: "comment_reports",
        details: { resolution, notes },
      });

      Toast.show({
        type: "success",
        text1: resolution === "resolved" ? "Report approved" : "Report rejected",
        text2: resolution === "resolved" ? "Comment has been deleted" : undefined,
      });

      setShowDetailModal(false);
      fetchComments();
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Failed to resolve report",
        text2: error.message,
      });
    } finally {
      setProcessing(false);
    }
  };

  const filteredComments = comments.filter((c) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !c.comment_text.toLowerCase().includes(q) &&
        !c.first_name.toLowerCase().includes(q) &&
        !c.last_name.toLowerCase().includes(q) &&
        !c.resource_title.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    if (filter === "deleted" && !c.is_deleted) return false;
    if (filter === "reported") return false; // Reported comments shown separately
    if (filter === "all" && c.is_deleted) return false; // Hide deleted from all view
    return true;
  });

  if (loading) {
    return (
      <ScreenWrapper>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#22d3ee" />
        </View>
      </ScreenWrapper>
    );
  }

  const activeCount = comments.filter((c) => !c.is_deleted).length;
  const deletedCount = comments.filter((c) => c.is_deleted).length;

  return (
    <ScreenWrapper>
      <View className="flex-1 px-5 pt-4">
        <AdminHeader
          title="Manage Comments"
          subtitle={`${comments.length} total comment${comments.length !== 1 ? "s" : ""}`}
        />

        <StatsSummary
          stats={[
            { label: "Total", value: comments.length.toString(), color: "blue" },
            { label: "Active", value: activeCount.toString(), color: "green" },
            { label: "Reported", value: reportedComments.length.toString(), color: "orange" },
            { label: "Deleted", value: deletedCount.toString(), color: "red" },
          ]}
        />

        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search comments, users, or resources..."
        />

        <TabFilter
          tabs={[
            { key: "all", label: "All Comments" },
            { key: "reported", label: `Reported (${reportedComments.length})` },
            { key: "deleted", label: "Deleted" },
          ]}
          activeTab={filter}
          onTabChange={setFilter}
        />

        {filter === "reported" && reportedComments.length === 0 ? (
          <View className="flex-1 items-center justify-center py-8">
            <View className="bg-amber-500/20 w-20 h-20 rounded-full items-center justify-center mb-4">
              <Ionicons name="checkmark-circle-outline" size={40} color="#F59E0B" />
            </View>
            <ThemedText className={`${textPrimary} text-xl font-bold mb-2`}>
              No Reported Comments
            </ThemedText>
            <ThemedText className={`${textSecondary} text-center`}>
              All reported comments have been reviewed.
            </ThemedText>
          </View>
        ) : filter === "reported" ? (
          <FlatList
            data={reportedComments}
            renderItem={({ item: report }) => (
              <ReportCard
                report={{
                  ...report,
                  resource: { title: report.resource_title || "Unknown Resource" },
                }}
                onPress={() => {
                  setSelectedReport(report);
                  setShowDetailModal(true);
                }}
              />
            )}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => {
                setRefreshing(true);
                fetchComments().then(() => setRefreshing(false));
              }} />
            }
            scrollEnabled={false}
          />
        ) : filteredComments.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <View className="bg-cyan-500/20 w-20 h-20 rounded-full items-center justify-center mb-4">
              <Ionicons name="chatbubble-outline" size={40} color="#22d3ee" />
            </View>
            <ThemedText className={`${textPrimary} text-xl font-bold mb-2`}>
              No Comments
            </ThemedText>
            <ThemedText className={`${textSecondary} text-center`}>
              {filter === "deleted"
                ? "No deleted comments found"
                : "No comments match your search"}
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={filteredComments}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchComments();
                }}
                tintColor="#22d3ee"
              />
            }
            renderItem={({ item }) => (
              <CommentCard
                comment={item}
                onRestore={
                  item.is_deleted
                    ? () => {
                        setSelectedCommentId(item.id);
                        setShowRestoreConfirm(true);
                      }
                    : undefined
                }
                onDelete={() => {
                  setSelectedCommentId(item.id);
                  setShowDeleteConfirm(true);
                }}
              />
            )}
          />
        )}
      </View>

      <ConfirmModal
        visible={showRestoreConfirm}
        title="Restore Comment?"
        message="This will make the comment visible to users again."
        confirmText="Restore"
        confirmColor="bg-cyan-500"
        onConfirm={restoreComment}
        onCancel={() => {
          setShowRestoreConfirm(false);
          setSelectedCommentId(null);
        }}
        isProcessing={processing}
      />

      <ConfirmModal
        visible={showDeleteConfirm}
        title="Delete Comment?"
        message="This will permanently delete the comment. This action cannot be undone."
        confirmText="Delete"
        confirmColor="bg-red-500"
        onConfirm={permanentlyDeleteComment}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setSelectedCommentId(null);
        }}
        isProcessing={processing}
      />

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
                            : selectedReport.status === "resolved"
                              ? "bg-green-500/20 border border-green-500/30"
                              : "bg-gray-500/20 border border-gray-500/30"
                      }`}
                    >
                      <ThemedText
                        className={`text-xs font-bold ${
                          selectedReport.status === "pending"
                            ? "text-orange-400"
                            : selectedReport.status === "reviewed"
                              ? "text-blue-400"
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
                    <ThemedText className={`${textMuted} text-xs mb-1`}>Comment</ThemedText>
                    <View className={`${bgCardAlt} rounded-lg p-3`}>
                      <ThemedText className={`${textPrimary} leading-5`}>
                        {selectedReport.comment?.comment_text || "Comment deleted"}
                      </ThemedText>
                    </View>
                  </View>

                  <View className="mb-4">
                    <ThemedText className={`${textMuted} text-xs mb-1`}>Resource</ThemedText>
                    <View className={`${bgCardAlt} rounded-lg p-3`}>
                      <ThemedText className={textPrimary}>
                        {selectedReport.resource_title || "Unknown Resource"}
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
                    <ThemedText className={`${textMuted} text-xs mb-1`}>Comment Author</ThemedText>
                    <View className={`${bgCardAlt} rounded-lg p-3`}>
                      <ThemedText className={textPrimary}>
                        {selectedReport.commentAuthor?.first_name} {selectedReport.commentAuthor?.last_name}
                      </ThemedText>
                    </View>
                  </View>

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
                          resolveReport(selectedReport.id, "resolved")
                        }
                        disabled={processing}
                        className="bg-green-500 rounded-lg p-3 flex-row items-center justify-center gap-2"
                      >
                        {processing ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                            <ThemedText className="text-white font-semibold">
                              Approve & Delete Comment
                            </ThemedText>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => resolveReport(selectedReport.id, "dismissed")}
                        disabled={processing}
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
