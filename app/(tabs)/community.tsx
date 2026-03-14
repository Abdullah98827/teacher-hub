import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import LogoHeader from "../../components/logoHeader";
import ScreenWrapper from "../../components/ScreenWrapper";
import TrendingResources from "../../components/TrendingResources";
import WeeklyLeaderboard from "../../components/WeeklyLeaderboard";
import { useAuth } from "../../contexts/AuthContext";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useUserRole } from "../../hooks/useUserRole";
import { supabase } from "../../supabase";

interface GroupChat {
  id: string;
  name: string;
  description: string;
  is_public: boolean;
  subject: {
    name: string;
    is_public: boolean;
  };
  lastMessage?: {
    message: string;
    created_at: string;
    sender: { first_name: string; last_name: string };
  };
  unreadCount: number;
}

export default function CommunityScreen() {
  const { user } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const router = useRouter();
  const [groupChats, setGroupChats] = useState<GroupChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "chats" | "trending" | "leaderboard"
  >("chats");

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

    try {
      let chats;

      if (isAdmin) {
        const { data, error } = await supabase
          .from("group_chats")
          .select(
            "id, name, description, is_public, subject:subjects(name, is_public)"
          )
          .order("name");

        if (error) throw error;
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

        if (chatsError) throw chatsError;

        const accessibleChats = (allChats || []).filter((chat) => {
          if (chat.is_public) return true;
          if (subjectIds.includes(chat.subject_id)) return true;
          return false;
        });

        chats = accessibleChats.sort((a, b) => a.name.localeCompare(b.name));
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

      setGroupChats(chatsWithLastMessage as any);
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Failed to load chats",
        text2: error.message,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
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

  const renderGroupChat = ({ item }: { item: GroupChat }) => (
    <TouchableOpacity
      className={`${bgCard} rounded-xl p-4 mb-3 border ${border}`}
      onPress={() => router.push(`/group-chat/${item.id}`)}
      activeOpacity={0.7}
    >
      {item.is_public && (
        <View className="bg-green-500/20 px-3 py-1 rounded-full self-start mb-2">
          <View className="flex-row items-center">
            <Ionicons name="globe" size={12} color="#22c55e" />
            <Text className="text-green-400 text-xs font-bold ml-1">
              PUBLIC CHAT
            </Text>
          </View>
        </View>
      )}

      <View className="flex-row items-center mb-2">
        <View className="bg-cyan-500/20 w-12 h-12 rounded-full items-center justify-center mr-3">
          <Ionicons name="chatbubbles" size={24} color="#22d3ee" />
        </View>
        <View className="flex-1">
          <Text
            className={`${textPrimary} font-bold text-lg`}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <View className="flex-row items-center gap-2">
            <Text className="text-cyan-400 text-xs">
              {item.subject?.name || "Subject"}
            </Text>
            {item.subject?.is_public && (
              <View className="bg-green-500/20 px-1.5 py-0.5 rounded">
                <Text className="text-green-400 text-xs font-bold">
                  Public Resources
                </Text>
              </View>
            )}
          </View>
        </View>
        {item.unreadCount > 0 && (
          <View className="bg-cyan-500 w-6 h-6 rounded-full items-center justify-center">
            <Text className="text-white text-xs font-bold">
              {item.unreadCount > 9 ? "9+" : item.unreadCount}
            </Text>
          </View>
        )}
      </View>

      {item.lastMessage ? (
        <View className="ml-15">
          <Text className={`${textSecondary} text-sm`} numberOfLines={2}>
            <Text className="font-semibold">
              {item.lastMessage.sender.first_name}:
            </Text>{" "}
            {item.lastMessage.message}
          </Text>
          <Text className={`${textMuted} text-xs mt-1`}>
            {formatTime(item.lastMessage.created_at)}
          </Text>
        </View>
      ) : (
        <Text className={`${textSecondary} text-sm ml-15`}>
          No messages yet
        </Text>
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

      <View className="flex-1">
        <View className="px-5 pt-4 pb-2">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <Text className="text-3xl font-bold text-cyan-400">
                  Community
                </Text>
                {isAdmin && (
                  <View className="bg-purple-500/20 px-2 py-1 rounded-full">
                    <Text className="text-purple-400 text-xs font-bold">
                      ADMIN
                    </Text>
                  </View>
                )}
              </View>
              <Text className={textSecondary}>
                Connect with fellow teachers
              </Text>
            </View>
            <TouchableOpacity
              className="bg-cyan-500 w-12 h-12 rounded-full items-center justify-center"
              onPress={() => router.push("/direct-messages")}
            >
              <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            className={`rounded-xl p-4 mb-4 border ${isDark ? "bg-cyan-900/30 border-cyan-500/30" : "bg-cyan-50 border-cyan-200"}`}
            onPress={() => router.push("/suggested-users")}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              <View className="bg-cyan-500 w-14 h-14 rounded-full items-center justify-center mr-4">
                <Ionicons name="people" size={28} color="#fff" />
              </View>
              <View className="flex-1">
                <Text className={`${textPrimary} font-bold text-lg`}>
                  Discover Teachers
                </Text>
                <Text
                  className={
                    isDark ? "text-cyan-400 text-sm" : "text-cyan-600 text-sm"
                  }
                >
                  Find teachers in your subjects
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={24}
                color={isDark ? "#22d3ee" : "#0891b2"}
              />
            </View>
          </TouchableOpacity>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-4"
          >
            <View className="flex-row gap-2">
              <TouchableOpacity
                className={`py-3 px-4 rounded-xl ${activeTab === "chats" ? "bg-cyan-500" : bgCardAlt}`}
                onPress={() => setActiveTab("chats")}
              >
                <Text
                  className={`font-bold ${activeTab === "chats" ? "text-white" : textSecondary}`}
                >
                  Group Chats ({groupChats.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className={`py-3 px-4 rounded-xl ${activeTab === "trending" ? "bg-cyan-500" : bgCardAlt}`}
                onPress={() => setActiveTab("trending")}
              >
                <Text
                  className={`font-bold ${activeTab === "trending" ? "text-white" : textSecondary}`}
                >
                  Trending
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className={`py-3 px-4 rounded-xl ${activeTab === "leaderboard" ? "bg-cyan-500" : bgCardAlt}`}
                onPress={() => setActiveTab("leaderboard")}
              >
                <Text
                  className={`font-bold ${activeTab === "leaderboard" ? "text-white" : textSecondary}`}
                >
                  Leaderboard
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        <View className="flex-1">
          {activeTab === "chats" && (
            <View className="flex-1 px-5">
              {groupChats.length === 0 ? (
                <View className="flex-1 items-center justify-center">
                  <View className="bg-cyan-500/20 w-20 h-20 rounded-full items-center justify-center mb-4">
                    <Ionicons name="chatbubbles" size={40} color="#22d3ee" />
                  </View>
                  <Text className={`${textPrimary} text-xl font-bold mb-2`}>
                    No Group Chats
                  </Text>
                  <Text className={`${textSecondary} text-center`}>
                    {isAdmin
                      ? "No group chats have been created yet"
                      : "Subscribe to subjects or check public chats"}
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={groupChats}
                  renderItem={renderGroupChat}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                  refreshControl={
                    <RefreshControl
                      refreshing={refreshing}
                      onRefresh={onRefresh}
                      tintColor="#22d3ee"
                    />
                  }
                />
              )}
            </View>
          )}

          {activeTab === "trending" && (
            <ScrollView
              className="flex-1 px-5"
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor="#22d3ee"
                />
              }
              showsVerticalScrollIndicator={false}
            >
              <View className="pb-6">
                <TrendingResources />
              </View>
            </ScrollView>
          )}

          {activeTab === "leaderboard" && (
            <ScrollView
              className="flex-1 px-5"
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor="#22d3ee"
                />
              }
              showsVerticalScrollIndicator={false}
            >
              <View className="pb-6">
                <WeeklyLeaderboard />
              </View>
            </ScrollView>
          )}
        </View>
      </View>

      <Toast />
    </ScreenWrapper>
  );
}
