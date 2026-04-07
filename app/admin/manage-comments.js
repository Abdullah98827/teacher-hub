import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    View,
} from "react-native";
import Toast from "react-native-toast-message";
import AdminHeader from "../../components/AdminHeader";
import CommentCard from "../../components/CommentCard";
import ConfirmModal from "../../components/ConfirmModal";
import ReportedCommentCard from "../../components/ReportedCommentCard";
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

  const { textPrimary, textSecondary } = useAppTheme();

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
      .select("*, resource_comments(id, comment_text, created_at, user_id, resource_id)")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (reportsData && reportsData.length > 0) {
      // Fetch additional user and resource info for reports
      const reportUserIds = [...new Set(reportsData.map((r) => r.reported_user_id))];
      const reportResourceIds = [...new Set(reportsData.map((r) => r.resource_comments?.resource_id).filter(Boolean))];

      const [{ data: reportUsers }, { data: reportResources }] = await Promise.all([
        reportUserIds.length > 0 ? supabase
          .from("teachers")
          .select("id, first_name, last_name")
          .in("id", reportUserIds) : Promise.resolve({ data: [] }),
        reportResourceIds.length > 0 ? supabase
          .from("resources")
          .select("id, title")
          .in("id", reportResourceIds) : Promise.resolve({ data: [] }),
      ]);

      const reportUserMap = (reportUsers || []).reduce((acc, u) => {
        acc[u.id] = u;
        return acc;
      }, {});
      const reportResourceMap = (reportResources || []).reduce((acc, r) => {
        acc[r.id] = r;
        return acc;
      }, {});

      const enrichedReports = reportsData.map((report) => {
        const reportedUser = reportUserMap[report.reported_user_id] || {};
        const resource = reportResourceMap[report.resource_comments?.resource_id] || {};
        return {
          ...report,
          reported_user_name: `${reportedUser.first_name || "Unknown"} ${reportedUser.last_name || ""}`.trim(),
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
      const { error } = await supabase
        .from("comment_reports")
        .update({
          status: resolution, // 'reviewed', 'resolved', 'dismissed'
          reviewed_by: user?.id,
          review_notes: notes,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", reportId);

      if (error) throw error;

      logEvent({
        event_type: "COMMENT_REPORT_RESOLVED",
        user_id: user?.id,
        target_id: reportId,
        target_table: "comment_reports",
        details: { resolution, notes },
      });

      Toast.show({
        type: "success",
        text1: "Report resolved",
        text2: `Status changed to ${resolution}`,
      });

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
            { label: "Total", value: comments.length, color: "cyan" },
            { label: "Active", value: activeCount, color: "green" },
            { label: "Deleted", value: deletedCount, color: "red" },
          ]}
        />

        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search comments, users, or resources..."
        />

        <TabFilter
          tabs={[
            { label: "All Comments", value: "all", icon: "list-outline" },
            { label: `Reported (${reportedComments.length})`, value: "reported", icon: "flag-outline" },
            { label: "Deleted", value: "deleted", icon: "trash-outline" },
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
            renderItem={({ item: report }) => <ReportedCommentCard report={report} onResolve={resolveReport} processing={processing} />}
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

      <Toast />
    </ScreenWrapper>
  );
}
