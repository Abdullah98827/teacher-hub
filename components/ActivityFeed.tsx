import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../supabase";
import { useAppTheme } from "../hooks/useAppTheme";
import ProfilePicture from "./ProfilePicture";

interface Activity {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  profile_picture_url: string | null;
  activity_type: string;
  resource_id: string | null;
  resource_title: string | null;
  target_user_id: string | null;
  target_user_name: string | null;
  metadata: any;
  created_at: string;
}

interface ActivityFeedProps {
  userId: string;
  limit?: number;
}

export default function ActivityFeed({
  userId,
  limit = 20,
}: ActivityFeedProps) {
  const router = useRouter();
  const { bgCard, border, textPrimary, textSecondary, textMuted } = useAppTheme();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadActivities();
  }, [userId]);

  const loadActivities = async () => {
    try {
      const { data, error } = await supabase.rpc("get_activity_feed", {
        user_uuid: userId,
        limit_count: limit,
        offset_count: 0,
      });

      if (error) throw error;
      setActivities(data || []);
    } catch (error: any) {
      console.error("Error loading activity feed:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadActivities();
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "resource_upload":
        return { name: "cloud-upload", color: "#22d3ee" };
      case "comment":
        return { name: "chatbubble", color: "#a855f7" };
      case "follow":
        return { name: "person-add", color: "#10b981" };
      case "rating":
        return { name: "star", color: "#f59e0b" };
      default:
        return { name: "ellipse", color: "#6b7280" };
    }
  };

  const getActivityText = (activity: Activity) => {
    const name = `${activity.first_name} ${activity.last_name}`;

    switch (activity.activity_type) {
      case "resource_upload":
        return (
          <>
            <Text className="font-semibold">{name}</Text>
            <Text> uploaded a new resource: </Text>
            <Text className="font-semibold">{activity.resource_title}</Text>
          </>
        );
      case "comment":
        return (
          <>
            <Text className="font-semibold">{name}</Text>
            <Text> commented on </Text>
            <Text className="font-semibold">{activity.resource_title}</Text>
          </>
        );
      case "follow":
        return (
          <>
            <Text className="font-semibold">{name}</Text>
            <Text> started following </Text>
            <Text className="font-semibold">{activity.target_user_name}</Text>
          </>
        );
      case "rating":
        return (
          <>
            <Text className="font-semibold">{name}</Text>
            <Text> rated </Text>
            <Text className="font-semibold">{activity.resource_title}</Text>
          </>
        );
      default:
        return <Text>{name} performed an activity</Text>;
    }
  };

  const handleActivityPress = (activity: Activity) => {
    // Navigate based on activity type
    if (activity.resource_id) {
      // Open resource (you'll need to implement this navigation)
      console.log("Open resource:", activity.resource_id);
    } else if (activity.target_user_id) {
      // Open user profile
      console.log("Open profile:", activity.target_user_id);
    }
  };

  const renderActivity = ({ item }: { item: Activity }) => {
    const icon = getActivityIcon(item.activity_type);

    return (
      <TouchableOpacity
        className={`${bgCard} p-4 rounded-xl mb-3 border ${border}`}
        onPress={() => handleActivityPress(item)}
        activeOpacity={0.7}
      >
        <View className="flex-row items-start">
          <View className="mr-3">
            <ProfilePicture
              imageUrl={item.profile_picture_url}
              firstName={item.first_name}
              lastName={item.last_name}
              size="sm"
            />
            <View
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full items-center justify-center"
              style={{ backgroundColor: icon.color }}
            >
              <Ionicons name={icon.name as any} size={12} color="#fff" />
            </View>
          </View>

          <View className="flex-1">
            <Text className={`${textSecondary} text-sm leading-5`}>
              {getActivityText(item)}
            </Text>
            <Text className={`${textMuted} text-xs mt-1`}>
              {formatTime(item.created_at)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View className="items-center justify-center py-8">
        <ActivityIndicator size="large" color="#22d3ee" />
      </View>
    );
  }

  if (activities.length === 0) {
    return (
      <View className="items-center justify-center py-8">
        <View className="bg-cyan-500/20 w-16 h-16 rounded-full items-center justify-center mb-3">
          <Ionicons name="pulse" size={32} color="#22d3ee" />
        </View>
        <Text className={`${textPrimary} font-bold text-lg mb-1`}>
          No Activity Yet
        </Text>
        <Text className={`${textSecondary} text-center text-sm px-8`}>
          Follow teachers to see their activities here
        </Text>
        <TouchableOpacity
          className="bg-cyan-600 px-6 py-3 rounded-lg mt-4"
          onPress={() => router.push("/suggested-users")}
        >
          <Text className="text-white font-semibold">Find Teachers</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={activities}
      renderItem={renderActivity}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#22d3ee"
        />
      }
      showsVerticalScrollIndicator={false}
    />
  );
}
