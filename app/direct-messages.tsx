import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import ScreenWrapper from "../components/ScreenWrapper";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../supabase";

interface Conversation {
  userId: string;
  userName: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline?: boolean;
}

export default function DirectMessagesScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [allTeachers, setAllTeachers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);

  const fetchConversations = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Get all messages where user is sender or receiver
      const { data: messages, error } = await supabase
        .from("direct_messages")
        .select("*")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Group by conversation partner
      const conversationMap = new Map<string, any>();

      for (const msg of messages || []) {
        const partnerId =
          msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;

        if (!conversationMap.has(partnerId)) {
          conversationMap.set(partnerId, {
            userId: partnerId,
            lastMessage: msg.message,
            lastMessageTime: msg.created_at,
            unreadCount: msg.receiver_id === user.id && !msg.read ? 1 : 0,
          });
        } else if (msg.receiver_id === user.id && !msg.read) {
          const conv = conversationMap.get(partnerId);
          conv.unreadCount += 1;
        }
      }

      // Fetch user names
      const conversationsWithNames = await Promise.all(
        Array.from(conversationMap.values()).map(async (conv) => {
          const { data: teacher } = await supabase
            .from("teachers")
            .select("first_name, last_name")
            .eq("id", conv.userId)
            .single();

          return {
            ...conv,
            userName: teacher
              ? `${teacher.first_name} ${teacher.last_name}`
              : "Unknown",
          };
        })
      );

      setConversations(conversationsWithNames);
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Failed to load conversations",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  const fetchAllTeachers = useCallback(async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from("teachers")
      .select("id, first_name, last_name")
      .eq("verified", true)
      .neq("id", user.id)
      .order("first_name");

    if (!error && data) {
      setAllTeachers(data);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchConversations();
    fetchAllTeachers();
  }, [fetchConversations, fetchAllTeachers]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString();
  };

  const filteredTeachers = allTeachers.filter((teacher) =>
    `${teacher.first_name} ${teacher.last_name}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      className="bg-neutral-900 rounded-xl p-4 mb-3 flex-row items-center border border-neutral-800"
      onPress={() => router.push(`/dm/${item.userId}`)}
      activeOpacity={0.7}
    >
      <View className="bg-cyan-500/20 w-12 h-12 rounded-full items-center justify-center mr-3">
        <Text className="text-cyan-400 font-bold text-lg">
          {item.userName.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View className="flex-1">
        <View className="flex-row items-center justify-between mb-1">
          <Text className="text-white font-bold text-base">
            {item.userName}
          </Text>
          <Text className="text-gray-500 text-xs">
            {formatTime(item.lastMessageTime)}
          </Text>
        </View>
        <Text
          className={`text-sm ${item.unreadCount > 0 ? "text-white font-semibold" : "text-gray-400"}`}
          numberOfLines={1}
        >
          {item.lastMessage}
        </Text>
      </View>
      {item.unreadCount > 0 && (
        <View className="bg-cyan-500 w-6 h-6 rounded-full items-center justify-center ml-2">
          <Text className="text-white text-xs font-bold">
            {item.unreadCount > 9 ? "9+" : item.unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderTeacher = ({ item }: { item: any }) => (
    <TouchableOpacity
      className="bg-neutral-900 rounded-xl p-4 mb-3 flex-row items-center border border-neutral-800"
      onPress={() => {
        setShowNewChat(false);
        router.push(`/dm/${item.id}`);
      }}
      activeOpacity={0.7}
    >
      <View className="bg-cyan-500/20 w-12 h-12 rounded-full items-center justify-center mr-3">
        <Text className="text-cyan-400 font-bold text-lg">
          {item.first_name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <Text className="text-white font-semibold text-base">
        {item.first_name} {item.last_name}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
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
      <View className="flex-1 px-5 pt-12">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity className="mr-3" onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#22d3ee" />
            </TouchableOpacity>
            <Text className="text-3xl font-bold text-cyan-400">
              {showNewChat ? "New Chat" : "Messages"}
            </Text>
          </View>
          <TouchableOpacity
            className="bg-cyan-500 w-12 h-12 rounded-full items-center justify-center"
            onPress={() => setShowNewChat(!showNewChat)}
          >
            <Ionicons
              name={showNewChat ? "close" : "create"}
              size={24}
              color="#fff"
            />
          </TouchableOpacity>
        </View>

        {showNewChat && (
          <View className="mb-4">
            <View className="bg-neutral-800 flex-row items-center px-4 py-3 rounded-xl border border-neutral-700">
              <Ionicons name="search" size={20} color="#6B7280" />
              <TextInput
                className="flex-1 text-white ml-2"
                placeholder="Search teachers..."
                placeholderTextColor="#6B7280"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>
        )}

        {/* Content */}
        {showNewChat ? (
          <FlatList
            data={filteredTeachers}
            renderItem={renderTeacher}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View className="items-center py-10">
                <Text className="text-gray-500">No teachers found</Text>
              </View>
            }
          />
        ) : conversations.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <Ionicons name="chatbubble-outline" size={60} color="#374151" />
            <Text className="text-white text-xl font-bold mt-4 mb-2">
              No Messages Yet
            </Text>
            <Text className="text-gray-400 text-center mb-6">
              Start a conversation with other teachers
            </Text>
            <TouchableOpacity
              className="bg-cyan-500 px-6 py-3 rounded-full"
              onPress={() => setShowNewChat(true)}
            >
              <Text className="text-white font-bold">New Message</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={conversations}
            renderItem={renderConversation}
            keyExtractor={(item) => item.userId}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchConversations();
                }}
                tintColor="#22d3ee"
              />
            }
          />
        )}
      </View>
      <Toast />
    </ScreenWrapper>
  );
}
