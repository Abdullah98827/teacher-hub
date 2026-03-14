import LogoHeader from "@/components/logoHeader";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    TouchableOpacity,
    View,
} from "react-native";
import Toast from "react-native-toast-message";
import ProfilePicture from "../../../components/ProfilePicture";
import ScreenWrapper from "../../../components/ScreenWrapper";
import UserProfileModal from "../../../components/UserProfileModal";
import { useAppTheme } from "../../../hooks/useAppTheme";
import { supabase } from "../../../supabase";
import { ThemedText } from '../../../components/themed-text';

export default function FollowersScreen() {
  const params = useLocalSearchParams();
  const userId = params.id;
  const router = useRouter();
  const { bgCard, border, textPrimary, textSecondary } = useAppTheme();

  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const loadUserName = useCallback(async () => {
    const { data } = await supabase
      .from("teachers")
      .select("first_name, last_name")
      .eq("id", userId)
      .single();
    if (data) {
      setUserName(`${data.first_name} ${data.last_name}`);
    }
  }, [userId]);

  const loadFollowers = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_followers", {
      teacher_uuid: userId,
      limit_count: 100,
      offset_count: 0,
    });

    if (error) {
      console.error("Error loading followers:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to load followers",
      });
    } else {
      setFollowers(data || []);
    }
    setLoading(false);
    setRefreshing(false);
  }, [userId]);

  useEffect(() => {
    loadUserName();
  }, [loadUserName]);

  useFocusEffect(
    useCallback(() => {
      loadFollowers();
    }, [loadFollowers])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadFollowers();
  }, [loadFollowers]);

  const handleUserPress = (followerId) => {
    setSelectedUserId(followerId);
    setShowProfileModal(true);
  };

  const renderFollower = ({ item }) => (
    <TouchableOpacity
      className={`flex-row items-center p-4 ${bgCard} mb-2 rounded-xl ${border} border`}
      onPress={() => handleUserPress(item.id)}
    >
      <ProfilePicture
        imageUrl={item.profile_picture_url}
        firstName={item.first_name}
        lastName={item.last_name}
        size="md"
      />
      <View className="flex-1 ml-3">
        <ThemedText className={`${textPrimary} font-semibold text-base`}>
          {item.first_name} {item.last_name}
        </ThemedText>
        {item.bio && (
          <ThemedText className={`${textSecondary} text-sm mt-1`} numberOfLines={1}>
            {item.bio}
          </ThemedText>
        )}
        <View className="flex-row items-center mt-1">
          <Ionicons name="people-outline" size={14} color="#9CA3AF" />
          <ThemedText className={`${textSecondary} text-xs ml-1`}>
            {item.followers_count ?? 0}{" "}
            {(item.followers_count ?? 0) === 1 ? "follower" : "followers"}
          </ThemedText>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#6B7280" />
    </TouchableOpacity>
  );

  return (
    <ScreenWrapper>
      <LogoHeader position="left" />
      <View className={`${bgCard} p-4 pt-6 border-b ${border}`}>
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/settings")}
            className="mr-4"
          >
            <Ionicons name="arrow-back" size={24} color="#22d3ee" />
          </TouchableOpacity>
          <View className="flex-1">
            <ThemedText className={`${textPrimary} text-xl font-bold`}>Followers</ThemedText>
            {userName && (
              <ThemedText className={`${textSecondary} text-sm`}>{userName}</ThemedText>
            )}
          </View>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#22d3ee" />
        </View>
      ) : followers.length === 0 ? (
        <View className="flex-1 items-center justify-center p-6">
          <View className="bg-cyan-500/20 w-20 h-20 rounded-full items-center justify-center mb-4">
            <Ionicons name="people-outline" size={40} color="#22d3ee" />
          </View>
          <ThemedText className={`${textPrimary} text-xl font-bold mb-2`}>
            No Followers Yet
          </ThemedText>
          <ThemedText className={`${textSecondary} text-center`}>
            This teacher doesn`t have any followers yet
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={followers}
          renderItem={renderFollower}
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
          setTimeout(() => router.push(path), 400);
        }}
      />
      <Toast />
    </ScreenWrapper>
  );
}
