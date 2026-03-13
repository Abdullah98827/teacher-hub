import LogoHeader from "@/components/logoHeader";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { useAppTheme } from "../../hooks/useAppTheme";
import { supabase } from "../../supabase";

interface Message {
  id: string;
  message: string;
  created_at: string;
  sender_id: string;
  receiver_id: string;
  read: boolean;
}

export default function DMChatScreen() {
  const { id: partnerId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const {
    bgCard,
    bgCardAlt,
    bgInput,
    border,
    textPrimary,
    textSecondary,
    textMuted,
    placeholderColor,
  } = useAppTheme();

  const [partnerName, setPartnerName] = useState("Loading...");
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const fetchPartnerInfo = useCallback(async () => {
    if (!partnerId) return;

    const { data, error } = await supabase
      .from("teachers")
      .select("first_name, last_name")
      .eq("id", partnerId)
      .single();

    if (error || !data) {
      Toast.show({
        type: "error",
        text1: "User not found",
      });
      router.back();
      return;
    }

    setPartnerName(`${data.first_name} ${data.last_name}`);
  }, [partnerId]);

  const fetchMessages = useCallback(async () => {
    if (!partnerId || !user?.id) return;

    const { data, error } = await supabase
      .from("direct_messages")
      .select("*")
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`
      )
      .order("created_at", { ascending: true });

    if (error) {
      Toast.show({
        type: "error",
        text1: "Failed to load messages",
      });
      return;
    }

    setMessages(data || []);
    setLoading(false);

    // Mark messages as read
    await supabase
      .from("direct_messages")
      .update({ read: true, read_at: new Date().toISOString() })
      .eq("receiver_id", user.id)
      .eq("sender_id", partnerId)
      .eq("read", false);
  }, [partnerId, user?.id]);

  useEffect(() => {
    fetchPartnerInfo();
    fetchMessages();

    // Subscribe to real-time messages
    const channel = supabase
      .channel(`dm_${user?.id}_${partnerId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `receiver_id=eq.${user?.id}`,
        },
        (payload) => {
          if (
            payload.new.sender_id === partnerId ||
            payload.new.receiver_id === partnerId
          ) {
            setMessages((prev) => [...prev, payload.new as Message]);

            // Mark as read immediately
            supabase
              .from("direct_messages")
              .update({ read: true, read_at: new Date().toISOString() })
              .eq("id", payload.new.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [partnerId, user?.id, fetchPartnerInfo, fetchMessages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !user?.id || !partnerId) return;

    setSending(true);
    const messageText = newMessage.trim();
    setNewMessage(""); // Clear input immediately

    // Optimistically add message to UI
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      message: messageText,
      created_at: new Date().toISOString(),
      sender_id: user.id,
      receiver_id: partnerId,
      read: false,
    };

    setMessages((prev) => [...prev, tempMessage]);

    // Scroll to bottom immediately
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 50);

    // Send to database
    const { data, error } = await supabase
      .from("direct_messages")
      .insert({
        sender_id: user.id,
        receiver_id: partnerId,
        message: messageText,
      })
      .select()
      .single();

    if (error) {
      // Remove temp message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
      setNewMessage(messageText);
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
        prev.map((m) => (m.id === tempMessage.id ? (data as Message) : m))
      );
    }

    setSending(false);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.sender_id === user?.id;

    return (
      <View className={`mb-3 ${isOwnMessage ? "items-end" : "items-start"}`}>
        <View
          className={`max-w-[75%] px-4 py-3 rounded-2xl ${
            isOwnMessage
              ? "bg-cyan-500 rounded-br-sm"
              : `${bgCardAlt} rounded-bl-sm`
          }`}
        >
          <Text className={`${isOwnMessage ? "text-white" : textPrimary}`}>
            {item.message}
          </Text>
          <View className="flex-row items-center justify-between mt-1">
            <Text
              className={`text-xs ${
                isOwnMessage ? "text-cyan-100" : textMuted
              }`}
            >
              {formatTime(item.created_at)}
            </Text>
            {isOwnMessage && (
              <Ionicons
                name={item.read ? "checkmark-done" : "checkmark"}
                size={14}
                color={item.read ? "#22d3ee" : "#a5f3fc"}
                style={{ marginLeft: 4 }}
              />
            )}
          </View>
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
      <LogoHeader position="left" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {/* Header */}
        <View className={`${bgCard} px-5 py-4 flex-row items-center border-b ${border}`}>
          <TouchableOpacity className="mr-3" onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#22d3ee" />
          </TouchableOpacity>
          <View className="bg-cyan-500/20 w-10 h-10 rounded-full items-center justify-center mr-3">
            <Text className="text-cyan-400 font-bold">
              {partnerName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text className={`${textPrimary} font-bold text-lg`} numberOfLines={1}>
            {partnerName}
          </Text>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          className="flex-1 px-5 pt-4"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20">
              <Ionicons name="chatbubble-outline" size={60} color="#374151" />
              <Text className={`${textSecondary} mt-4`}>No messages yet</Text>
              <Text className={`${textMuted} text-sm`}>
                Start the conversation!
              </Text>
            </View>
          }
        />

        {/* Input */}
        <View className={`${bgCard} px-5 py-3 border-t ${border}`}>
          <View className="flex-row items-center">
            <TextInput
              className={`flex-1 ${bgInput} ${textPrimary} px-4 py-3 rounded-full mr-3`}
              placeholder="Type a message..."
              placeholderTextColor={placeholderColor}
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              className={`w-12 h-12 rounded-full items-center justify-center ${
                newMessage.trim() && !sending ? "bg-cyan-500" : bgCardAlt
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
                  color={newMessage.trim() ? "#fff" : placeholderColor}
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
