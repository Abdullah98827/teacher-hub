import LogoHeader from "@/components/logoHeader";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
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
import ProfilePicture from "../../../components/ProfilePicture";
import ScreenWrapper from "../../../components/ScreenWrapper";
import UserProfileModal from "../../../components/UserProfileModal";
import { useAppTheme } from "../../../hooks/useAppTheme";
import { supabase } from "../../../supabase";

interface Follower {
  id: string;
  first_name: string;
  last_name: string;
  profile_picture_url: string | null;
  bio: string | null;
  followers_count: number;
  followed_at: string;
}

export default function FollowersScreen() {
  const params = useLocalSearchParams();
  const userId = params.id as string;
  const router = useRouter();
  const { bgCard, border, textPrimary, textSecondary } = useAppTheme();

  const [followers, setFollowers] = useState<Follower[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
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
    try {
      const { data, error } = await supabase.rpc("get_followers", {
        teacher_uuid: userId,
        limit_count: 100,
        offset_count: 0,
      });

      if (error) throw error;
      setFollowers(data || []);
    } catch (error: any) {
      console.error("Error loading followers:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to load followers",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
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

  const handleUserPress = (followerId: string) => {
    setSelectedUserId(followerId);
    setShowProfileModal(true);
  };

  const renderFollower = ({ item }: { item: Follower }) => (
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
        <Text className={`${textPrimary} font-semibold text-base`}>
          {item.first_name} {item.last_name}
        </Text>
        {item.bio && (
          <Text className={`${textSecondary} text-sm mt-1`} numberOfLines={1}>
            {item.bio}
          </Text>
        )}
        <View className="flex-row items-center mt-1">
          <Ionicons name="people-outline" size={14} color="#9CA3AF" />
          <Text className={`${textSecondary} text-xs ml-1`}>
            {item.followers_count ?? 0}{" "}
            {(item.followers_count ?? 0) === 1 ? "follower" : "followers"}
          </Text>
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
            <Text className={`${textPrimary} text-xl font-bold`}>
              Followers
            </Text>
            {userName && (
              <Text className={`${textSecondary} text-sm`}>{userName}</Text>
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
          <Text className={`${textPrimary} text-xl font-bold mb-2`}>
            No Followers Yet
          </Text>
          <Text className={`${textSecondary} text-center`}>
            This teacher doesn`t have any followers yet
          </Text>
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
          setTimeout(() => router.push(path as any), 400);
        }}
      />
      <Toast />
    </ScreenWrapper>
  );
}
