import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import ConfirmModal from "../../components/ConfirmModal";
import LogoHeader from "../../components/logoHeader";
import ProfilePicture from "../../components/ProfilePicture";
import { ThemePreference, useTheme } from "../../contexts/ThemeContext";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useUserRole } from "../../hooks/useUserRole";
import { supabase } from "../../supabase";
import { deleteProfilePicture } from "../../utils/profilePictureHelpers";

export default function SettingsScreen() {
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    trn: "",
    profilePictureUrl: null as string | null,
    membershipTier: "" as string,
    subjectNames: [] as string[],
  });

  // NEW: Follow stats
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deletingPicture, setDeletingPicture] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeletePictureModal, setShowDeletePictureModal] = useState(false);
  const [showPictureModal, setShowPictureModal] = useState(false);

  const { role, loading: roleLoading } = useUserRole();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Theme
  const { themePreference, setThemePreference } = useTheme();
  const {
    isDark,
    bg,
    bgCard,
    bgCardAlt,
    border,
    textPrimary,
    textSecondary,
    textLabel,
    loadingBg,
  } = useAppTheme();

  const THEME_OPTIONS: {
    label: string;
    value: ThemePreference;
    icon: string;
  }[] = [
    { label: "Light", value: "light", icon: "sunny" },
    { label: "Dark", value: "dark", icon: "moon" },
    { label: "System", value: "system", icon: "phone-portrait" },
  ];

  useEffect(() => {
    loadProfile();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  const loadProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setUserId(user.id);

    const { data: teacherData } = await supabase
      .from("teachers")
      .select(
        "first_name, last_name, email, trn, profile_picture_url, followers_count, following_count"
      )
      .eq("id", user.id)
      .single();

    const { data: membershipData } = await supabase
      .from("memberships")
      .select("tier, subject_ids")
      .eq("id", user.id)
      .single();

    if (teacherData) {
      let subjectNames: string[] = [];

      if (
        membershipData &&
        membershipData.subject_ids &&
        membershipData.subject_ids.length > 0
      ) {
        const { data: subjects } = await supabase
          .from("subjects")
          .select("name")
          .in("id", membershipData.subject_ids);

        if (subjects) {
          subjectNames = subjects.map((s) => s.name);
        }
      }

      setProfile({
        firstName: teacherData.first_name,
        lastName: teacherData.last_name,
        email: teacherData.email,
        trn: teacherData.trn,
        profilePictureUrl: teacherData.profile_picture_url,
        membershipTier: membershipData?.tier || "none",
        subjectNames: subjectNames,
      });

      // Set follow counts
      setFollowersCount(teacherData.followers_count || 0);
      setFollowingCount(teacherData.following_count || 0);
    }

    setLoading(false);
  };

  const handlePictureClick = () => {
    if (profile.profilePictureUrl) {
      setShowPictureModal(true);
    } else {
      router.push("/edit-profile");
    }
  };

  const handleDeletePicture = async () => {
    setShowPictureModal(false);
    setShowDeletePictureModal(true);
  };

  const confirmDeletePicture = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setDeletingPicture(true);
    const success = await deleteProfilePicture(
      user.id,
      profile.profilePictureUrl
    );
    setDeletingPicture(false);
    setShowDeletePictureModal(false);

    if (success) {
      setProfile((prev) => ({ ...prev, profilePictureUrl: null }));
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const executeLogout = async () => {
    setLoggingOut(true);
    const { error } = await supabase.auth.signOut();

    if (error) {
      Toast.show({
        type: "error",
        text1: "Logout Failed",
        text2: "Something went wrong. Please try again.",
      });
      setLoggingOut(false);
    } else {
      router.replace("/login");
    }
  };

  if (loading || roleLoading) {
    return (
      <View
        className={`flex-1 ${loadingBg} justify-center items-center`}
        style={{ paddingTop: insets.top }}
      >
        <ActivityIndicator size="large" color="#22d3ee" />
      </View>
    );
  }

  return (
    <View className={`flex-1 ${bg}`} style={{ paddingTop: insets.top }}>
      <LogoHeader position="left" />

      <ScrollView className="flex-1 px-5">
        <View className="py-6">
          <Text className="text-3xl font-bold text-cyan-400 mb-2">
            Settings
          </Text>
          <Text className={textSecondary}>
            Manage your account and preferences
          </Text>
        </View>

        {/* Profile Picture Section */}
        <View className={`${bgCard} rounded-xl p-4 mb-3 border ${border}`}>
          <Text className="text-xl font-bold text-cyan-400 mb-4">
            Profile Picture
          </Text>

          <View className="items-center">
            <TouchableOpacity
              onPress={handlePictureClick}
              activeOpacity={0.7}
              disabled={deletingPicture}
            >
              {deletingPicture ? (
                <View
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: 48,
                    backgroundColor: "#0891b2",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ActivityIndicator size="large" color="#fff" />
                </View>
              ) : (
                <>
                  <ProfilePicture
                    key={profile.profilePictureUrl || "no-picture"}
                    imageUrl={profile.profilePictureUrl}
                    firstName={profile.firstName}
                    lastName={profile.lastName}
                    size="xl"
                  />

                  <View
                    className={`absolute bottom-0 right-0 bg-cyan-600 rounded-full p-2 border-2 ${isDark ? "border-neutral-900" : "border-gray-50"}`}
                  >
                    <Ionicons name="camera" size={16} color="#fff" />
                  </View>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handlePictureClick}
              className="mt-3"
              disabled={deletingPicture}
            >
              <Text className="text-cyan-400 text-sm text-center font-semibold">
                {profile.profilePictureUrl
                  ? "Change Picture"
                  : "Upload Picture"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* NEW: Followers/Following Section */}
        {userId && (
          <View
            className={`${bgCard} rounded-xl mb-4 border ${border} overflow-hidden`}
          >
            <View className={`p-3 border-b ${border}`}>
              <Text className="text-xl font-bold text-cyan-400">
                Your Network
              </Text>
            </View>

            <View className="flex-row">
              <TouchableOpacity
                className={`flex-1 items-center py-3 border-r ${border}`}
                onPress={() => router.push(`/followers/${userId}`)}
                activeOpacity={0.7}
              >
                <View className="bg-cyan-500/20 w-12 h-12 rounded-full items-center justify-center mb-2">
                  <Ionicons name="people" size={24} color="#22d3ee" />
                </View>
                <Text className={`${textPrimary} text-xl font-bold`}>
                  {followersCount}
                </Text>
                <Text className={`${textSecondary} text-sm`}>
                  {followersCount === 1 ? "Follower" : "Followers"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1 items-center py-3"
                onPress={() => router.push(`/following/${userId}`)}
                activeOpacity={0.7}
              >
                <View className="bg-purple-500/20 w-12 h-12 rounded-full items-center justify-center mb-2">
                  <Ionicons name="person-add" size={24} color="#a855f7" />
                </View>
                <Text className={`${textPrimary} text-xl font-bold`}>
                  {followingCount}
                </Text>
                <Text className={`${textSecondary} text-sm`}>Following</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Profile Information */}
        <View className={`${bgCard} rounded-xl p-4 mb-3 border ${border}`}>
          <Text className="text-xl font-bold text-cyan-400 mb-4">
            Profile Information
          </Text>

          <View className="mb-3">
            <Text className={`${textLabel} text-xs mb-1`}>Full Name</Text>
            <Text className={`${textPrimary} text-base`}>
              {profile.firstName} {profile.lastName}
            </Text>
          </View>

          <View className="mb-3">
            <Text className={`${textLabel} text-xs mb-1`}>Email Address</Text>
            <Text className={`${textPrimary} text-base`}>{profile.email}</Text>
          </View>

          <View className="mb-3">
            <Text className={`${textLabel} text-xs mb-1`}>
              Teacher Reference Number (TRN)
            </Text>
            <Text className={`${textPrimary} text-base`}>{profile.trn}</Text>
          </View>

          <View className="mb-3">
            <Text className={`${textLabel} text-xs mb-1`}>Account Role</Text>
            <View className="flex-row items-center">
              <Ionicons
                name={role === "admin" ? "shield-checkmark" : "school"}
                size={16}
                color={role === "admin" ? "#ef4444" : "#22d3ee"}
              />
              <Text
                className={`text-base font-semibold ml-2 ${role === "admin" ? "text-red-400" : "text-cyan-400"}`}
              >
                {role === "admin" ? "Admin" : "Teacher"}
              </Text>
            </View>
          </View>

          {role === "teacher" && (
            <View>
              <Text className={`${textLabel} text-xs mb-1`}>
                Membership Type (Cannot be changed)
              </Text>
              <View
                className={`${bgCardAlt} border ${border} p-4 rounded-lg flex-row items-center`}
              >
                <Ionicons name="lock-closed" size={16} color="#6B7280" />
                <Text className={`${textSecondary} ml-2 flex-1 capitalize`}>
                  {profile.membershipTier === "single"
                    ? "Single Subject"
                    : profile.membershipTier === "multi"
                      ? "Multi Subject"
                      : "No Active Membership"}
                </Text>
              </View>

              {profile.subjectNames.length > 0 && (
                <View className="mt-2">
                  <Text className={`${textLabel} text-xs mb-2`}>
                    Your Subjects:
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {profile.subjectNames.map((name, index) => (
                      <View
                        key={index}
                        className="bg-cyan-600 px-3 py-1 rounded-full"
                      >
                        <Text className="text-white text-xs">{name}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ── Appearance ── */}
        <View className={`${bgCard} rounded-xl p-4 mb-3 border ${border}`}>
          <Text className="text-xl font-bold text-cyan-400 mb-4">
            Appearance
          </Text>
          <Text className={`${textSecondary} text-sm mb-4`}>
            Choose how Teacher Hub looks to you
          </Text>
          <View className="flex-row gap-3">
            {THEME_OPTIONS.map((option) => {
              const isSelected = themePreference === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => setThemePreference(option.value)}
                  activeOpacity={0.7}
                  className={`flex-1 items-center py-4 px-2 rounded-xl border-2 ${
                    isSelected
                      ? "border-cyan-400 bg-cyan-500/10"
                      : `${isDark ? "border-neutral-700 bg-neutral-800" : "border-gray-200 bg-gray-100"}`
                  }`}
                >
                  <Ionicons
                    name={option.icon as any}
                    size={24}
                    color={
                      isSelected ? "#22d3ee" : isDark ? "#9ca3af" : "#6b7280"
                    }
                  />
                  <Text
                    className={`text-xs font-semibold mt-2 ${
                      isSelected ? "text-cyan-400" : textSecondary
                    }`}
                  >
                    {option.label}
                  </Text>
                  {isSelected && (
                    <View className="mt-1.5 w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {role === "admin" && (
          <View className="rounded-xl p-5 mb-4 border-2 border-red-500 bg-red-950">
            <View className="flex-row items-center mb-3">
              <View className="bg-red-600 w-14 h-14 rounded-full items-center justify-center mr-4">
                <Ionicons name="shield-checkmark" size={28} color="#fff" />
              </View>
              <View className="flex-1">
                <Text className="text-xl font-bold text-white">
                  Admin Access
                </Text>
                <Text className="text-red-200 text-sm">
                  Manage platform operations
                </Text>
              </View>
            </View>

            <TouchableOpacity
              className="bg-red-600 p-4 rounded-lg active:scale-95"
              onPress={() => router.push("/admin")}
            >
              <Text className="text-white text-center font-bold">
                Open Admin Hub
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Account Actions */}
        <View className={`${bgCard} rounded-xl p-4 mb-3 border ${border}`}>
          <Text className="text-xl font-bold text-cyan-400 mb-4">
            Account Actions
          </Text>

          <TouchableOpacity
            className={`${bgCardAlt} p-4 rounded-lg mb-3 active:scale-95 border ${border}`}
            onPress={() => router.push("/edit-profile")}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Ionicons name="pencil" size={20} color="#22d3ee" />
                <Text className={`${textPrimary} font-semibold ml-3`}>
                  Edit Profile
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6B7280" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            className={`${bgCardAlt} p-4 rounded-lg mb-3 active:scale-95 border ${border}`}
            onPress={() => router.push("/change-password")}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Ionicons name="key" size={20} color="#22d3ee" />
                <Text className={`${textPrimary} font-semibold ml-3`}>
                  Change Password
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6B7280" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            className={`${bgCardAlt} p-4 rounded-lg mb-3 active:scale-95 border ${border}`}
            onPress={() => router.push("/suggested-users")}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <Ionicons name="people" size={22} color="#22d3ee" />
                <Text className={`${textPrimary} ml-3 text-base`}>
                  Discover Teachers
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6B7280" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-red-600 p-4 rounded-lg active:scale-95"
            onPress={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <View className="flex-row items-center justify-center">
                <Ionicons name="log-out" size={20} color="#fff" />
                <Text className="text-white font-bold ml-2">Logout</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {role === "teacher" && (
          <View className={`${bgCard} rounded-xl p-5 mb-6 border ${border}`}>
            <Text className="text-xl font-bold text-cyan-400 mb-4">
              Support
            </Text>
            <Text className={`${textSecondary} mb-3`}>
              Need help or want to reach out to the admin team?
            </Text>

            <TouchableOpacity
              className="bg-cyan-600 p-4 rounded-lg active:scale-95 flex-row items-center justify-center"
              onPress={() => router.push("/contact")}
            >
              <Ionicons name="mail" size={20} color="#fff" />
              <Text className="text-white font-bold ml-2">Contact Admin</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Picture Options Modal */}
      <Modal
        visible={showPictureModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPictureModal(false)}
      >
        <View className="flex-1 bg-black/70 justify-center items-center">
          <View
            className={`${bgCard} rounded-xl p-6 mx-5 w-80 border ${border}`}
          >
            <Text
              className={`text-xl font-bold ${textPrimary} mb-4 text-center`}
            >
              Profile Picture
            </Text>

            <TouchableOpacity
              className="bg-cyan-600 p-4 rounded-lg mb-3 flex-row items-center justify-center"
              onPress={() => {
                setShowPictureModal(false);
                router.push("/edit-profile");
              }}
            >
              <Ionicons name="camera" size={20} color="#fff" />
              <Text className="text-white font-bold ml-2">Change Picture</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-red-600 p-4 rounded-lg mb-3 flex-row items-center justify-center"
              onPress={handleDeletePicture}
            >
              <Ionicons name="trash" size={20} color="#fff" />
              <Text className="text-white font-bold ml-2">Delete Picture</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`${bgCardAlt} p-4 rounded-lg border ${border}`}
              onPress={() => setShowPictureModal(false)}
            >
              <Text className={`${textPrimary} text-center font-semibold`}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {showLogoutModal && (
        <ConfirmModal
          visible={showLogoutModal}
          title="Logout"
          message="Are you sure you want to logout?"
          confirmText="Logout"
          confirmColor="bg-red-600"
          isProcessing={loggingOut}
          onConfirm={executeLogout}
          onCancel={() => setShowLogoutModal(false)}
        />
      )}

      <ConfirmModal
        visible={showDeletePictureModal}
        title="Delete Profile Picture"
        message="Are you sure you want to delete your profile picture?"
        confirmText="Delete"
        confirmColor="bg-red-600"
        isProcessing={deletingPicture}
        onConfirm={confirmDeletePicture}
        onCancel={() => setShowDeletePictureModal(false)}
      />
    </View>
  );
}
