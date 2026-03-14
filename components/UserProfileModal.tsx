import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { useAppTheme } from "../hooks/useAppTheme";
import { useFollow } from "../hooks/useFollow";
import { supabase } from "../supabase";
import ProfilePicture from "./ProfilePicture";

interface UserProfileModalProps {
  visible: boolean;
  userId: string | null;
  onClose: () => void;
  // Instead of navigating internally, we tell the parent where to go
  onNavigateToPath?: (path: string) => void;
}

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  profile_picture_url: string | null;
  bio: string | null;
  school_name: string | null;
  years_experience: number | null;
  allow_dms: string;
  resource_count: number;
  comment_count: number;
  membership_tier: string | null;
  membership_subjects: { id: string; name: string }[];
}

export default function UserProfileModal({
  visible,
  userId,
  onClose,
  onNavigateToPath,
}: UserProfileModalProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const {
    isFollowing,
    followersCount,
    followingCount,
    toggleFollow,
    loading: followLoading,
    refresh: refreshFollowData,
  } = useFollow(userId);

  const {
    bg,
    bgCard,
    bgCardAlt,
    border,
    textPrimary,
    textSecondary,
    textMuted,
  } = useAppTheme();

  useEffect(() => {
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (visible && userId) loadProfile();
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

      let membershipSubjects: { id: string; name: string }[] = [];
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
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to load profile",
      });
    } finally {
      setLoading(false);
    }
  };

  // Close modal and tell parent to navigate
  const handleNavigate = (path: string) => {
    onClose();
    if (onNavigateToPath) {
      onNavigateToPath(path);
    }
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
    handleNavigate(`/dm/${userId}`);
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
        <View className={`${bgCard} p-4 pt-12 border-b ${border}`}>
          <View className="flex-row items-center justify-between">
            <Text className="text-2xl font-bold text-cyan-400">
              Teacher Profile
            </Text>
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
              <Text className={`${textPrimary} text-2xl font-bold mt-4`}>
                {profile.first_name} {profile.last_name}
              </Text>
              {profile.bio && (
                <Text className={`${textSecondary} text-center mt-2 px-4`}>
                  {profile.bio}
                </Text>
              )}
              {profile.school_name && (
                <View className="flex-row items-center mt-2">
                  <Ionicons name="school-outline" size={16} color="#9CA3AF" />
                  <Text className={`${textSecondary} ml-1`}>
                    {profile.school_name}
                  </Text>
                </View>
              )}
              {profile.years_experience !== null && (
                <View className="flex-row items-center mt-1">
                  <Ionicons name="time-outline" size={16} color="#9CA3AF" />
                  <Text className={`${textSecondary} ml-1`}>
                    {profile.years_experience}{" "}
                    {profile.years_experience === 1 ? "year" : "years"}{" "}
                    experience
                  </Text>
                </View>
              )}
              {currentUserId !== userId && (
                <View className="flex-row gap-3 mt-6 w-full px-4">
                  <TouchableOpacity
                    className="flex-1 bg-cyan-600 py-3 rounded-xl flex-row items-center justify-center"
                    onPress={handleMessage}
                  >
                    <Ionicons name="mail" size={20} color="#fff" />
                    <Text className="text-white font-bold ml-2">Message</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className={`flex-1 py-3 rounded-xl flex-row items-center justify-center ${
                      isFollowing
                        ? `${bgCardAlt} border border-cyan-600`
                        : "bg-cyan-600"
                    }`}
                    onPress={toggleFollow}
                    disabled={followLoading}
                  >
                    {followLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons
                          name={isFollowing ? "person-remove" : "person-add"}
                          size={20}
                          color="#fff"
                        />
                        <Text className="text-white font-bold ml-2">
                          {isFollowing ? "Unfollow" : "Follow"}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View
              className={`flex-row ${bgCard} border-t border-b ${border} mt-4`}
            >
              <TouchableOpacity
                className={`flex-1 items-center py-4 border-r ${border}`}
                onPress={() => handleNavigate(`/followers/${userId}`)}
              >
                <Text className={`${textPrimary} text-2xl font-bold`}>
                  {followersCount}
                </Text>
                <Text className={`${textSecondary} text-sm`}>
                  {followersCount === 1 ? "Follower" : "Followers"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 items-center py-4"
                onPress={() => handleNavigate(`/following/${userId}`)}
              >
                <Text className={`${textPrimary} text-2xl font-bold`}>
                  {followingCount}
                </Text>
                <Text className={`${textSecondary} text-sm`}>Following</Text>
              </TouchableOpacity>
            </View>

            <View className={`${bgCard} p-6 mt-4`}>
              <Text className="text-lg font-bold text-cyan-400 mb-4">
                Activity
              </Text>
              <View className="flex-row justify-around">
                <View className="items-center">
                  <Text className={`${textPrimary} text-2xl font-bold`}>
                    {profile.resource_count}
                  </Text>
                  <Text className={`${textSecondary} text-sm`}>
                    {profile.resource_count === 1 ? "Resource" : "Resources"}
                  </Text>
                </View>
                <View className="items-center">
                  <Text className={`${textPrimary} text-2xl font-bold`}>
                    {profile.comment_count}
                  </Text>
                  <Text className={`${textSecondary} text-sm`}>
                    {profile.comment_count === 1 ? "Comment" : "Comments"}
                  </Text>
                </View>
              </View>
            </View>

            {(profile.membership_tier ||
              profile.membership_subjects.length > 0) && (
              <View className={`${bgCard} p-6 mt-4`}>
                <Text className="text-lg font-bold text-cyan-400 mb-4">
                  Professional Info
                </Text>
                {profile.membership_tier && (
                  <View className="mb-4">
                    <Text className={`${textMuted} text-xs mb-2`}>
                      Membership Tier
                    </Text>
                    <View className={`${bgCardAlt} px-4 py-2 rounded-lg`}>
                      <Text className={`${textPrimary} font-semibold`}>
                        {profile.membership_tier === "single"
                          ? "Single Subject"
                          : "Multi Subject"}
                      </Text>
                    </View>
                  </View>
                )}
                {profile.membership_subjects.length > 0 && (
                  <View>
                    <Text className={`${textMuted} text-xs mb-2`}>
                      Subjects
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                      {profile.membership_subjects.map((subject) => (
                        <View
                          key={subject.id}
                          className="bg-cyan-600 px-3 py-1 rounded-full"
                        >
                          <Text className="text-white text-xs">
                            {subject.name}
                          </Text>
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
            <Text className={`${textPrimary} text-xl font-bold mt-4`}>
              Profile Not Found
            </Text>
            <Text className={`${textSecondary} text-center mt-2`}>
              This profile could not be loaded
            </Text>
          </View>
        )}
      </View>
      <Toast />
    </Modal>
  );
}
