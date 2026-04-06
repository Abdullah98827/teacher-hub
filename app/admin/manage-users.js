import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Modal,
    RefreshControl,
    ScrollView,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import Toast from "react-native-toast-message";
import AdminHeader from "../../components/AdminHeader";
import ScreenWrapper from "../../components/ScreenWrapper";
import StatsSummary from "../../components/StatsSummary";
import TabFilter from "../../components/TabFilter";
import { ThemedText } from "../../components/themed-text";
import { useAuth } from "../../contexts/AuthContext";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useUserRole } from "../../hooks/useUserRole";
import { supabase } from "../../supabase";
import { logEvent } from "../../utils/logging";

const DISABLE_REASONS = [
  { label: "Violating community guidelines", icon: "warning-outline" },
  { label: "Inappropriate content", icon: "alert-circle-outline" },
  { label: "Suspicious activity", icon: "eye-outline" },
  { label: "Policy violation", icon: "document-text-outline" },
  { label: "Account compromise", icon: "lock-closed-outline" },
  { label: "Other", icon: "create-outline" },
];

export default function ManageUsersScreen() {
  const { user } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [showReasonDropdown, setShowReasonDropdown] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");

  // Keep a stable ref to selectedUser so handlers never read stale null
  const selectedUserRef = useRef(null);
  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  const isAdmin = role === "admin";
  const {
    bgCard,
    border,
    textPrimary,
    textSecondary,
    textMuted,
    bgInput,
    borderInput,
    isDark,
  } = useAppTheme();

  const fetchUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("user_roles_details")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        Toast.show({
          type: "error",
          text1: "Failed to load users",
          text2: error.message,
        });
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const enriched = await Promise.all(
        (data || []).map(async (userRole) => {
          const { data: teacher } = await supabase
            .from("teachers")
            .select(
              "verified, approved, followers_count, profile_picture_url, school_name, allow_dms, is_disabled, disabled_reason, disabled_at, disabled_by"
            )
            .eq("id", userRole.id)
            .single();
          return { ...userRole, teacher: teacher || {} };
        })
      );

      setUsers(enriched);
      setLoading(false);
      setRefreshing(false);
    } catch (err) {
      console.error("Error fetching users:", err);
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!roleLoading && isAdmin) fetchUsers();
  }, [isAdmin, roleLoading, fetchUsers]);

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      !searchQuery ||
      u.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase());

    if (filter === "all") return matchesSearch;
    if (filter === "verified") return matchesSearch && u.teacher?.verified;
    if (filter === "unverified") return matchesSearch && !u.teacher?.verified;
    if (filter === "approved") return matchesSearch && u.teacher?.approved;
    if (filter === "rejected")
      return matchesSearch && !u.teacher?.approved && u.teacher?.verified;
    return matchesSearch;
  });

  const stats = {
    totalUsers: users.length,
    verifiedUsers: users.filter((u) => u.teacher?.verified).length,
    unverifiedUsers: users.filter((u) => !u.teacher?.verified).length,
  };

  const getAdminId = async () => {
    const { data } = await supabase
      .from("admins")
      .select("id")
      .eq("id", user?.id)
      .maybeSingle();
    return data?.id || null;
  };

  // Fully resets all modal state
  const resetAllState = () => {
    setConfirmAction(null);
    setShowReasonDropdown(false);
    setSelectedReason("");
    setCustomReason("");
    setUpdating(false);
  };

  const dismissAndRefresh = () => {
    // Step 1: close confirm modal immediately
    setConfirmAction(null);
    // Step 2: close detail modal after a tick
    setTimeout(() => {
      setShowDetailModal(false);
      // Step 3: clear user after modal animation completes
      setTimeout(() => {
        setSelectedUser(null);
        resetAllState();
        // Step 4: refresh list last
        fetchUsers();
      }, 400);
    }, 50);
  };

  const dismissConfirmOnly = async () => {
    try {
      // Close confirm modal first
      setConfirmAction(null);
      
      // Refresh the selected user with fresh data
      if (selectedUserRef.current?.id) {
        try {
          const { data: teacher } = await supabase
            .from("teachers")
            .select(
              "verified, approved, followers_count, profile_picture_url, school_name, allow_dms, is_disabled, disabled_reason, disabled_at, disabled_by"
            )
            .eq("id", selectedUserRef.current.id)
            .single();
          
          if (teacher) {
            setSelectedUser((prev) => ({
              ...prev,
              teacher: teacher || {},
            }));
          }
        } catch (err) {
          console.error("Error refreshing selected user:", err);
        }
      }
      
      // Refresh the users list
      try {
        const { data, error } = await supabase
          .from("user_roles_details")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;

        const enriched = await Promise.all(
          (data || []).map(async (userRole) => {
            const { data: teacher } = await supabase
              .from("teachers")
              .select(
                "verified, approved, followers_count, profile_picture_url, school_name, allow_dms, is_disabled, disabled_reason, disabled_at, disabled_by"
              )
              .eq("id", userRole.id)
              .single();
            return { ...userRole, teacher: teacher || {} };
          })
        );
        
        setUsers(enriched);
      } catch (err) {
        console.error("Error refreshing users list:", err);
      }
    } finally {
      // Always reset updating flag at the end
      setUpdating(false);
    }
  };

  const handleDisableAccount = async (userId, reason) => {
    if (!userId) {
      Toast.show({ type: "error", text1: "Error", text2: "No user selected" });
      return;
    }
    setUpdating(true);
    try {
      const now = new Date().toISOString();
      const finalReason = reason || "Account disabled by admin";
      const adminId = await getAdminId();

      const { error } = await supabase
        .from("teachers")
        .update({
          is_disabled: true,
          disabled_reason: finalReason,
          disabled_at: now,
          disabled_by: adminId || null,
        })
        .eq("id", userId);

      if (error) throw error;

      try {
        await logEvent({
          event_type: "USER_ACCOUNT_DISABLED",
          user_id: user?.id,
          target_id: userId,
          target_table: "teachers",
          details: { reason: finalReason, disabled_at: now },
        });
      } catch (_) {}

      Toast.show({
        type: "success",
        text1: "Account Disabled",
        text2: finalReason,
      });

      dismissAndRefresh();
    } catch (err) {
      setUpdating(false);
      console.error("Disable error:", err);
      Toast.show({
        type: "error",
        text1: "Failed to disable account",
        text2: err.message || "Check RLS policies on teachers table",
      });
    }
  };

  const handleEnableAccount = async (userId) => {
    if (!userId) {
      Toast.show({ type: "error", text1: "Error", text2: "No user selected" });
      return;
    }
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("teachers")
        .update({
          is_disabled: false,
          disabled_reason: null,
          disabled_at: null,
          disabled_by: null,
        })
        .eq("id", userId);

      if (error) throw error;

      try {
        await logEvent({
          event_type: "USER_ACCOUNT_ENABLED",
          user_id: user?.id,
          target_id: userId,
          target_table: "teachers",
        });
      } catch (_) {}

      Toast.show({
        type: "success",
        text1: "Account Enabled",
        text2: "User can now log in again",
      });

      // Dismiss with timeout safety net
      const dismissPromise = dismissConfirmOnly();
      const timeoutPromise = new Promise((resolve) => 
        setTimeout(resolve, 5000)
      );
      await Promise.race([dismissPromise, timeoutPromise]);
    } catch (err) {
      setUpdating(false);
      console.error("Enable error:", err);
      Toast.show({
        type: "error",
        text1: "Failed to enable account",
        text2: err.message || "Check RLS policies on teachers table",
      });
    }
  };

  const handleResetPassword = async (userId, email) => {
    if (!userId || !email) {
      Toast.show({ type: "error", text1: "Error", text2: "Missing user info" });
      return;
    }
    setUpdating(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "teacherhub://reset-password",
      });

      if (error) throw error;

      try {
        await logEvent({
          event_type: "USER_PASSWORD_RESET",
          user_id: user?.id,
          target_id: userId,
          target_table: "teachers",
        });
      } catch (_) {}

      Toast.show({
        type: "success",
        text1: "Reset Email Sent ✓",
        text2: `Sent to ${email}`,
      });

      // Dismiss with timeout safety net
      const dismissPromise = dismissConfirmOnly();
      const timeoutPromise = new Promise((resolve) => 
        setTimeout(resolve, 5000)
      );
      await Promise.race([dismissPromise, timeoutPromise]);
    } catch (err) {
      setUpdating(false);
      console.error("Reset password error:", err);
      Toast.show({
        type: "error",
        text1: "Failed to send reset email",
        text2: err.message || "Email error",
      });
    }
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setTimeout(() => {
      setSelectedUser(null);
      resetAllState();
    }, 400);
  };

  if (loading || roleLoading) {
    return (
      <ScreenWrapper>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#22d3ee" />
        </View>
      </ScreenWrapper>
    );
  }

  if (!isAdmin) return null;

  return (
    <ScreenWrapper>
      <View className="flex-1 px-5 pt-4">
        <AdminHeader
          title="Manage Users"
          subtitle={`${users.length} total users`}
        />

        <StatsSummary
          stats={[
            { label: "Total Users", value: stats.totalUsers, color: "blue" },
            { label: "Verified", value: stats.verifiedUsers, color: "green" },
            {
              label: "Unverified",
              value: stats.unverifiedUsers,
              color: "orange",
            },
          ]}
        />

        <View
          className={`mb-4 rounded-xl ${bgInput} border ${borderInput} px-4 py-3 flex-row items-center gap-2`}
        >
          <Ionicons name="search" size={20} color="#6b7280" />
          <TextInput
            placeholder="Search by name or email..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{
              flex: 1,
              color: isDark ? "#e2e8f0" : "#0f172a",
              fontSize: 16,
            }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>

        <TabFilter
          tabs={["all", "verified", "unverified", "approved", "rejected"]}
          activeTab={filter}
          onTabChange={setFilter}
        />

        {filteredUsers.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <Ionicons name="people-outline" size={48} color="#6b7280" />
            <ThemedText
              className={`text-lg font-semibold mt-4 ${textPrimary}`}
            >
              No users found
            </ThemedText>
            <ThemedText className={`${textMuted} text-center mt-2`}>
              {searchQuery
                ? "Try adjusting your search"
                : "No users match this filter"}
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={filteredUsers}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchUsers();
                }}
                tintColor="#22d3ee"
              />
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => {
                  setSelectedUser(item);
                  setShowDetailModal(true);
                  setShowReasonDropdown(false);
                  setSelectedReason("");
                  setCustomReason("");
                }}
                className={`mb-3 p-4 rounded-xl ${bgCard} border ${border}`}
                activeOpacity={0.7}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <ThemedText
                      className={`text-base font-bold ${textPrimary}`}
                    >
                      {item.first_name} {item.last_name}
                    </ThemedText>
                    <ThemedText className={`${textMuted} text-sm`}>
                      {item.email}
                    </ThemedText>
                    <View className="flex-row gap-2 mt-2 flex-wrap">
                      {item.teacher?.verified && (
                        <View className="bg-green-500/20 px-2 py-1 rounded-full flex-row items-center gap-1">
                          <Ionicons
                            name="checkmark"
                            size={12}
                            color="#22c55e"
                          />
                          <ThemedText className="text-xs text-green-500">
                            Verified
                          </ThemedText>
                        </View>
                      )}
                      {item.teacher?.approved && (
                        <View className="bg-blue-500/20 px-2 py-1 rounded-full flex-row items-center gap-1">
                          <Ionicons
                            name="shield-checkmark"
                            size={12}
                            color="#3b82f6"
                          />
                          <ThemedText className="text-xs text-blue-500">
                            Approved
                          </ThemedText>
                        </View>
                      )}
                      {item.teacher?.is_disabled && (
                        <View className="bg-red-500/20 px-2 py-1 rounded-full flex-row items-center gap-1">
                          <Ionicons name="ban" size={12} color="#ef4444" />
                          <ThemedText className="text-xs text-red-500">
                            Disabled
                          </ThemedText>
                        </View>
                      )}
                    </View>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={24}
                    color="#6b7280"
                  />
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      {/* ── User Detail Modal ──────────────────────────────────────── */}
      <Modal
        visible={showDetailModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          // Don't close the detail modal if there's a confirmation pending
          if (!confirmAction) {
            closeDetailModal();
          }
        }}
      >
        <ScreenWrapper>
          <View className="flex-1 px-5 pt-4">
            {/* ...existing code... */}
            <View className="flex-row justify-between items-center mb-6">
              <ThemedText className={`text-xl font-bold ${textPrimary}`}>
                User Details
              </ThemedText>
              <TouchableOpacity 
                onPress={closeDetailModal} 
                className="p-2"
                disabled={!!confirmAction}
              >
                <Ionicons 
                  name="close" 
                  size={28} 
                  color={confirmAction ? "#6b7280" : "#22d3ee"}
                />
              </TouchableOpacity>
            </View>

            {selectedUser && (
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                scrollEnabled={!confirmAction}
              >
                {/* Profile Info */}
                <View
                  className={`p-4 rounded-xl ${bgCard} border ${border} mb-4`}
                >
                  <ThemedText
                    className={`text-xs font-semibold ${textMuted} mb-3 uppercase tracking-wider`}
                  >
                    Profile Information
                  </ThemedText>
                  <View className="gap-3">
                    <View>
                      <ThemedText className={`text-xs ${textMuted} mb-0.5`}>
                        Name
                      </ThemedText>
                      <ThemedText className={`text-base ${textPrimary}`}>
                        {selectedUser.first_name} {selectedUser.last_name}
                      </ThemedText>
                    </View>
                    <View>
                      <ThemedText className={`text-xs ${textMuted} mb-0.5`}>
                        Email
                      </ThemedText>
                      <ThemedText className={`text-base ${textPrimary}`}>
                        {selectedUser.email}
                      </ThemedText>
                    </View>
                    <View>
                      <ThemedText className={`text-xs ${textMuted} mb-0.5`}>
                        Role
                      </ThemedText>
                      <ThemedText
                        className={`text-base capitalize ${textPrimary}`}
                      >
                        {selectedUser.role}
                      </ThemedText>
                    </View>
                    {selectedUser.teacher?.school_name && (
                      <View>
                        <ThemedText
                          className={`text-xs ${textMuted} mb-0.5`}
                        >
                          School
                        </ThemedText>
                        <ThemedText className={`text-base ${textPrimary}`}>
                          {selectedUser.teacher.school_name}
                        </ThemedText>
                      </View>
                    )}
                  </View>
                </View>

                {/* Account Status */}
                <View
                  className={`p-4 rounded-xl ${bgCard} border ${border} mb-4`}
                >
                  <ThemedText
                    className={`text-xs font-semibold ${textMuted} mb-3 uppercase tracking-wider`}
                  >
                    Account Status
                  </ThemedText>
                  <View className="gap-3">
                    {[
                      {
                        label: "Verified",
                        value: selectedUser.teacher?.verified,
                        yesCls: "text-green-500",
                        noCls: "text-red-500",
                        yesBg: "bg-green-500/20",
                        noBg: "bg-red-500/20",
                        yesLabel: "Yes",
                        noLabel: "No",
                      },
                      {
                        label: "Approved",
                        value: selectedUser.teacher?.approved,
                        yesCls: "text-green-500",
                        noCls: "text-orange-500",
                        yesBg: "bg-green-500/20",
                        noBg: "bg-orange-500/20",
                        yesLabel: "Yes",
                        noLabel: "Pending",
                      },
                      {
                        label: "Account Disabled",
                        value: selectedUser.teacher?.is_disabled,
                        yesCls: "text-red-500",
                        noCls: "text-green-500",
                        yesBg: "bg-red-500/20",
                        noBg: "bg-green-500/20",
                        yesLabel: "Disabled",
                        noLabel: "Active",
                      },
                    ].map((row) => (
                      <View
                        key={row.label}
                        className="flex-row justify-between items-center"
                      >
                        <ThemedText className={textPrimary}>
                          {row.label}
                        </ThemedText>
                        <View
                          className={`px-3 py-1 rounded-full ${
                            row.value ? row.yesBg : row.noBg
                          }`}
                        >
                          <ThemedText
                            className={`font-semibold text-sm ${
                              row.value ? row.yesCls : row.noCls
                            }`}
                          >
                            {row.value ? row.yesLabel : row.noLabel}
                          </ThemedText>
                        </View>
                      </View>
                    ))}

                    {selectedUser.teacher?.is_disabled && (
                      <View className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl mt-1">
                        <View className="flex-row items-center gap-2 mb-1">
                          <Ionicons name="ban" size={14} color="#ef4444" />
                          <ThemedText className="text-xs text-red-400 font-semibold uppercase tracking-wider">
                            Disabled Reason
                          </ThemedText>
                        </View>
                        <ThemedText className="text-sm text-red-400 font-medium">
                          {selectedUser.teacher.disabled_reason}
                        </ThemedText>
                        {selectedUser.teacher.disabled_at && (
                          <ThemedText
                            className={`text-xs ${textMuted} mt-1`}
                          >
                            {new Date(
                              selectedUser.teacher.disabled_at
                            ).toLocaleString()}
                          </ThemedText>
                        )}
                      </View>
                    )}
                  </View>
                </View>

                {/* Activity */}
                <View
                  className={`p-4 rounded-xl ${bgCard} border ${border} mb-4`}
                >
                  <ThemedText
                    className={`text-xs font-semibold ${textMuted} mb-3 uppercase tracking-wider`}
                  >
                    Activity
                  </ThemedText>
                  <View className="flex-row justify-around">
                    <View className="items-center">
                      <ThemedText
                        className={`text-2xl font-bold ${textPrimary}`}
                      >
                        {selectedUser.teacher?.followers_count || 0}
                      </ThemedText>
                      <ThemedText className={`text-xs ${textMuted}`}>
                        Followers
                      </ThemedText>
                    </View>
                    <View className="items-center">
                      <ThemedText
                        className={`text-base font-bold ${textPrimary}`}
                      >
                        {new Date(
                          selectedUser.created_at
                        ).toLocaleDateString()}
                      </ThemedText>
                      <ThemedText className={`text-xs ${textMuted}`}>
                        Joined
                      </ThemedText>
                    </View>
                  </View>
                </View>

                {/* ── Actions ─────────────────────────────────────── */}
                <View className="gap-3 mb-8">
                  {/* Reset Password */}
                  <TouchableOpacity
                    className={`flex-row items-center justify-center gap-2 bg-blue-600 px-4 py-3.5 rounded-xl ${
                      updating ? "opacity-50" : ""
                    }`}
                    onPress={() =>
                      setConfirmAction({
                        type: "reset-password",
                        userId: selectedUser.id,
                        email: selectedUser.email,
                      })
                    }
                    disabled={updating}
                  >
                    <Ionicons name="key-outline" size={18} color="#fff" />
                    <ThemedText className="text-white font-bold text-base">
                      Reset Password
                    </ThemedText>
                  </TouchableOpacity>

                  {/* Enable / Disable */}
                  {selectedUser.teacher?.is_disabled ? (
                    <TouchableOpacity
                      className={`flex-row items-center justify-center gap-2 bg-green-600 px-4 py-3.5 rounded-xl ${
                        updating ? "opacity-50" : ""
                      }`}
                      onPress={() => {
                        const action = {
                          type: "enable-account",
                          userId: selectedUser.id,
                          userName: `${selectedUser.first_name} ${selectedUser.last_name}`,
                        };
                        setConfirmAction(action);
                      }}
                      disabled={updating}
                    >
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={18}
                        color="#fff"
                      />
                      <ThemedText className="text-white font-bold text-base">
                        Enable Account
                      </ThemedText>
                    </TouchableOpacity>
                  ) : (
                    <View>
                      <TouchableOpacity
                        className={`flex-row items-center gap-2 bg-red-600 px-4 py-3.5 rounded-xl ${
                          updating ? "opacity-50" : ""
                        }`}
                        onPress={() =>
                          setShowReasonDropdown((v) => !v)
                        }
                        disabled={updating}
                      >
                        <Ionicons
                          name="ban-outline"
                          size={18}
                          color="#fff"
                        />
                        <ThemedText className="text-white font-bold text-base flex-1">
                          Disable Account
                        </ThemedText>
                        <Ionicons
                          name={
                            showReasonDropdown
                              ? "chevron-up"
                              : "chevron-down"
                          }
                          size={18}
                          color="#fff"
                        />
                      </TouchableOpacity>

                      {showReasonDropdown && (
                        <View
                          className={`mt-2 rounded-xl border ${border} overflow-hidden`}
                        >
                          <ThemedText
                            className={`text-xs ${textMuted} px-4 pt-3 pb-2 uppercase tracking-wider font-semibold`}
                          >
                            Select a reason
                          </ThemedText>

                          {DISABLE_REASONS.map((reason, index) => {
                            const isSelected =
                              selectedReason === reason.label;
                            const isLast =
                              index === DISABLE_REASONS.length - 1;
                            return (
                              <View key={reason.label}>
                                <TouchableOpacity
                                  className={`flex-row items-center gap-3 px-4 py-3 ${
                                    isSelected ? "bg-red-600" : bgCard
                                  }`}
                                  onPress={() => {
                                    setSelectedReason(reason.label);
                                    if (reason.label !== "Other") {
                                      setCustomReason("");
                                    }
                                  }}
                                >
                                  <View
                                    className={`w-7 h-7 rounded-full items-center justify-center ${
                                      isSelected
                                        ? "bg-white/20"
                                        : "bg-red-500/15"
                                    }`}
                                  >
                                    <Ionicons
                                      name={reason.icon}
                                      size={14}
                                      color={
                                        isSelected ? "#fff" : "#ef4444"
                                      }
                                    />
                                  </View>
                                  <ThemedText
                                    className={`flex-1 text-sm ${
                                      isSelected
                                        ? "text-white font-semibold"
                                        : textPrimary
                                    }`}
                                  >
                                    {reason.label}
                                  </ThemedText>
                                  {isSelected && (
                                    <Ionicons
                                      name="checkmark-circle"
                                      size={16}
                                      color="#fff"
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

                          {selectedReason === "Other" && (
                            <View
                              className={`px-4 py-3 border-t ${border} ${bgInput}`}
                            >
                              <ThemedText
                                className={`text-xs ${textMuted} mb-2`}
                              >
                                Describe the reason
                              </ThemedText>
                              <TextInput
                                placeholder="Enter custom reason..."
                                placeholderTextColor="#9ca3af"
                                value={customReason}
                                onChangeText={setCustomReason}
                                multiline
                                numberOfLines={2}
                                style={{
                                  color: isDark ? "#e2e8f0" : "#0f172a",
                                  fontSize: 14,
                                  textAlignVertical: "top",
                                }}
                              />
                            </View>
                          )}

                          {selectedReason !== "" && (
                            <TouchableOpacity
                              className={`flex-row items-center justify-center gap-2 py-3.5 ${
                                updating
                                  ? "bg-red-600/50"
                                  : "bg-red-600"
                              }`}
                              onPress={() => {
                                const finalReason =
                                  selectedReason === "Other"
                                    ? customReason.trim()
                                    : selectedReason;
                                if (!finalReason) {
                                  Toast.show({
                                    type: "error",
                                    text1: "Reason required",
                                    text2: "Please enter a custom reason",
                                  });
                                  return;
                                }
                                handleDisableAccount(
                                  selectedUser.id,
                                  finalReason
                                );
                              }}
                              disabled={updating}
                            >
                              {updating ? (
                                <ActivityIndicator
                                  size="small"
                                  color="#fff"
                                />
                              ) : (
                                <>
                                  <Ionicons
                                    name="ban"
                                    size={16}
                                    color="#fff"
                                  />
                                  <ThemedText className="text-white font-bold">
                                    Confirm Disable
                                  </ThemedText>
                                </>
                              )}
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </ScrollView>
            )}

            {/* ── Confirmation Overlay (inside Detail Modal) ──────── */}
            {confirmAction && (
              <View
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: "rgba(0,0,0,0.5)",
                  justifyContent: "center",
                  alignItems: "center",
                  zIndex: 9999,
                }}
                pointerEvents="box-none"
              >
                <View
                  pointerEvents="box-only"
                  className={`${bgCard} rounded-2xl p-6 w-11/12 border ${border}`}
                  style={{ maxWidth: 400 }}
                >
                  <ThemedText className={`${textPrimary} text-xl font-bold mb-2`}>
                    {confirmAction?.type === "reset-password"
                      ? "Reset Password?"
                      : "Enable Account?"}
                  </ThemedText>
                  <ThemedText className={`${textSecondary} mb-6`}>
                    {confirmAction?.type === "reset-password"
                      ? `Send a password reset email to ${confirmAction?.email}?`
                      : `${confirmAction?.userName ?? "This user"} will be able to log in again.`}
                  </ThemedText>
                  <View className="flex-row gap-3">
                    <TouchableOpacity
                      className={`flex-1 ${bgInput} py-3 rounded-xl ${
                        updating ? "opacity-50" : ""
                      }`}
                      onPress={() => {
                        setConfirmAction(null);
                      }}
                      disabled={updating}
                    >
                      <ThemedText className={`${textPrimary} text-center font-bold`}>
                        Cancel
                      </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className={`flex-1 ${
                        confirmAction?.type === "reset-password"
                          ? "bg-blue-600"
                          : "bg-green-600"
                      } py-3 rounded-xl ${updating ? "opacity-50" : ""}`}
                      onPress={() => {
                        const action = confirmAction;
                        if (!action) {
                          return;
                        }
                        if (action.type === "reset-password") {
                          handleResetPassword(action.userId, action.email);
                        } else if (action.type === "enable-account") {
                          handleEnableAccount(action.userId);
                        }
                      }}
                      disabled={updating}
                    >
                      {updating ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <ThemedText className="text-white text-center font-bold">
                          {confirmAction?.type === "reset-password"
                            ? "Send Email"
                            : "Enable"}
                        </ThemedText>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* ConfirmModal placeholder - rendered as overlay */}
          </View>
        </ScreenWrapper>
      </Modal>

      <Toast />
    </ScreenWrapper>
  );
}