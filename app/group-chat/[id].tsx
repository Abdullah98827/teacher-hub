import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import ScreenWrapper from "../../components/ScreenWrapper";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../supabase";
import { useUserRole } from "../hooks/useUserRole";

interface Message {
  id: string;
  message: string;
  created_at: string;
  sender: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

interface GroupChat {
  id: string;
  name: string;
  description: string;
}

export default function GroupChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { role } = useUserRole();
  const router = useRouter();

  const [groupChat, setGroupChat] = useState<GroupChat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(
    null
  );
  const flatListRef = useRef<FlatList>(null);

  const isAdmin = role === "admin";

  const fetchGroupChat = useCallback(async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from("group_chats")
      .select("id, name, description")
      .eq("id", id)
      .single();

    if (error || !data) {
      Toast.show({
        type: "error",
        text1: "Group not found",
      });
      router.back();
      return;
    }

    setGroupChat(data);
  }, [id]);

  const fetchMessages = useCallback(async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from("group_messages")
      .select(
        "id, message, created_at, sender:teachers(id, first_name, last_name)"
      )
      .eq("group_chat_id", id)
      .is("deleted_at", null) // Only fetch non-deleted messages
      .order("created_at", { ascending: true });

    if (error) {
      Toast.show({
        type: "error",
        text1: "Failed to load messages",
      });
      return;
    }

    setMessages((data as any) || []);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchGroupChat();
    fetchMessages();

    // Subscribe to real-time messages
    const channel = supabase
      .channel(`group_chat_${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "group_messages",
          filter: `group_chat_id=eq.${id}`,
        },
        async (payload) => {
          // Fetch sender details
          const { data: sender } = await supabase
            .from("teachers")
            .select("id, first_name, last_name")
            .eq("id", payload.new.sender_id)
            .single();

          const newMsg = {
            ...payload.new,
            sender: sender || { id: "", first_name: "Unknown", last_name: "" },
          } as Message;

          setMessages((prev) => [...prev, newMsg]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "group_messages",
          filter: `group_chat_id=eq.${id}`,
        },
        (payload) => {
          // Remove deleted message from UI
          setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, fetchGroupChat, fetchMessages]);

  const deleteMessage = async (messageId: string) => {
    if (!isAdmin) return;

    Alert.alert(
      "Delete Message",
      "Are you sure you want to delete this message? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingMessageId(messageId);

            // Soft delete: set deleted_at and deleted_by
            const { error } = await supabase
              .from("group_messages")
              .update({
                deleted_at: new Date().toISOString(),
                deleted_by: user?.id,
              })
              .eq("id", messageId);

            if (error) {
              Toast.show({
                type: "error",
                text1: "Failed to delete message",
                text2: error.message,
              });
            } else {
              Toast.show({
                type: "success",
                text1: "Message deleted",
              });
              // Remove from UI
              setMessages((prev) => prev.filter((m) => m.id !== messageId));
            }

            setDeletingMessageId(null);
          },
        },
      ]
    );
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user?.id || !id) return;

    setSending(true);
    const messageText = newMessage.trim();
    setNewMessage(""); // Clear input immediately

    // Get current user details
    const { data: currentUser } = await supabase
      .from("teachers")
      .select("id, first_name, last_name")
      .eq("id", user.id)
      .single();

    // Optimistically add message to UI (instant feedback)
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      message: messageText,
      created_at: new Date().toISOString(),
      sender: currentUser || {
        id: user.id,
        first_name: "You",
        last_name: "",
      },
    };

    setMessages((prev) => [...prev, tempMessage]);

    // Scroll to bottom immediately
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 50);

    // Send to database
    const { data, error } = await supabase
      .from("group_messages")
      .insert({
        group_chat_id: id,
        sender_id: user.id,
        message: messageText,
      })
      .select("id, message, created_at")
      .single();

    if (error) {
      // Remove temp message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
      setNewMessage(messageText); // Restore message
      Toast.show({
        type: "error",
        text1: "Failed to send message",
      });
      setSending(false);
      return;
    }

    // Replace temp message with real one
    if (data) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempMessage.id
            ? ({ ...data, sender: tempMessage.sender } as Message)
            : m
        )
      );
    }

    setSending(false);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.sender.id === user?.id;
    const isDeleting = deletingMessageId === item.id;

    return (
      <View className={`mb-3 ${isOwnMessage ? "items-end" : "items-start"}`}>
        {!isOwnMessage && (
          <Text className="text-cyan-400 text-xs font-semibold mb-1 ml-2">
            {item.sender.first_name} {item.sender.last_name}
          </Text>
        )}
        <View className="flex-row items-end">
          {/* Delete button for admins on left side (for other people's messages) */}
          {isAdmin && !isOwnMessage && (
            <TouchableOpacity
              onPress={() => deleteMessage(item.id)}
              disabled={isDeleting}
              className="mr-2 mb-1"
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#ef4444" />
              ) : (
                <Ionicons name="trash-outline" size={16} color="#ef4444" />
              )}
            </TouchableOpacity>
          )}

          <View
            className={`max-w-[75%] px-4 py-3 rounded-2xl ${
              isOwnMessage
                ? "bg-cyan-500 rounded-br-sm"
                : "bg-neutral-800 rounded-bl-sm"
            }`}
          >
            <Text
              className={`${isOwnMessage ? "text-white" : "text-gray-100"}`}
            >
              {item.message}
            </Text>
            <Text
              className={`text-xs mt-1 ${
                isOwnMessage ? "text-cyan-100" : "text-gray-500"
              }`}
            >
              {formatTime(item.created_at)}
            </Text>
          </View>

          {/* Delete button for admins on right side (for own messages) */}
          {isAdmin && isOwnMessage && (
            <TouchableOpacity
              onPress={() => deleteMessage(item.id)}
              disabled={isDeleting}
              className="ml-2 mb-1"
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#ef4444" />
              ) : (
                <Ionicons name="trash-outline" size={16} color="#ef4444" />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

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
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {/* Header */}
        <View className="bg-neutral-900 px-5 py-4 flex-row items-center border-b border-neutral-800">
          <TouchableOpacity className="mr-3" onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#22d3ee" />
          </TouchableOpacity>
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-white font-bold text-lg" numberOfLines={1}>
                {groupChat?.name}
              </Text>
              {isAdmin && (
                <View className="bg-purple-500/20 px-2 py-0.5 rounded">
                  <Text className="text-purple-400 text-xs font-bold">MOD</Text>
                </View>
              )}
            </View>
            {groupChat?.description && (
              <Text className="text-gray-400 text-xs" numberOfLines={1}>
                {groupChat.description}
              </Text>
            )}
          </View>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          className="flex-1 px-5 pt-4 bg-black"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20">
              <Ionicons name="chatbubbles-outline" size={60} color="#374151" />
              <Text className="text-gray-500 mt-4">No messages yet</Text>
              <Text className="text-gray-600 text-sm">
                Be the first to say something!
              </Text>
            </View>
          }
        />

        {/* Input */}
        <View className="bg-neutral-900 px-5 py-3 border-t border-neutral-800">
          <View className="flex-row items-center">
            <TextInput
              className="flex-1 bg-neutral-800 text-white px-4 py-3 rounded-full mr-3"
              placeholder="Type a message..."
              placeholderTextColor="#6B7280"
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              className={`w-12 h-12 rounded-full items-center justify-center ${
                newMessage.trim() && !sending ? "bg-cyan-500" : "bg-neutral-800"
              }`}
              onPress={sendMessage}
              disabled={!newMessage.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons
                  name="send"
                  size={20}
                  color={newMessage.trim() ? "#fff" : "#6B7280"}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
      <Toast />
    </ScreenWrapper>
  );
}
