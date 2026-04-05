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
import ConfirmModal from "../../components/ConfirmModal";
import ScreenWrapper from "../../components/ScreenWrapper";
import { ThemedText } from '../../components/themed-text';
import { useAuth } from "../../contexts/AuthContext";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useUserRole } from "../../hooks/useUserRole";
import { supabase } from "../../supabase";
import { logEvent } from "../../utils/logging";

export default function GroupChatScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const { role } = useUserRole();
  const router = useRouter();

  const [groupChat, setGroupChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState(null);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [userProfilePic, setUserProfilePic] = useState(null);
  const [userFirstName, setUserFirstName] = useState("");
  const [userLastName, setUserLastName] = useState("");
  const flatListRef = useRef(null);

  const isAdmin = role === "admin";

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

  const fetchGroupChat = useCallback(async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from("group_chats")
      .select("id, name, description")
      .eq("id", id)
      .single();

    if (error || !data) {
      Toast.show({ type: "error", text1: "Group not found" });
      router.back();
      return;
    }

    setGroupChat(data);
  }, [id, router]);

  const fetchMessages = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("group_messages")
      .select("id, message, created_at, sender:teachers(id, first_name, last_name, profile_picture_url)")
      .eq("group_chat_id", id)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    if (error) {
      Toast.show({ type: "error", text1: "Failed to load messages" });
      setLoading(false);
      return;
    }

    setMessages(data || []);
    setLoading(false);
  }, [id]);

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
        console.log("User ID:", user.id);
      }
    } catch (err) {
      console.error("Exception fetching user profile picture:", err);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchGroupChat();
    fetchMessages();
    fetchUserProfilePic();

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
          const { data: sender } = await supabase
            .from("teachers")
            .select("id, first_name, last_name, profile_picture_url")
            .eq("id", payload.new.sender_id)
            .single();

          const newMsg = {
            ...payload.new,
            sender: sender || { id: "", first_name: "Unknown", last_name: "" },
          };

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
          setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, fetchGroupChat, fetchMessages, fetchUserProfilePic]);

  const deleteMessage = (messageId) => {
    if (!isAdmin) return;
    setPendingDeleteId(messageId);
  };

  const confirmDeleteMessage = async () => {
    if (!pendingDeleteId) return;
    setDeletingMessageId(pendingDeleteId);
    setPendingDeleteId(null);

    const { error } = await supabase
      .from("group_messages")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user?.id,
      })
      .eq("id", pendingDeleteId);

    if (error) {
      logEvent({
        event_type: "GROUP_MESSAGE_DELETE_FAILED",
        user_id: user?.id,
        target_id: pendingDeleteId,
        target_table: "group_messages",
        details: { error: error.message, group_chat_id: id },
      });
      Toast.show({
        type: "error",
        text1: "Failed to delete message",
        text2: "Something went wrong. Please try again.",
      });
    } else {
      logEvent({
        event_type: "GROUP_MESSAGE_DELETED",
        user_id: user?.id,
        target_id: pendingDeleteId,
        target_table: "group_messages",
        details: { group_chat_id: id },
      });
      Toast.show({ type: "success", text1: "Message deleted" });
      setMessages((prev) => prev.filter((m) => m.id !== pendingDeleteId));
    }

    setDeletingMessageId(null);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user?.id || !id) return;

    setSending(true);
    const messageText = newMessage.trim();
    setNewMessage("");

    const { data: currentUser } = await supabase
      .from("teachers")
      .select("id, first_name, last_name")
      .eq("id", user.id)
      .single();

    const tempMessage = {
      id: `temp-${Date.now()}`,
      message: messageText,
      created_at: new Date().toISOString(),
      sender: currentUser || { id: user.id, first_name: "You", last_name: "" },
    };

    setMessages((prev) => [...prev, tempMessage]);

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 50);

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
      setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
      setNewMessage(messageText);
      logEvent({
        event_type: "GROUP_MESSAGE_SEND_FAILED",
        user_id: user?.id,
        target_id: id,
        target_table: "group_chats",
        details: { error: error.message },
      });
      Toast.show({ type: "error", text1: "Failed to send message" });
      setSending(false);
      return;
    }

    logEvent({
      event_type: "GROUP_MESSAGE_SENT",
      user_id: user?.id,
      target_id: id,
      target_table: "group_chats",
    });

    if (data) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempMessage.id
            ? { ...data, sender: tempMessage.sender }
            : m
        )
      );
    }

    setSending(false);
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const renderMessage = ({ item }) => {
    const isOwnMessage = item.sender.id === user?.id;
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

    return (
      <View className={`mb-3 ${isOwnMessage ? "items-end" : "items-start"}`}>
        {!isOwnMessage && (
          <View className="flex-row items-center gap-2 mb-1 ml-2">
            <ProfilePicture
              imageUrl={item.sender.profile_picture_url}
              firstName={item.sender.first_name}
              lastName={item.sender.last_name}
              customSize={24}
            />
            <TouchableOpacity 
              onPress={() => {
                setSelectedUserId(item.sender.id);
                setShowProfileModal(true);
              }}
            >
              <ThemedText className="text-cyan-400 text-xs font-semibold">
                {item.sender.first_name}
              </ThemedText>
            </TouchableOpacity>
          </View>
        )}
        <View className="flex-row items-end gap-2">
          {!isOwnMessage && (
            <ProfilePicture
              imageUrl={item.sender.profile_picture_url}
              firstName={item.sender.first_name}
              lastName={item.sender.last_name}
              size="sm"
            />
          )}

          {isResourceShare && resourceData ? (
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
          ) : (
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
          )}

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
          {!isOwnMessage && isAdmin && (
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
        <View className={`${bgCard} px-5 py-4 flex-row items-center border-b ${border}`}>
          <TouchableOpacity className="mr-3" onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#22d3ee" />
          </TouchableOpacity>
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <ThemedText className={`${textPrimary} font-bold text-lg`} numberOfLines={1}>
                {groupChat?.name}
              </ThemedText>
              {isAdmin && (
                <View className="bg-purple-500/20 px-2 py-0.5 rounded">
                  <ThemedText className="text-purple-400 text-xs font-bold">MOD</ThemedText>
                </View>
              )}
            </View>
            {groupChat?.description && (
              <ThemedText className={`${textSecondary} text-xs`} numberOfLines={1}>
                {groupChat.description}
              </ThemedText>
            )}
          </View>
        </View>

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
              <Ionicons name="chatbubbles-outline" size={60} color="#374151" />
              <ThemedText className={`${textSecondary} mt-4`}>No messages yet</ThemedText>
              <ThemedText className={`${textMuted} text-sm`}>
                Be the first to say something!
              </ThemedText>
            </View>
          }
        />

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

      <ConfirmModal
        visible={!!pendingDeleteId}
        title="Delete Message"
        message="Are you sure you want to delete this message? This action cannot be undone."
        confirmText="Delete"
        confirmColor="bg-red-600"
        isProcessing={!!deletingMessageId}
        onConfirm={confirmDeleteMessage}
        onCancel={() => setPendingDeleteId(null)}
      />

      <UserProfileModal 
        visible={showProfileModal}
        userId={selectedUserId}
        onClose={() => setShowProfileModal(false)}
      />

      <Toast />
    </ScreenWrapper>
  );
}
