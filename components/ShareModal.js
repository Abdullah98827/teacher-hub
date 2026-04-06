import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Modal,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { useAppTheme } from "../hooks/useAppTheme";
import { useUserRole } from "../hooks/useUserRole";
import { supabase } from "../supabase";
import ProfilePicture from "./ProfilePicture";
import { ThemedText } from "./themed-text";
import UserProfileModal from "./UserProfileModal";

const TABS = ["Subject Teachers", "My Network", "Subject Groups"];

export default function ShareModal({
  visible,
  resourceId,
  resourceTitle,
  subjectId,
  onClose,
}) {
  const router = useRouter();
  const {
    bgCard,
    bgCardAlt,
    border,
    textPrimary,
    textSecondary,
    textMuted,
    bg,
    isDark,
  } = useAppTheme();
  const { role } = useUserRole();
  const isAdmin = role === "admin";

  const [resource, setResource] = useState(null);
  const [subjectTeachers, setSubjectTeachers] = useState([]);
  const [network, setNetwork] = useState([]);
  const [groupChats, setGroupChats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [sharingTo, setSharingTo] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [search, setSearch] = useState("");
  const [shareCount, setShareCount] = useState(0);
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setActiveTab(0);
    setSearch("");
    loadShareData();
  }, [visible, resourceId]);

  const loadShareData = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      // ── Load resource + subject ───────────────────────────────────
      const { data: resourceData } = await supabase
        .from("resources")
        .select("*, subject:subjects(id, name)")
        .eq("id", resourceId)
        .single();

      if (!resourceData) return;
      setResource(resourceData);

      // Share count
      const { count } = await supabase
        .from("resource_shares")
        .select("*", { count: "exact", head: true })
        .eq("resource_id", resourceId);
      setShareCount(count || 0);

      const targetSubjectId = subjectId || resourceData.subject?.id;
      if (!targetSubjectId) {
        setSubjectTeachers([]);
        setGroupChats([]);
      } else {
        // ── SUBJECT TEACHERS ────────────────────────────────────────
        // Find all memberships that contain this subject UUID.
        // subject_ids is a uuid[] column so we use the @> containment
        // operator via .filter("subject_ids", "cs", `{"uuid"}`)
        const { data: membershipData, error: memErr } = await supabase
          .from("memberships")
          .select("id")
          .filter("subject_ids", "cs", `{"${targetSubjectId}"}`)
          .eq("active", true)
          .neq("id", user.id); // exclude self (admin won't be here anyway)

        if (memErr) {
          console.error("Membership query error:", memErr);
          setSubjectTeachers([]);
        } else {
          const teacherIds = (membershipData || []).map((m) => m.id);

          if (teacherIds.length > 0) {
            // Build teachers query
            let teachersQuery = supabase
              .from("teachers")
              .select(
                "id, first_name, last_name, profile_picture_url, verified, followers_count"
              )
              .in("id", teacherIds)
              .order("followers_count", { ascending: false });

            // Normal users only see verified teachers
            if (!isAdmin) {
              teachersQuery = teachersQuery.eq("verified", true);
            }

            const { data: teachers, error: tErr } = await teachersQuery;

            if (tErr) {
              console.error("Teachers query error:", tErr);
              setSubjectTeachers([]);
            } else {
              setSubjectTeachers(teachers || []);
            }
          } else {
            setSubjectTeachers([]);
          }
        }

        // ── GROUP CHATS ─────────────────────────────────────────────
        // Access to group chats = having the subject in your membership.
        // Admin: sees ALL group chats for this subject.
        // Normal user: only group chats for subjects in their membership.
        if (isAdmin) {
          // Admin sees all group chats for this subject
          const { data: allChats, error: chatsErr } = await supabase
            .from("group_chats")
            .select("id, name, description, subject_id")
            .eq("subject_id", targetSubjectId)
            .order("name", { ascending: true });

          if (chatsErr) {
            console.error("Group chats error:", chatsErr);
            setGroupChats([]);
          } else {
            setGroupChats(allChats || []);
          }
        } else {
          // Normal user: check if they have an active membership
          // that includes this subject
          const { data: userMembership, error: userMemErr } = await supabase
            .from("memberships")
            .select("id, subject_ids")
            .eq("id", user.id)
            .eq("active", true)
            .filter("subject_ids", "cs", `{"${targetSubjectId}"}`)
            .maybeSingle();

          if (userMemErr) {
            console.error("User membership check error:", userMemErr);
            setGroupChats([]);
          } else if (!userMembership) {
            // User doesn't have this subject in their membership
            setGroupChats([]);
          } else {
            // User has this subject — show all group chats for it
            const { data: chats, error: chatsErr } = await supabase
              .from("group_chats")
              .select("id, name, description, subject_id")
              .eq("subject_id", targetSubjectId)
              .order("name", { ascending: true });

            if (chatsErr) {
              console.error("Group chats error:", chatsErr);
              setGroupChats([]);
            } else {
              setGroupChats(chats || []);
            }
          }
        }
      }

      // ── MY NETWORK ──────────────────────────────────────────────
      // People I follow + people who follow me, merged and deduped
      const [{ data: followingData }, { data: followerData }] =
        await Promise.all([
          supabase
            .from("follows")
            .select("following_id")
            .eq("follower_id", user.id),
          supabase
            .from("follows")
            .select("follower_id")
            .eq("following_id", user.id),
        ]);

      const followingIds = (followingData || []).map((f) => f.following_id);
      const followerIds = (followerData || []).map((f) => f.follower_id);
      const networkIds = [
        ...new Set([...followingIds, ...followerIds]),
      ].filter((id) => id !== user.id);

      if (networkIds.length > 0) {
        const { data: networkTeachers } = await supabase
          .from("teachers")
          .select(
            "id, first_name, last_name, profile_picture_url, verified, followers_count"
          )
          .in("id", networkIds)
          .order("followers_count", { ascending: false });

        setNetwork(
          (networkTeachers || []).map((t) => ({
            ...t,
            iFollow: followingIds.includes(t.id),
            followsMe: followerIds.includes(t.id),
          }))
        );
      } else {
        setNetwork([]);
      }
    } catch (err) {
      console.error("Error loading share data:", err);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to load share options",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!resourceId) return;
    const shareLink = `teacherhub://resource/${resourceId}`;
    try {
      await Clipboard.setStringAsync(shareLink);
      try {
        await supabase.from("resource_shares").insert({
          resource_id: resourceId,
          shared_by: currentUserId,
          share_method: "link_copy",
        });
        setShareCount((c) => c + 1);
      } catch (_) {}
      Toast.show({
        type: "success",
        text1: "Link Copied!",
        text2: "Share the link via any app",
      });
      onClose();
    } catch (_) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to copy link",
      });
    }
  };

  const handleShareToTeacher = async (teacherId) => {
    if (!resourceId || !currentUserId) return;
    setSharingTo(teacherId);
    try {
      const resourceLink = `teacherhub://resource/${resourceId}`;
      const messageData = {
        type: "resource_share",
        title: resourceTitle,
        resourceId,
        link: resourceLink,
      };

      const { error: msgError } = await supabase
        .from("direct_messages")
        .insert({
          sender_id: currentUserId,
          receiver_id: teacherId,
          message: JSON.stringify(messageData),
          read: false,
        });

      if (msgError) throw msgError;

      try {
        await supabase.from("resource_shares").insert({
          resource_id: resourceId,
          shared_by: currentUserId,
          shared_with: teacherId,
          share_method: "direct_message",
        });
        setShareCount((c) => c + 1);
      } catch (_) {}

      Toast.show({
        type: "success",
        text1: "Shared!",
        text2: "Resource sent via direct message",
      });
      setTimeout(onClose, 800);
    } catch (err) {
      console.error("Share error:", err);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: err.message || "Failed to share resource",
      });
    } finally {
      setSharingTo(null);
    }
  };

  const handleShareToGroupChat = async (groupChatId) => {
    if (!resourceId || !currentUserId) return;
    setSharingTo(groupChatId);
    try {
      const resourceLink = `teacherhub://resource/${resourceId}`;
      const messageData = {
        type: "resource_share",
        title: resourceTitle,
        resourceId,
        link: resourceLink,
      };

      const { error: msgError } = await supabase
        .from("group_messages")
        .insert({
          group_chat_id: groupChatId,
          sender_id: currentUserId,
          message: JSON.stringify(messageData),
        });

      if (msgError) throw msgError;

      try {
        await supabase.from("resource_shares").insert({
          resource_id: resourceId,
          shared_by: currentUserId,
          share_method: "direct_message",
        });
        setShareCount((c) => c + 1);
      } catch (_) {}

      Toast.show({
        type: "success",
        text1: "Shared!",
        text2: "Resource shared with group",
      });
      setTimeout(onClose, 800);
    } catch (err) {
      console.error("Group share error:", err);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: err.message || "Failed to share with group",
      });
    } finally {
      setSharingTo(null);
    }
  };

  const handleTeacherPress = (teacherId) => {
    setSelectedProfileId(teacherId);
    setShowProfileModal(true);
  };

  const getActiveList = () => {
    const q = search.toLowerCase().trim();
    if (activeTab === 0)
      return subjectTeachers.filter(
        (t) =>
          !q || `${t.first_name} ${t.last_name}`.toLowerCase().includes(q)
      );
    if (activeTab === 1)
      return network.filter(
        (t) =>
          !q || `${t.first_name} ${t.last_name}`.toLowerCase().includes(q)
      );
    if (activeTab === 2)
      return groupChats.filter(
        (g) => !q || g.name.toLowerCase().includes(q)
      );
    return [];
  };

  const getEmptyState = () => {
    if (search)
      return {
        icon: "search-outline",
        title: "No results",
        desc: "Try a different search",
      };
    if (activeTab === 0)
      return {
        icon: "school-outline",
        title: "No subject teachers found",
        desc: isAdmin
          ? `No teachers have ${resource?.subject?.name || "this subject"} in their membership`
          : `No other verified teachers in ${resource?.subject?.name || "your subject"} yet`,
      };
    if (activeTab === 1)
      return {
        icon: "people-outline",
        title: "No network yet",
        desc: "Follow teachers or get followers to share with them directly",
      };
    return {
      icon: "chatbubbles-outline",
      title: "No group chats found",
      desc: isAdmin
        ? `No group chats exist for ${resource?.subject?.name || "this subject"}`
        : `You don't have access to any ${resource?.subject?.name || "subject"} group chats`,
    };
  };

  const activeList = getActiveList();
  const emptyState = getEmptyState();
  const inputBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
  const inputBorder = isDark
    ? "rgba(255,255,255,0.1)"
    : "rgba(0,0,0,0.1)";
  const inputColor = isDark ? "#e2e8f0" : "#0f172a";

  const renderTeacherItem = (item) => (
    <View
      className={`${bgCard} rounded-xl p-4 mb-3 border ${border} flex-row items-center`}
    >
      <TouchableOpacity
        className="flex-row items-center flex-1"
        onPress={() => handleTeacherPress(item.id)}
        activeOpacity={0.7}
      >
        <ProfilePicture
          imageUrl={item.profile_picture_url}
          firstName={item.first_name}
          lastName={item.last_name}
          size="sm"
        />
        <View className="flex-1 ml-3">
          <View className="flex-row items-center gap-1 flex-wrap">
            <ThemedText className={`${textPrimary} font-semibold`}>
              {item.first_name} {item.last_name}
            </ThemedText>
            {item.verified && (
              <Ionicons
                name="checkmark-circle"
                size={14}
                color="#22d3ee"
              />
            )}
          </View>
          <View className="flex-row items-center gap-2 mt-0.5 flex-wrap">
            <ThemedText className={`${textSecondary} text-xs`}>
              {item.followers_count || 0}{" "}
              {(item.followers_count || 0) === 1 ? "follower" : "followers"}
            </ThemedText>
            {activeTab === 1 && (
              <>
                {item.iFollow && (
                  <View className="bg-cyan-500/15 px-2 py-0.5 rounded-full">
                    <ThemedText className="text-cyan-400 text-xs">
                      Following
                    </ThemedText>
                  </View>
                )}
                {item.followsMe && (
                  <View className="bg-cyan-500/15 px-2 py-0.5 rounded-full">
                    <ThemedText className="text-cyan-400 text-xs">
                      Follows you
                    </ThemedText>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        className={`py-2 px-4 rounded-lg bg-cyan-600 ml-3 ${
          sharingTo === item.id ? "opacity-50" : ""
        }`}
        onPress={() => handleShareToTeacher(item.id)}
        disabled={sharingTo === item.id}
      >
        {sharingTo === item.id ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <ThemedText className="text-white font-bold text-sm">
            Send
          </ThemedText>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderGroupItem = (item) => (
    <View
      className={`${bgCard} rounded-xl p-4 mb-3 border ${border} flex-row items-center`}
    >
      <View className="bg-cyan-500/20 w-12 h-12 rounded-xl items-center justify-center flex-shrink-0">
        <Ionicons name="people" size={22} color="#22d3ee" />
      </View>
      <View className="flex-1 ml-3">
        <ThemedText className={`${textPrimary} font-semibold`}>
          {item.name}
        </ThemedText>
        <ThemedText
          className={`${textSecondary} text-xs mt-0.5`}
          numberOfLines={1}
        >
          {item.description || "Group chat"}
        </ThemedText>
      </View>
      <TouchableOpacity
        className={`py-2 px-4 rounded-lg bg-cyan-600 ml-3 ${
          sharingTo === item.id ? "opacity-50" : ""
        }`}
        onPress={() => handleShareToGroupChat(item.id)}
        disabled={sharingTo === item.id}
      >
        {sharingTo === item.id ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <ThemedText className="text-white font-bold text-sm">
            Share
          </ThemedText>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent={false}
        onRequestClose={onClose}
      >
        <SafeAreaView className={`flex-1 ${bg}`} edges={["top"]}>
         {/* ── Header ──────────────────────────────────────────── */}
<View className={`${bgCard} px-4 pb-3 border-b ${border}`} style={{ paddingTop: 16 }}>
  {/* Top row: icon + title + close */}
  <View className="flex-row items-center mb-3">
    <View className="bg-cyan-600/20 w-9 h-9 rounded-full items-center justify-center mr-3">
      <Ionicons name="share-social" size={18} color="#22d3ee" />
    </View>
    <View className="flex-1">
      <ThemedText className="text-cyan-400 font-bold text-base" numberOfLines={1}>
        Share Resource
      </ThemedText>
      <ThemedText className={`${textMuted} text-xs`} numberOfLines={1}>
        {resource?.subject?.name
          ? `${resource.subject.name}${shareCount > 0 ? ` · Shared ${shareCount}x` : ""}`
          : "Loading..."}
      </ThemedText>
    </View>
    {/* Close button — bigger tap target */}
    <TouchableOpacity
      onPress={onClose}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      style={{ padding: 4 }}
    >
      <Ionicons name="close-circle" size={28} color="#22d3ee" />
    </TouchableOpacity>
  </View>

  {/* Resource title pill */}
  <View className={`${bgCardAlt} rounded-xl px-3 py-2 mb-3 flex-row items-center gap-2`}>
    <Ionicons name="document-text-outline" size={15} color="#22d3ee" />
    <ThemedText className={`${textSecondary} text-sm flex-1`} numberOfLines={1}>
      {resourceTitle}
    </ThemedText>
  </View>

  {/* Copy link */}
  <TouchableOpacity
    className="bg-cyan-600 rounded-xl py-2.5 flex-row items-center justify-center gap-2"
    onPress={handleCopyLink}
  >
    <Ionicons name="link-outline" size={17} color="#fff" />
    <ThemedText className="text-white font-bold text-sm">
      Copy Share Link
    </ThemedText>
  </TouchableOpacity>
</View>

          {/* ── Tabs ────────────────────────────────────────────── */}
          <View className={`flex-row ${bgCard} border-b ${border}`}>
            {TABS.map((tab, i) => {
              const count =
                i === 0
                  ? subjectTeachers.length
                  : i === 1
                  ? network.length
                  : groupChats.length;
              return (
                <TouchableOpacity
                  key={tab}
                  className={`flex-1 py-3 items-center border-b-2 ${
                    activeTab === i
                      ? "border-cyan-400"
                      : "border-transparent"
                  }`}
                  onPress={() => {
                    setActiveTab(i);
                    setSearch("");
                  }}
                >
                  <ThemedText
                    className={`text-xs font-semibold ${
                      activeTab === i ? "text-cyan-400" : textMuted
                    }`}
                    numberOfLines={1}
                  >
                    {tab}
                  </ThemedText>
                  <ThemedText
                    className={`text-xs mt-0.5 ${
                      activeTab === i ? "text-cyan-400" : textMuted
                    }`}
                  >
                    {count}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── List ────────────────────────────────────────────── */}
          {loading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#22d3ee" />
            </View>
          ) : (
            <FlatList
              data={activeList}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
              ListHeaderComponent={
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: inputBg,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: inputBorder,
                    paddingHorizontal: 12,
                    marginBottom: 16,
                    gap: 8,
                  }}
                >
                  <Ionicons
                    name="search-outline"
                    size={16}
                    color="#9CA3AF"
                  />
                  <TextInput
                    placeholder={
                      activeTab === 2
                        ? "Search groups..."
                        : "Search teachers..."
                    }
                    placeholderTextColor="#9CA3AF"
                    value={search}
                    onChangeText={setSearch}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      fontSize: 14,
                      color: inputColor,
                    }}
                  />
                  {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch("")}>
                      <Ionicons
                        name="close-circle"
                        size={16}
                        color="#9CA3AF"
                      />
                    </TouchableOpacity>
                  )}
                </View>
              }
              renderItem={({ item }) =>
                activeTab === 2
                  ? renderGroupItem(item)
                  : renderTeacherItem(item)
              }
              ListEmptyComponent={
                <View className="items-center justify-center py-12">
                  <View className="bg-cyan-500/10 w-16 h-16 rounded-full items-center justify-center mb-3">
                    <Ionicons
                      name={emptyState.icon}
                      size={32}
                      color="#22d3ee"
                    />
                  </View>
                  <ThemedText
                    className={`${textPrimary} font-semibold text-base mb-1 text-center`}
                  >
                    {emptyState.title}
                  </ThemedText>
                  <ThemedText
                    className={`${textMuted} text-sm text-center px-8`}
                  >
                    {emptyState.desc}
                  </ThemedText>
                </View>
              }
            />
          )}
        </SafeAreaView>
        <Toast />
      </Modal>

      {/* Profile modal opened by tapping a teacher */}
      <UserProfileModal
        visible={showProfileModal}
        userId={selectedProfileId}
        onClose={() => {
          setShowProfileModal(false);
          setSelectedProfileId(null);
        }}
        onNavigateToPath={(path) => {
          setShowProfileModal(false);
          setSelectedProfileId(null);
          onClose();
          setTimeout(() => router.push(path), 350);
        }}
      />
    </>
  );
}