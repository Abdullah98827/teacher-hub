import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    TouchableOpacity,
    View,
} from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";
import { supabase } from "../supabase";
import ProfilePicture from "./ProfilePicture";
import { ThemedText } from './themed-text';

export default function ActivityFeed({ userId, limit = 20 }) {
  const router = useRouter();
  const { bgCard, border, textPrimary, textSecondary, textMuted } = useAppTheme();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadActivities();
  }, [userId]);

  const loadActivities = async () => {
    const { data, error } = await supabase.rpc("get_activity_feed", {
      user_uuid: userId,
      limit_count: limit,
      offset_count: 0,
    });

    if (error) {
      console.error("Error loading activity feed:", error);
    } else {
      setActivities(data || []);
    }

    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadActivities();
  };

  const formatTime = (dateString) => {
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

  const getActivityIcon = (type) => {
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

  const getActivityText = (activity) => {
    const name = `${activity.first_name} ${activity.last_name}`;

    switch (activity.activity_type) {
      case "resource_upload":
        return (
          <>
            <ThemedText className="font-semibold">{name}</ThemedText>
            <ThemedText> uploaded a new resource: </ThemedText>
            <ThemedText className="font-semibold">{activity.resource_title}</ThemedText>
          </>
        );
      case "comment":
        return (
          <>
            <ThemedText className="font-semibold">{name}</ThemedText>
            <ThemedText> commented on </ThemedText>
            <ThemedText className="font-semibold">{activity.resource_title}</ThemedText>
          </>
        );
      case "follow":
        return (
          <>
            <ThemedText className="font-semibold">{name}</ThemedText>
            <ThemedText> started following </ThemedText>
            <ThemedText className="font-semibold">{activity.target_user_name}</ThemedText>
          </>
        );
      case "rating":
        return (
          <>
            <ThemedText className="font-semibold">{name}</ThemedText>
            <ThemedText> rated </ThemedText>
            <ThemedText className="font-semibold">{activity.resource_title}</ThemedText>
          </>
        );
      default:
        return <ThemedText>{name} performed an activity</ThemedText>;
    }
  };

  const handleActivityPress = (activity) => {
    if (activity.resource_id) {
      console.log("Open resource:", activity.resource_id);
    } else if (activity.target_user_id) {
      console.log("Open profile:", activity.target_user_id);
    }
  };

  const renderActivity = ({ item }) => {
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
              <Ionicons name={icon.name} size={12} color="#fff" />
            </View>
          </View>

          <View className="flex-1">
            <ThemedText className={`${textSecondary} text-sm leading-5`}>
              {getActivityText(item)}
            </ThemedText>
            <ThemedText className={`${textMuted} text-xs mt-1`}>
              {formatTime(item.created_at)}
            </ThemedText>
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
        <ThemedText className={`${textPrimary} font-bold text-lg mb-1`}>No Activity Yet</ThemedText>
        <ThemedText className={`${textSecondary} text-center text-sm px-8`}>
          Follow teachers to see their activities here
        </ThemedText>
        <TouchableOpacity
          className="bg-cyan-600 px-6 py-3 rounded-lg mt-4"
          onPress={() => router.push("/suggested-users")}
        >
          <ThemedText className="text-white font-semibold">Find Teachers</ThemedText>
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
