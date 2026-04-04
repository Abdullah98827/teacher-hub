import LogoHeader from "@/components/logoHeader";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import ProfilePicture from "../../components/ProfilePicture";
import ScreenWrapper from "../../components/ScreenWrapper";
import { ThemedText } from '../../components/themed-text';
import UserProfileModal from "../../components/UserProfileModal";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useFollow } from "../../hooks/useFollow";
import { supabase } from "../../supabase";

function SuggestedUserCard({ user, onPress }) {
  const { isFollowing, toggleFollow, loading: followLoading } = useFollow(user.id);
  const { bgCard, border, textPrimary, textSecondary } = useAppTheme();

  return (
    <View className={`${bgCard} p-4 rounded-xl border ${border} mb-3`}>
      <TouchableOpacity onPress={onPress}>
        <View className="flex-row items-center">
          <ProfilePicture
            imageUrl={user.profile_picture_url}
            firstName={user.first_name}
            lastName={user.last_name}
            size="md"
          />
          <View className="flex-1 ml-3">
            <ThemedText className={`${textPrimary} font-semibold text-base`}>
              {user.first_name} {user.last_name}
            </ThemedText>
            {user.bio && (
              <ThemedText className={`${textSecondary} text-sm mt-1`} numberOfLines={2}>
                {user.bio}
              </ThemedText>
            )}
            {user.school_name && (
              <View className="flex-row items-center mt-1">
                <Ionicons name="school-outline" size={12} color="#9CA3AF" />
                <ThemedText className={`${textSecondary} text-xs ml-1`}>
                  {user.school_name}
                </ThemedText>
              </View>
            )}
            <View className="flex-row items-center mt-1">
              <Ionicons name="people-outline" size={12} color="#9CA3AF" />
              <ThemedText className={`${textSecondary} text-xs ml-1`}>
                {user.followers_count ?? 0}{" "}
                {(user.followers_count ?? 0) === 1 ? "follower" : "followers"}
              </ThemedText>
            </View>
          </View>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        className={`mt-3 py-2.5 rounded-lg flex-row items-center justify-center ${
          isFollowing ? "bg-cyan-100 border border-cyan-600" : "bg-cyan-600"
        }`}
        onPress={toggleFollow}
        disabled={followLoading}
      >
        {followLoading ? (
          <ActivityIndicator size="small" color={isFollowing ? "#0891b2" : "#fff"} />
        ) : (
          <>
            <Ionicons
              name={isFollowing ? "checkmark-circle" : "person-add"}
              size={18}
              color={isFollowing ? "#0891b2" : "#fff"}
            />
            <ThemedText className={`${isFollowing ? "text-cyan-700" : "text-white"} font-semibold ml-2`}>
              {isFollowing ? "Following" : "Follow"}
            </ThemedText>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function SuggestedUsersScreen() {
  const router = useRouter();
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const { border, textPrimary, textSecondary } = useAppTheme();

  const loadSuggestedUsers = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

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
      const result = await supabase
        .from("teachers")
        .select(
          "id, first_name, last_name, profile_picture_url, bio, school_name, followers_count"
        )
        .eq("verified", true)
        .order("first_name", { ascending: true })
        .limit(50);

      data = result.data;
      error = result.error;
    } else {
      const result = await supabase.rpc("get_suggested_users", {
        user_uuid: user.id,
        limit_count: 20,
      });

      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error("Error loading suggested users:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to load suggested users",
      });
    } else {
      setSuggestedUsers(data || []);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadSuggestedUsers();
  }, [loadSuggestedUsers]);

  useFocusEffect(
    useCallback(() => {
      loadSuggestedUsers();
    }, [loadSuggestedUsers])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadSuggestedUsers();
  }, [loadSuggestedUsers]);

  const handleUserPress = (userId) => {
    setSelectedUserId(userId);
    setShowProfileModal(true);
  };

  const renderUser = ({ item }) => (
    <SuggestedUserCard user={item} onPress={() => handleUserPress(item.id)} />
  );

  return (
    <ScreenWrapper>
      <LogoHeader position="left" />
      <View className={`p-4 pt-6 border-b ${border}`}>
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.push("/(tabs)/settings");
              }
            }}
            className="mr-4"
          >
            <Ionicons name="arrow-back" size={24} color="#22d3ee" />
          </TouchableOpacity>
          <View className="flex-1">
            <ThemedText className="text-cyan-500 text-xl font-bold">
              Suggested Teachers
            </ThemedText>
            <ThemedText className={`${textSecondary} text-sm`}>
              Based on your subjects
            </ThemedText>
          </View>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#22d3ee" />
        </View>
      ) : suggestedUsers.length === 0 ? (
        <View className="flex-1 items-center justify-center p-6">
          <View className="bg-cyan-500/20 w-20 h-20 rounded-full items-center justify-center mb-4">
            <Ionicons name="search-outline" size={40} color="#22d3ee" />
          </View>
          <ThemedText className={`${textPrimary} text-xl font-bold mb-2`}>
            No Suggestions
          </ThemedText>
          <ThemedText className={`${textSecondary} text-center`}>
            We couldn`t find any teachers to suggest at this time. Check back later!
          </ThemedText>
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

      <UserProfileModal
        visible={showProfileModal}
        userId={selectedUserId}
        onClose={() => {
          setShowProfileModal(false);
          setSelectedUserId(null);
        }}
        onNavigateToPath={(path) => {
          setShowProfileModal(false);
          setSelectedUserId(null);
          setTimeout(() => {
            router.push(path);
          }, 300);
        }}
      />
      <Toast />
    </ScreenWrapper>
  );
}
