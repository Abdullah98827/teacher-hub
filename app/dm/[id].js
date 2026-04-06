import LogoHeader from "@/components/logoHeader";
import ProfilePicture from "@/components/ProfilePicture";
import UserProfileModal from "@/components/UserProfileModal";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import Toast from "react-native-toast-message";
import ScreenWrapper from "../../components/ScreenWrapper";
import { ThemedText } from '../../components/themed-text';
import { useAuth } from "../../contexts/AuthContext";
import { useAppTheme } from "../../hooks/useAppTheme";
import { supabase } from "../../supabase";
import { logEvent } from "../../utils/logging";

export default function DMChatScreen() {
  const { id: partnerId } = useLocalSearchParams();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const {
    bgCard,
    bgCardAlt,
    bgInput,
    border,
    textPrimary,
    textMuted,
    placeholderColor,
  } = useAppTheme();

  const [partnerName, setPartnerName] = useState("Loading...");
  const [partnerProfilePic, setPartnerProfilePic] = useState(null);
  const [partnerLastName, setPartnerLastName] = useState("");
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userProfilePic, setUserProfilePic] = useState(null);
  const [userFirstName, setUserFirstName] = useState("");
  const [userLastName, setUserLastName] = useState("");
  const flatListRef = useRef(null);

  // ── Fetch partner name ────────────────────────────────────────────────────
  const fetchPartnerInfo = useCallback(async () => {
    if (!partnerId) return;
    
    try {
      const { data, error } = await supabase
        .from("teachers")
        .select("first_name, last_name, profile_picture_url")
        .eq("id", partnerId)
        .single();

      if (data) {
        setPartnerName(data.first_name);
        setPartnerLastName(data.last_name);
        setPartnerProfilePic(data.profile_picture_url);
        return;
      }

      // If not found, log error but allow the chat to continue
      if (error) {
        console.warn("Error fetching partner info:", error);
        // Use a generic name instead of showing error
        setPartnerName("User");
        setPartnerLastName("");
        setPartnerProfilePic(null);
      }
    } catch (err) {
      console.error("Exception fetching partner info:", err);
      setPartnerName("User");
      setPartnerLastName("");
      setPartnerProfilePic(null);
    }
  }, [partnerId]);

  // ── Fetch current user profile picture ─────────────────────────────────────
  const fetchUserProfilePic = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from("teachers")
        .select("profile_picture_url, first_name, last_name")
        .eq("id", user.id)
        .single();

      if (data) {
        setUserProfilePic(data.profile_picture_url || null);
        setUserFirstName(data.first_name || "");
        setUserLastName(data.last_name || "");
      }

      if (error) {
        console.warn("Error fetching user profile picture:", error);
      }
    } catch (err) {
      console.error("Exception fetching user profile picture:", err);
    }
  }, [user?.id]);

  // ── Fetch messages (only once user is ready) ─────────────────────────────
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
      Toast.show({ type: "error", text1: "Failed to load messages" });
      setLoading(false);
      return;
    }

    setMessages(data || []);
    setLoading(false);

    // Mark incoming messages as read
    await supabase
      .from("direct_messages")
      .update({ read: true, read_at: new Date().toISOString() })
      .eq("receiver_id", user.id)
      .eq("sender_id", partnerId)
      .eq("read", false);
  }, [partnerId, user?.id]);

  // ── Run fetches once auth is resolved ────────────────────────────────────
  useEffect(() => {
    if (authLoading) return; // wait for auth to resolve
    fetchPartnerInfo();
    fetchUserProfilePic();
    fetchMessages();
  }, [authLoading, fetchPartnerInfo, fetchUserProfilePic, fetchMessages]);

  // ── Realtime subscription (only subscribe once user.id is known) ─────────
  useEffect(() => {
    if (!user?.id || !partnerId) return;

    const channel = supabase
      .channel(`dm_${user.id}_${partnerId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          if (
            payload.new.sender_id === partnerId ||
            payload.new.receiver_id === partnerId
          ) {
            setMessages((prev) => [...prev, payload.new]);
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
  }, [user?.id, partnerId]);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!newMessage.trim() || !user?.id || !partnerId) return;

    setSending(true);
    const messageText = newMessage.trim();
    setNewMessage("");

    const tempMessage = {
      id: `temp-${Date.now()}`,
      message: messageText,
      created_at: new Date().toISOString(),
      sender_id: user.id,
      receiver_id: partnerId,
      read: false,
    };

    setMessages((prev) => [...prev, tempMessage]);
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 50);

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
      setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
      setNewMessage(messageText);
      logEvent({
        event_type: "DM_SEND_FAILED",
        user_id: user.id,
        target_id: partnerId,
        target_table: "teachers",
        details: { error: error.message },
      });
      Toast.show({ type: "error", text1: "Failed to send message" });
      setSending(false);
      return;
    }

    logEvent({
      event_type: "DM_SENT",
      user_id: user.id,
      target_id: partnerId,
      target_table: "teachers",
    });

    if (data) {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempMessage.id ? data : m))
      );
    }
    setSending(false);
  };

  // ── Delete message ────────────────────────────────────────────────────────
  const deleteMessage = async (messageId) => {
    setDeletingMessageId(messageId);
    try {
      const { error } = await supabase
        .from("direct_messages")
        .delete()
        .eq("id", messageId);

      if (error) throw error;

      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      Toast.show({
        type: "success",
        text1: "Message deleted",
      });
      logEvent({
        event_type: "DM_DELETED",
        user_id: user?.id,
        target_id: partnerId,
        target_table: "teachers",
      });
    } catch (err) {
      console.error("Error deleting message:", err);
      Toast.show({
        type: "error",
        text1: "Failed to delete message",
      });
      logEvent({
        event_type: "DM_DELETE_FAILED",
        user_id: user?.id,
        target_id: partnerId,
        target_table: "teachers",
        details: { error: err.message },
      });
    } finally {
      setDeletingMessageId(null);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const renderMessage = ({ item }) => {
    const isOwnMessage = item.sender_id === user?.id;
    const isDeleting = deletingMessageId === item.id;
    
    // Try to parse as resource share message (new JSON format)
    let isResourceShare = false;
    let resourceData = null;
    try {
      const parsed = JSON.parse(item.message);
      if (parsed.type === "resource_share" && parsed.resourceId && parsed.link) {
        isResourceShare = true;
        resourceData = parsed;
      }
    } catch (_) {
      // Not JSON, check if it's old format resource message
      // Old format: "📚 Check out: RESOURCE_NAME\n\nteacherhub://resource/..."
      if (item.message && item.message.includes("teacherhub://resource/")) {
        isResourceShare = true;
        // Extract title from old format
        const titleMatch = item.message.match(/Check out:?\s*"?([^"]+)"?/i);
        const linkMatch = item.message.match(/teacherhub:\/\/resource\/([a-f0-9\-]+)/);
        if (linkMatch) {
          resourceData = {
            title: titleMatch ? titleMatch[1].trim() : "Shared Resource",
            resourceId: linkMatch[1],
            link: `teacherhub://resource/${linkMatch[1]}`,
          };
        }
      }
    }
    
    const handleResourcePress = () => {
      if (resourceData && resourceData.resourceId) {
        router.push(`/(tabs)/resources?openResourceId=${resourceData.resourceId}`);
      }
    };

    if (isResourceShare && resourceData) {
      return (
        <View className={`mb-3 flex-row gap-2 items-end ${isOwnMessage ? "justify-end" : "justify-start"}`}>
          {!isOwnMessage && (
            <ProfilePicture
              imageUrl={partnerProfilePic}
              firstName={partnerName}
              lastName={partnerLastName}
              size="sm"
            />
          )}

          <TouchableOpacity
            onPress={handleResourcePress}
            activeOpacity={0.6}
            className="max-w-[70%]"
          >
            <View
              className={`rounded-lg px-3 py-3 ${
                isOwnMessage
                  ? "bg-cyan-500"
                  : bgCardAlt
              }`}
            >
              <View className="flex-row items-center gap-2 mb-2">
                <Ionicons
                  name="share-social"
                  size={16}
                  color={isOwnMessage ? "#e0f2fe" : "#22d3ee"}
                />
                <ThemedText 
                  className={`text-xs font-semibold ${isOwnMessage ? "text-cyan-50" : "text-cyan-400"}`}
                >
                  {isOwnMessage ? "You shared" : "Shared with you"}
                </ThemedText>
              </View>
              <ThemedText 
                className={`text-sm font-medium ${isOwnMessage ? "text-white" : textPrimary}`}
                numberOfLines={3}
              >
                {resourceData.title}
              </ThemedText>
              <ThemedText
                className={`text-xs mt-2 ${isOwnMessage ? "text-cyan-100" : textMuted}`}
              >
                {formatTime(item.created_at)}
              </ThemedText>
            </View>
          </TouchableOpacity>

          {isOwnMessage && (
            <TouchableOpacity
              onPress={() => deleteMessage(item.id)}
              disabled={isDeleting}
              className="mb-1"
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#ef4444" />
              ) : (
                <Ionicons name="trash-outline" size={16} color="#ef4444" />
              )}
            </TouchableOpacity>
          )}
          {isOwnMessage && (
            <ProfilePicture
              imageUrl={userProfilePic}
              firstName={userFirstName}
              lastName={userLastName}
              size="sm"
            />
          )}
        </View>
      );
    }

    // Regular text message
    return (
      <View className={`mb-2 flex-row gap-2 items-end ${isOwnMessage ? "justify-end" : "justify-start"}`}>
        {!isOwnMessage && (
          <ProfilePicture
            imageUrl={partnerProfilePic}
            firstName={partnerName}
            lastName={partnerLastName}
            size="sm"
          />
        )}

        <View
          className={`max-w-[70%] px-4 py-3 rounded-2xl ${
            isOwnMessage
              ? "bg-cyan-500"
              : bgCardAlt
          }`}
        >
          <ThemedText className={`${isOwnMessage ? "text-white" : textPrimary} text-base leading-6`}>
            {item.message}
          </ThemedText>
          <ThemedText
            className={`text-xs mt-1 ${isOwnMessage ? "text-cyan-100" : textMuted}`}
          >
            {formatTime(item.created_at)}
          </ThemedText>
        </View>

        {isOwnMessage && (
          <TouchableOpacity
            onPress={() => deleteMessage(item.id)}
            disabled={isDeleting}
            className="mb-1"
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#ef4444" />
            ) : (
              <Ionicons name="trash-outline" size={16} color="#ef4444" />
            )}
          </TouchableOpacity>
        )}
        {isOwnMessage && (
          <ProfilePicture
            imageUrl={userProfilePic}
            firstName={userFirstName}
            lastName={userLastName}
            size="sm"
          />
        )}
      </View>
    );
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (authLoading || loading) {
    return (
      <ScreenWrapper>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#22d3ee" />
        </View>
      </ScreenWrapper>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <ScreenWrapper>
      <LogoHeader position="left" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* Header bar */}
        <View
          className={`${bgCard} px-5 py-4 flex-row items-center border-b ${border}`}
        >
          <TouchableOpacity className="mr-3" onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#22d3ee" />
          </TouchableOpacity>
          <ProfilePicture
            imageUrl={partnerProfilePic}
            firstName={partnerName}
            lastName={partnerLastName}
            size="md"
          />
          <TouchableOpacity 
            className="flex-1 ml-3"
            onPress={() => setShowProfileModal(true)}
          >
            <ThemedText
              className={`${textPrimary} font-bold text-lg`}
              numberOfLines={1}
            >
              {partnerName}
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Messages list */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          className="flex-1 px-4 pt-3"
          contentContainerStyle={{ paddingBottom: 12 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20">
              <View className="bg-cyan-500/10 w-20 h-20 rounded-full items-center justify-center mb-4">
                <Ionicons name="chatbubble-outline" size={50} color="#22d3ee" />
              </View>
              <ThemedText className={`${textPrimary} font-semibold text-lg`}>No messages yet</ThemedText>
              <ThemedText className={`${textMuted} text-sm text-center px-8 mt-2`}>
                Start the conversation!
              </ThemedText>
            </View>
          }
        />

        {/* Input bar */}
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
      <UserProfileModal 
        visible={showProfileModal}
        userId={partnerId}
        onClose={() => setShowProfileModal(false)}
      />
      <Toast />
    </ScreenWrapper>
  );
}
