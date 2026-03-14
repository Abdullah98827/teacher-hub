import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    ScrollView,
    TouchableOpacity,
    View,
} from "react-native";
import Toast from "react-native-toast-message";
import LogoHeader from "../../components/logoHeader";
import ScreenWrapper from "../../components/ScreenWrapper";
import { ThemedText } from '../../components/themed-text';
import TrendingResources from "../../components/TrendingResources";
import WeeklyLeaderboard from "../../components/WeeklyLeaderboard";
import { useAuth } from "../../contexts/AuthContext";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useUserRole } from "../../hooks/useUserRole";
import { supabase } from "../../supabase";

export default function CommunityScreen() {
  const { user } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const router = useRouter();
  const [groupChats, setGroupChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("chats");

  const isAdmin = role === "admin";
  const {
    bgCard,
    bgCardAlt,
    border,
    textPrimary,
    textSecondary,
    textMuted,
    isDark,
  } = useAppTheme();

  const fetchGroupChats = useCallback(async () => {
    if (!user?.id) return;

    let chats;

    if (isAdmin) {
      const { data, error } = await supabase
        .from("group_chats")
        .select(
          "id, name, description, is_public, subject:subjects(name, is_public)"
        )
        .order("name");

      if (error) {
        Toast.show({ type: "error", text1: "Failed to load chats" });
        setLoading(false);
        setRefreshing(false);
        return;
      }
      chats = data;
    } else {
      const { data: membership } = await supabase
        .from("memberships")
        .select("subject_ids")
        .eq("id", user.id)
        .eq("active", true)
        .single();

      const subjectIds = membership?.subject_ids || [];

      const { data: allChats, error: chatsError } = await supabase
        .from("group_chats")
        .select(
          "id, name, description, is_public, subject_id, subject:subjects(name, is_public)"
        );

      if (chatsError) {
        Toast.show({ type: "error", text1: "Failed to load chats" });
        setLoading(false);
        setRefreshing(false);
        return;
      }

      chats = (allChats || [])
        .filter((chat) => {
          if (chat.is_public) return true;
          if (subjectIds.includes(chat.subject_id)) return true;
          return false;
        })
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    const chatsWithLastMessage = await Promise.all(
      (chats || []).map(async (chat) => {
        const { data: lastMsg } = await supabase
          .from("group_messages")
          .select(
            "message, created_at, sender:teachers(first_name, last_name)"
          )
          .eq("group_chat_id", chat.id)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        return {
          ...chat,
          lastMessage: lastMsg || undefined,
          unreadCount: 0,
        };
      })
    );

    setGroupChats(chatsWithLastMessage);
    setLoading(false);
    setRefreshing(false);
  }, [user?.id, isAdmin]);

  useEffect(() => {
    if (!roleLoading) {
      fetchGroupChats();
    }
  }, [fetchGroupChats, roleLoading]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (activeTab === "chats") {
      fetchGroupChats();
    } else {
      setTimeout(() => setRefreshing(false), 1000);
    }
  }, [activeTab, fetchGroupChats]);

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

  const renderGroupChat = ({ item }) => (
    <TouchableOpacity
      className={`${bgCard} rounded-xl p-4 mb-3 border ${border}`}
      onPress={() => router.push(`/group-chat/${item.id}`)}
      activeOpacity={0.7}
    >
      {item.is_public && (
        <View className="bg-green-500/20 px-3 py-1 rounded-full self-start mb-2">
          <View className="flex-row items-center">
            <Ionicons name="globe" size={12} color="#22c55e" />
            <ThemedText className="text-green-400 text-xs font-bold ml-1">
              PUBLIC CHAT
            </ThemedText>
          </View>
        </View>
      )}

      <View className="flex-row items-center mb-2">
        <View className="bg-cyan-500/20 w-12 h-12 rounded-full items-center justify-center mr-3">
          <Ionicons name="chatbubbles" size={24} color="#22d3ee" />
        </View>
        <View className="flex-1">
          <ThemedText
            className={`${textPrimary} font-bold text-lg`}
            numberOfLines={1}
          >
            {item.name}
          </ThemedText>
          <View className="flex-row items-center gap-2">
            <ThemedText className="text-cyan-400 text-xs">
              {item.subject?.name || "Subject"}
            </ThemedText>
            {item.subject?.is_public && (
              <View className="bg-green-500/20 px-1.5 py-0.5 rounded">
                <ThemedText className="text-green-400 text-xs font-bold">
                  Public Resources
                </ThemedText>
              </View>
            )}
          </View>
        </View>
        {item.unreadCount > 0 && (
          <View className="bg-cyan-500 w-6 h-6 rounded-full items-center justify-center">
            <ThemedText className="text-white text-xs font-bold">
              {item.unreadCount > 9 ? "9+" : item.unreadCount}
            </ThemedText>
          </View>
        )}
      </View>

      {item.lastMessage ? (
        <View className="ml-15">
          <ThemedText className={`${textSecondary} text-sm`} numberOfLines={2}>
            <ThemedText className="font-semibold">
              {item.lastMessage.sender.first_name}:
            </ThemedText>{" "}
            {item.lastMessage.message}
          </ThemedText>
          <ThemedText className={`${textMuted} text-xs mt-1`}>
            {formatTime(item.lastMessage.created_at)}
          </ThemedText>
        </View>
      ) : (
        <ThemedText className={`${textSecondary} text-sm ml-15`}>
          No messages yet
        </ThemedText>
      )}
    </TouchableOpacity>
  );

  if (loading || roleLoading) {
    return (
      <ScreenWrapper>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#22d3ee" />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <LogoHeader position="left" />
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center justify-between mt-4 mb-4">
          <ThemedText className="text-3xl font-bold text-cyan-400">
            Community
          </ThemedText>
          <TouchableOpacity
            className="bg-cyan-500/20 w-11 h-11 rounded-full items-center justify-center"
            onPress={() => router.push("/direct-messages")}
          >
            <Ionicons name="chatbubble-ellipses" size={22} color="#22d3ee" />
          </TouchableOpacity>
        </View>

        {/* Tab Bar */}
        <View className="flex-row mb-4 gap-2">
          {[
            { key: "chats", label: "Chats" },
            { key: "trending", label: "Trending" },
            { key: "leaderboard", label: "Top Teachers" },
          ].map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              className={`flex-1 py-2 rounded-xl ${activeTab === key ? "bg-cyan-500" : bgCardAlt}`}
              onPress={() => setActiveTab(key)}
            >
              <ThemedText
                className={`text-center font-bold text-sm ${activeTab === key ? "text-white" : textSecondary}`}
              >
                {label}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === "chats" && (
          <>
            {groupChats.length === 0 ? (
              <View className="items-center justify-center py-10">
                <View className="bg-cyan-500/20 w-20 h-20 rounded-full items-center justify-center mb-4">
                  <Ionicons name="chatbubbles-outline" size={40} color="#22d3ee" />
                </View>
                <ThemedText className={`${textSecondary} text-center`}>
                  No group chats available yet
                </ThemedText>
              </View>
            ) : (
              <FlatList
                data={groupChats}
                keyExtractor={(item) => item.id}
                renderItem={renderGroupChat}
                scrollEnabled={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor="#22d3ee"
                  />
                }
              />
            )}
          </>
        )}

        {activeTab === "trending" && <TrendingResources />}
        {activeTab === "leaderboard" && <WeeklyLeaderboard />}
      </ScrollView>
    </ScreenWrapper>
  );
}
