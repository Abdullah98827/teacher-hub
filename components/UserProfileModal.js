import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { useAppTheme } from "../hooks/useAppTheme";
import { useFollow } from "../hooks/useFollow";
import { supabase } from "../supabase";
import { useAdminNotifications } from "../utils/adminNotificationIntegrations";
import ProfilePicture from "./ProfilePicture";
import { ThemedText } from './themed-text';

const REPORT_REASONS = [
  { label: "Inappropriate content", icon: "alert-circle-outline" },
  { label: "Harassment or bullying", icon: "warning-outline" },
  { label: "Suspicious activity", icon: "eye-outline" },
  { label: "Spam or fraud", icon: "shield-alert-outline" },
  { label: "Copyright infringement", icon: "document-text-outline" },
  { label: "Other", icon: "create-outline" },
];

export default function UserProfileModal({
  visible,
  userId,
  onClose,
  onNavigateToPath,
}) {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [reportingUser, setReportingUser] = useState(false);

  // Report modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [showReasonDropdown, setShowReasonDropdown] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  const {
    isFollowing,
    followersCount,
    followingCount,
    toggleFollow,
    loading: followLoading,
    refresh: refreshFollowData,
  } = useFollow(userId);

  const { notifyAdminUserReportedDirect } = useAdminNotifications();

  const {
    bg,
    bgCard,
    bgCardAlt,
    border,
    borderInput,
    bgInput,
    textPrimary,
    textSecondary,
    textMuted,
    isDark,
  } = useAppTheme();

  useEffect(() => {
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (visible && userId) {
      setProfile(null);
      loadProfile();
    }
  }, [visible, userId]);

  const getCurrentUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const loadProfile = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data: teacherData, error: teacherError } = await supabase
        .from("teachers")
        .select(
          "id, first_name, last_name, profile_picture_url, bio, school_name, years_experience, allow_dms"
        )
        .eq("id", userId)
        .single();
      if (teacherError) throw teacherError;

      const { count: resourceCount } = await supabase
        .from("resources")
        .select("*", { count: "exact", head: true })
        .eq("uploaded_by", userId)
        .eq("status", "approved");

      const { count: commentCount } = await supabase
        .from("resource_comments")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_deleted", false);

      const { data: membershipData } = await supabase
        .from("memberships")
        .select("tier, subject_ids")
        .eq("id", userId)
        .eq("active", true)
        .single();

      let membershipSubjects = [];
      if (membershipData?.subject_ids) {
        const { data: subjectsData } = await supabase
          .from("subjects")
          .select("id, name")
          .in("id", membershipData.subject_ids);
        membershipSubjects = subjectsData || [];
      }

      setProfile({
        ...teacherData,
        resource_count: resourceCount || 0,
        comment_count: commentCount || 0,
        membership_tier: membershipData?.tier || null,
        membership_subjects: membershipSubjects,
      });
      refreshFollowData();
    } catch (_error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to load profile",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (path) => {
    onClose();
    setTimeout(() => {
      router.push(path);
    }, 300);
  };

  const handleMessage = () => {
    if (!userId) return;
    if (profile?.allow_dms === "nobody") {
      Toast.show({
        type: "error",
        text1: "Cannot Message",
        text2: "This teacher has disabled direct messages",
      });
      return;
    }
    if (profile?.allow_dms === "followers_only" && !isFollowing) {
      Toast.show({
        type: "error",
        text1: "Cannot Message",
        text2: "You must follow this teacher to send them a message",
      });
      return;
    }
    onClose();
    setTimeout(() => {
      router.push(`/dm/${userId}`);
    }, 300);
  };

  // Open report modal
  const handleOpenReportModal = () => {
    setShowReportModal(true);
  };

  // Reset report form
  const resetReportForm = () => {
    setShowReasonDropdown(false);
    setSelectedReason("");
    setCustomReason("");
    setReportDetails("");
  };

  // Close report modal
  const handleCloseReportModal = () => {
    setShowReportModal(false);
    setTimeout(() => {
      resetReportForm();
    }, 300);
  };

  // Submit report
  const handleSubmitReport = async () => {
    if (!selectedReason) {
      Toast.show({
        type: "error",
        text1: "Please select a reason",
      });
      return;
    }

    const finalReason = selectedReason === "Other" ? customReason.trim() : selectedReason;

    if (!finalReason) {
      Toast.show({
        type: "error",
        text1: "Please enter a reason",
      });
      return;
    }

    setSubmittingReport(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Toast.show({ type: "error", text1: "Please log in" });
        setSubmittingReport(false);
        return;
      }

      // Store report in database
      const { error: reportError } = await supabase
        .from("user_reports")
        .insert([
          {
            reported_by: user.id,
            reported_user_id: userId,
            reason: finalReason,
            details: reportDetails.trim() || null,
            status: "pending",
            created_at: new Date().toISOString(),
          },
        ]);

      if (reportError) throw reportError;

      // Fetch admin IDs
      const { data: adminUsers } = await supabase
        .from("user_roles")
        .select("id")
        .or("role.eq.admin,role.eq.super_admin");

      if (adminUsers && adminUsers.length > 0) {
        const adminIds = adminUsers.map((a) => a.id);
        await notifyAdminUserReportedDirect(
          adminIds,
          user.id,
          user.email || "Anonymous",
          userId,
          `${profile?.first_name} ${profile?.last_name}`,
          finalReason,
          reportDetails.trim() || "No additional details provided"
        ).catch((err) => console.warn("Failed to notify admin:", err));
      }

      Toast.show({
        type: "success",
        text1: "Report submitted ✓",
        text2: "Thank you. Our team will review this.",
      });

      handleCloseReportModal();
    } catch (err) {
      console.error("Report error:", err);
      Toast.show({
        type: "error",
        text1: "Failed to submit report",
        text2: err.message || "Please try again",
      });
    } finally {
      setSubmittingReport(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View className={`flex-1 ${bg}`}>
        {/* Modal Header */}
        <View className={`${bgCard} p-4 pt-14 border-b ${border}`}>
          <View className="flex-row items-center justify-between">
            <ThemedText className="text-2xl font-bold text-cyan-400">
              Teacher Profile
            </ThemedText>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color="#22d3ee" />
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#22d3ee" />
          </View>
        ) : profile ? (
          <ScrollView className="flex-1">
            <View className={`items-center p-6 ${bgCard}`}>
              <ProfilePicture
                imageUrl={profile.profile_picture_url}
                firstName={profile.first_name}
                lastName={profile.last_name}
                size="xl"
              />
              <ThemedText className={`${textPrimary} text-2xl font-bold mt-4`}>
                {profile.first_name} {profile.last_name}
              </ThemedText>
              {profile.bio && (
                <ThemedText className={`${textSecondary} text-center mt-2 px-4`}>
                  {profile.bio}
                </ThemedText>
              )}
              {profile.school_name && (
                <View className="flex-row items-center mt-2">
                  <Ionicons name="school-outline" size={16} color="#9CA3AF" />
                  <ThemedText className={`${textSecondary} ml-1`}>
                    {profile.school_name}
                  </ThemedText>
                </View>
              )}
              {profile.years_experience !== null && (
                <View className="flex-row items-center mt-1">
                  <Ionicons name="time-outline" size={16} color="#9CA3AF" />
                  <ThemedText className={`${textSecondary} ml-1`}>
                    {profile.years_experience}{" "}
                    {profile.years_experience === 1 ? "year" : "years"}{" "}
                    experience
                  </ThemedText>
                </View>
              )}
              {currentUserId !== userId && (
                <>
                  <View className="flex-row gap-3 mt-6 w-full px-4">
                    <TouchableOpacity
                      className="flex-1 bg-cyan-600 py-3 rounded-xl flex-row items-center justify-center"
                      onPress={handleMessage}
                    >
                      <Ionicons name="mail" size={20} color="#fff" />
                      <ThemedText className="text-white font-bold ml-2">Message</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className={`flex-1 py-3 rounded-xl flex-row items-center justify-center ${
                        isFollowing
                          ? "border-2 border-cyan-600"
                          : "bg-cyan-600"
                      }`}
                      onPress={toggleFollow}
                      disabled={followLoading}
                    >
                      {followLoading ? (
                        <ActivityIndicator size="small" color="#0e7490" />
                      ) : (
                        <>
                          <Ionicons
                            name={isFollowing ? "person-remove" : "person-add"}
                            size={20}
                            color={isFollowing ? "#0e7490" : "#fff"}
                          />
                          <ThemedText
                            className={`font-bold ml-2 ${isFollowing ? "text-cyan-700" : "text-white"}`}
                          >
                            {isFollowing ? "Unfollow" : "Follow"}
                          </ThemedText>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Report User Button */}
                  <TouchableOpacity
                    className="mt-3 mx-4 bg-red-600/20 border border-red-600 py-3 rounded-xl flex-row items-center justify-center w-11/12"
                    onPress={handleOpenReportModal}
                  >
                    <Ionicons name="flag" size={18} color="#ef4444" />
                    <ThemedText className="text-red-600 font-bold ml-2">
                      Report User
                    </ThemedText>
                  </TouchableOpacity>
                </>
              )}
            </View>

            <View
              className={`flex-row ${bgCard} border-t border-b ${border} mt-4`}
            >
              <TouchableOpacity
                className={`flex-1 items-center py-4 border-r ${border}`}
                onPress={() => handleNavigate(`/(tabs)/followers/${userId}`)}
              >
                <ThemedText className={`${textPrimary} text-2xl font-bold`}>
                  {followersCount}
                </ThemedText>
                <ThemedText className={`${textSecondary} text-sm`}>
                  {followersCount === 1 ? "Follower" : "Followers"}
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 items-center py-4"
                onPress={() => handleNavigate(`/(tabs)/following/${userId}`)}
              >
                <ThemedText className={`${textPrimary} text-2xl font-bold`}>
                  {followingCount}
                </ThemedText>
                <ThemedText className={`${textSecondary} text-sm`}>Following</ThemedText>
              </TouchableOpacity>
            </View>

            <View className={`${bgCard} p-6 mt-4`}>
              <ThemedText className="text-lg font-bold text-cyan-400 mb-4">
                Activity
              </ThemedText>
              <View className="flex-row justify-around">
                <View className="items-center">
                  <ThemedText className={`${textPrimary} text-2xl font-bold`}>
                    {profile.resource_count}
                  </ThemedText>
                  <ThemedText className={`${textSecondary} text-sm`}>
                    {profile.resource_count === 1 ? "Resource" : "Resources"}
                  </ThemedText>
                </View>
                <View className="items-center">
                  <ThemedText className={`${textPrimary} text-2xl font-bold`}>
                    {profile.comment_count}
                  </ThemedText>
                  <ThemedText className={`${textSecondary} text-sm`}>
                    {profile.comment_count === 1 ? "Comment" : "Comments"}
                  </ThemedText>
                </View>
              </View>
            </View>

            {(profile.membership_tier ||
              profile.membership_subjects.length > 0) && (
              <View className={`${bgCard} p-6 mt-4`}>
                <ThemedText className="text-lg font-bold text-cyan-400 mb-4">
                  Professional Info
                </ThemedText>
                {profile.membership_tier && (
                  <View className="mb-4">
                    <ThemedText className={`${textMuted} text-xs mb-2`}>
                      Membership Tier
                    </ThemedText>
                    <View className={`${bgCardAlt} px-4 py-2 rounded-lg`}>
                      <ThemedText className={`${textPrimary} font-semibold`}>
                        {profile.membership_tier === "single"
                          ? "Single Subject"
                          : "Multi Subject"}
                      </ThemedText>
                    </View>
                  </View>
                )}
                {profile.membership_subjects.length > 0 && (
                  <View>
                    <ThemedText className={`${textMuted} text-xs mb-2`}>
                      Subjects
                    </ThemedText>
                    <View className="flex-row flex-wrap gap-2">
                      {profile.membership_subjects.map((subject) => (
                        <View
                          key={subject.id}
                          className="bg-cyan-600 px-3 py-1 rounded-full"
                        >
                          <ThemedText className="text-white text-xs">
                            {subject.name}
                          </ThemedText>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        ) : (
          <View className="flex-1 items-center justify-center p-6">
            <Ionicons name="person-outline" size={64} color="#6B7280" />
            <ThemedText className={`${textPrimary} text-xl font-bold mt-4`}>
              Profile Not Found
            </ThemedText>
            <ThemedText className={`${textSecondary} text-center mt-2`}>
              This profile could not be loaded
            </ThemedText>
          </View>
        )}
      </View>

      {/* ── Report User Modal ─────────────────────────────────────── */}
      <Modal
        visible={showReportModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseReportModal}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 20,
          }}
          pointerEvents="box-none"
        >
          <View
            pointerEvents="box-only"
            className={`${bgCard} rounded-2xl p-6 w-full border ${border}`}
            style={{ maxWidth: 500 }}
          >
            {/* Header */}
            <View className="flex-row items-center justify-between mb-4">
              <ThemedText className={`${textPrimary} text-xl font-bold`}>
                Report {profile?.first_name}?
              </ThemedText>
              <TouchableOpacity
                onPress={handleCloseReportModal}
                disabled={submittingReport}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={submittingReport ? "#6b7280" : "#ef4444"}
                />
              </TouchableOpacity>
            </View>

            <ThemedText className={`${textSecondary} mb-4`}>
              Help us keep Teacher-Hub safe. Your report will be reviewed by our moderation team.
            </ThemedText>

            {/* Reason Selection */}
            <View className="mb-4">
              <ThemedText className={`${textMuted} text-xs mb-2 uppercase tracking-wider font-semibold`}>
                Report Reason
              </ThemedText>

              <TouchableOpacity
                className={`rounded-xl border ${border} p-4 flex-row items-center justify-between ${
                  showReasonDropdown ? `${bgCardAlt}` : ""
                }`}
                onPress={() => setShowReasonDropdown((v) => !v)}
                disabled={submittingReport}
              >
                <ThemedText
                  className={`font-semibold ${
                    selectedReason ? textPrimary : textMuted
                  }`}
                >
                  {selectedReason || "Select a reason..."}
                </ThemedText>
                <Ionicons
                  name={showReasonDropdown ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#6b7280"
                />
              </TouchableOpacity>

              {showReasonDropdown && (
                <View
                  className={`mt-2 rounded-xl border ${border} overflow-hidden`}
                >
                  {REPORT_REASONS.map((reason, index) => {
                    const isSelected = selectedReason === reason.label;
                    const isLast = index === REPORT_REASONS.length - 1;

                    return (
                      <View key={reason.label}>
                        <TouchableOpacity
                          className={`flex-row items-center gap-3 px-4 py-3 ${
                            isSelected ? "bg-red-600/20" : bgCard
                          }`}
                          onPress={() => {
                            setSelectedReason(reason.label);
                            if (reason.label !== "Other") {
                              setCustomReason("");
                            }
                          }}
                          disabled={submittingReport}
                        >
                          <View
                            className={`w-7 h-7 rounded-full items-center justify-center ${
                              isSelected
                                ? "bg-red-600/30"
                                : "bg-red-500/15"
                            }`}
                          >
                            <Ionicons
                              name={reason.icon}
                              size={14}
                              color={isSelected ? "#ef4444" : "#6b7280"}
                            />
                          </View>
                          <ThemedText
                            className={`flex-1 text-sm ${
                              isSelected
                                ? "text-red-500 font-semibold"
                                : textPrimary
                            }`}
                          >
                            {reason.label}
                          </ThemedText>
                          {isSelected && (
                            <Ionicons
                              name="checkmark-circle"
                              size={16}
                              color="#ef4444"
                            />
                          )}
                        </TouchableOpacity>
                        {!isLast && (
                          <View
                            style={{
                              height: 1,
                              backgroundColor: isDark
                                ? "rgba(255,255,255,0.06)"
                                : "rgba(0,0,0,0.06)",
                            }}
                          />
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Custom Reason (if "Other" selected) */}
            {selectedReason === "Other" && (
              <View className="mb-4">
                <ThemedText className={`${textMuted} text-xs mb-2`}>
                  Please specify the reason
                </ThemedText>
                <TextInput
                  placeholder="Enter reason..."
                  placeholderTextColor="#9ca3af"
                  value={customReason}
                  onChangeText={setCustomReason}
                  style={{
                    backgroundColor: isDark ? "#1f2937" : "#f3f4f6",
                    color: isDark ? "#e2e8f0" : "#0f172a",
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 14,
                    borderWidth: 1,
                    borderColor: isDark ? "#374151" : "#e5e7eb",
                  }}
                  editable={!submittingReport}
                />
              </View>
            )}

            {/* Additional Details */}
            <View className="mb-4">
              <ThemedText className={`${textMuted} text-xs mb-2`}>
                Additional Details (Optional)
              </ThemedText>
              <TextInput
                placeholder="Provide any additional context..."
                placeholderTextColor="#9ca3af"
                value={reportDetails}
                onChangeText={setReportDetails}
                multiline
                numberOfLines={3}
                style={{
                  backgroundColor: isDark ? "#1f2937" : "#f3f4f6",
                  color: isDark ? "#e2e8f0" : "#0f172a",
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 14,
                  borderWidth: 1,
                  borderColor: isDark ? "#374151" : "#e5e7eb",
                  textAlignVertical: "top",
                }}
                editable={!submittingReport}
              />
            </View>

            {/* Actions */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                className={`flex-1 py-3 rounded-xl border ${border} ${bgCardAlt} ${
                  submittingReport ? "opacity-50" : ""
                }`}
                onPress={handleCloseReportModal}
                disabled={submittingReport}
              >
                <ThemedText className={`${textPrimary} text-center font-bold`}>
                  Cancel
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                className={`flex-1 py-3 rounded-xl flex-row items-center justify-center ${
                  !selectedReason || submittingReport
                    ? "bg-red-600/50"
                    : "bg-red-600"
                }`}
                onPress={handleSubmitReport}
                disabled={!selectedReason || submittingReport}
              >
                {submittingReport ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="flag" size={16} color="#fff" />
                    <ThemedText className="text-white font-bold ml-2">
                      Submit Report
                    </ThemedText>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Privacy Notice */}
            <View className="mt-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <ThemedText className={`${textMuted} text-xs`}>
                Your report is anonymous. We take all reports seriously and will investigate appropriately.
              </ThemedText>
            </View>
          </View>
        </View>
      </Modal>

      <Toast />
    </Modal>
  );
}