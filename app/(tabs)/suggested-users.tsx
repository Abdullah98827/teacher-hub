import LogoHeader from "@/components/logoHeader";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native"; // Added for auto-refresh on focus
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import ProfilePicture from "../../components/ProfilePicture";
import ScreenWrapper from "../../components/ScreenWrapper";
import UserProfileModal from "../../components/UserProfileModal";
import { useFollow } from "../../hooks/useFollow";
import { supabase } from "../../supabase";

interface SuggestedUser {
  id: string;
  first_name: string;
  last_name: string;
  profile_picture_url: string | null;
  bio: string | null;
  school_name: string | null;
  followers_count: any; // can be number or { count: number }
}

function SuggestedUserCard({
  user,
  onPress,
}: {
  user: SuggestedUser;
  onPress: () => void;
}) {
  const {
    isFollowing,
    toggleFollow,
    loading: followLoading,
  } = useFollow(user.id);

  return (
    <View className="bg-neutral-900 p-4 rounded-xl border border-neutral-800 mb-3">
      <TouchableOpacity onPress={onPress}>
        <View className="flex-row items-center">
          <ProfilePicture
            imageUrl={user.profile_picture_url}
            firstName={user.first_name}
            lastName={user.last_name}
            size="md"
          />
          <View className="flex-1 ml-3">
            <Text className="text-white font-semibold text-base">
              {user.first_name} {user.last_name}
            </Text>
            {user.bio && (
              <Text className="text-gray-400 text-sm mt-1" numberOfLines={2}>
                {user.bio}
              </Text>
            )}
            {user.school_name && (
              <View className="flex-row items-center mt-1">
                <Ionicons name="school-outline" size={12} color="#9CA3AF" />
                <Text className="text-gray-500 text-xs ml-1">
                  {user.school_name}
                </Text>
              </View>
            )}
            <View className="flex-row items-center mt-1">
              <Ionicons name="people-outline" size={12} color="#9CA3AF" />
              <Text className="text-gray-500 text-xs ml-1">
                {user.followers_count ?? 0}{" "}
                {(user.followers_count ?? 0) === 1 ? "follower" : "followers"}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        className={`mt-3 py-2.5 rounded-lg flex-row items-center justify-center ${
          isFollowing ? "bg-neutral-800 border border-cyan-600" : "bg-cyan-600"
        }`}
        onPress={toggleFollow}
        disabled={followLoading}
      >
        {followLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons
              name={isFollowing ? "checkmark-circle" : "person-add"}
              size={18}
              color="#fff"
            />
            <Text className="text-white font-semibold ml-2">
              {isFollowing ? "Following" : "Follow"}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function SuggestedUsersScreen() {
  const router = useRouter();
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    loadSuggestedUsers();
  }, []);

  // Auto-refresh when screen is focused (fixes count not updating after follow)
  useFocusEffect(
    useCallback(() => {
      loadSuggestedUsers();
    }, [])
  );

  const loadSuggestedUsers = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Check if current user is admin
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("id", user.id)
        .single();

      const isAdmin =
        roleData?.role === "admin" || roleData?.role === "super_admin";

      let data;
      let error;

      if (isAdmin) {
        // Admins see ALL VERIFIED teachers (limited to 50 for performance)
        const result = await supabase
          .from("teachers")
          .select(
            `
          id,
          first_name,
          last_name,
          profile_picture_url,
          bio,
          school_name,
          followers:follows!following_id(count)
        `
          )
          .eq("verified", true) // ONLY VERIFIED
          .order("first_name", { ascending: true })
          .limit(50);

        data = result.data;
        error = result.error;
      } else {
        // Normal users get subject-based suggestions via RPC (assuming RPC already filters verified)
        const result = await supabase.rpc("get_suggested_users", {
          user_uuid: user.id,
          limit_count: 20,
        });

        data = result.data;
        error = result.error;
      }

      if (error) throw error;

      // Normalise followers_count
      const formatted = (data || []).map((u: any) => ({
        ...u,
        followers_count: u.followers?.count ?? 0,
      }));

      setSuggestedUsers(formatted);
    } catch (error: any) {
      console.error("Error loading suggested users:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to load suggested users",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadSuggestedUsers();
  }, []);

  const handleUserPress = (userId: string) => {
    setSelectedUserId(userId);
    setShowProfileModal(true);
  };

  const renderUser = ({ item }: { item: SuggestedUser }) => (
    <SuggestedUserCard user={item} onPress={() => handleUserPress(item.id)} />
  );

  return (
    <ScreenWrapper>
      <LogoHeader position="left" />
      {/* Header */}
      <View className="bg-neutral-1000 p-4 pt-6 border-b border-neutral-800">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="#22d3ee" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-white text-xl font-bold">
              Suggested Teachers
            </Text>
            <Text className="text-gray-400 text-sm">
              Based on your subjects
            </Text>
          </View>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#22d3ee" />
        </View>
      ) : suggestedUsers.length === 0 ? (
        <View className="flex-1 items-center justify-center p-6">
          <View className="bg-cyan-500/20 w-20 h-20 rounded-full items-center justify-center mb-4">
            <Ionicons name="search-outline" size={40} color="#22d3ee" />
          </View>
          <Text className="text-white text-xl font-bold mb-2">
            No Suggestions
          </Text>
          <Text className="text-gray-400 text-center">
            We couldn`t find any teachers to suggest at this time. Check back
            later!
          </Text>
        </View>
      ) : (
        <FlatList
          data={suggestedUsers}
          renderItem={renderUser}
          keyExtractor={(item) => item.id}
          contentContainerClassName="p-4"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#22d3ee"
            />
          }
        />
      )}

      {/* Profile Modal */}
      <UserProfileModal
        visible={showProfileModal}
        userId={selectedUserId}
        onClose={() => {
          setShowProfileModal(false);
          setSelectedUserId(null);
          // Refresh list after closing modal
          loadSuggestedUsers();
        }}
      />
      <Toast />
    </ScreenWrapper>
  );
}
