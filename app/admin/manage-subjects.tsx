import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import AccessToggle from "../../components/AccessToggle";
import AdminHeader from "../../components/AdminHeader";
import ScreenWrapper from "../../components/ScreenWrapper";
import SubjectCard from "../../components/SubjectCard";
import SubscribersModal from "../../components/SubscribersModal";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useUserRole } from "../../hooks/useUserRole";
import { supabase } from "../../supabase";

interface SubjectWithGroupChat {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  is_public: boolean;
  groupChat: {
    id: string;
    name: string;
    description: string | null;
    is_public: boolean;
  } | null;
  subscriberCount: number;
  messageCount: number;
  deletedMessageCount: number;
}

interface Subscriber {
  id: string;
  full_name: string;
  email: string;
}

export default function AdminSubjectManagementScreen() {
  const { role, loading: roleLoading } = useUserRole();
  const router = useRouter();

  const {
    bgCard,
    bgCardAlt,
    bgInput,
    border,
    textPrimary,
    textSecondary,
    textMuted,
  } = useAppTheme();

  // State
  const [subjects, setSubjects] = useState<SubjectWithGroupChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Subscribers modal state
  const [showSubscribersModal, setShowSubscribersModal] = useState(false);
  const [selectedSubject, setSelectedSubject] =
    useState<SubjectWithGroupChat | null>(null);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loadingSubscribers, setLoadingSubscribers] = useState(false);

  // Create/Edit modal state
  const [showModal, setShowModal] = useState(false);
  const [editingSubject, setEditingSubject] =
    useState<SubjectWithGroupChat | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    groupChatDescription: "",
    isSubjectPublic: false,
    isGroupChatPublic: false,
  });
  const [saving, setSaving] = useState(false);

  const isAdmin = role === "admin";

  // Access control
  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      Toast.show({
        type: "error",
        text1: "Access Denied",
        text2: "Admin privileges required",
      });
      router.back();
    }
  }, [isAdmin, roleLoading, router]);

  // Fetch subjects
  const fetchSubjects = useCallback(async () => {
    if (!isAdmin) return;

    try {
      const { data: subjectsData, error } = await supabase
        .from("subjects")
        .select("id, name, description, created_at, is_public")
        .order("name");

      if (error) throw error;

      const subjectsWithStats = await Promise.all(
        (subjectsData || []).map(async (subject) => {
          const { data: groupChat } = await supabase
            .from("group_chats")
            .select("id, name, description, is_public")
            .eq("subject_id", subject.id)
            .single();

          let subscriberCount = 0;
          if (subject.is_public) {
            const { count } = await supabase
              .from("teachers")
              .select("id", { count: "exact", head: true })
              .eq("verified", true)
              .eq("approved", true);
            subscriberCount = count || 0;
          } else {
            const { data: allMemberships } = await supabase
              .from("memberships")
              .select("subject_ids")
              .eq("active", true);

            if (allMemberships) {
              subscriberCount = allMemberships.filter(
                (membership) =>
                  membership.subject_ids &&
                  membership.subject_ids.includes(subject.id)
              ).length;
            }
          }

          let messageCount = 0;
          let deletedMessageCount = 0;
          if (groupChat) {
            const { count: msgCount } = await supabase
              .from("group_messages")
              .select("*", { count: "exact", head: true })
              .eq("group_chat_id", groupChat.id)
              .is("deleted_at", null);

            const { count: delCount } = await supabase
              .from("group_messages")
              .select("*", { count: "exact", head: true })
              .eq("group_chat_id", groupChat.id)
              .not("deleted_at", "is", null);

            messageCount = msgCount || 0;
            deletedMessageCount = delCount || 0;
          }

          return {
            ...subject,
            groupChat: groupChat || null,
            subscriberCount,
            messageCount,
            deletedMessageCount,
          };
        })
      );

      setSubjects(subjectsWithStats);
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Failed to load subjects",
        text2: error.message,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!roleLoading && isAdmin) {
      fetchSubjects();
    }
  }, [fetchSubjects, roleLoading, isAdmin]);

  // Fetch subscribers
  const fetchSubscribers = async (subject: SubjectWithGroupChat) => {
    setLoadingSubscribers(true);
    try {
      if (subject.is_public) {
        const { data, error } = await supabase
          .from("teachers")
          .select("id, first_name, last_name, email")
          .eq("verified", true)
          .eq("approved", true)
          .order("first_name");

        if (error) throw error;

        const teachersWithFullName = (data || []).map((t: any) => ({
          id: t.id,
          full_name:
            `${t.first_name || ""} ${t.last_name || ""}`.trim() || "Unknown",
          email: t.email || "No email",
        }));

        setSubscribers(teachersWithFullName);
      } else {
        const { data: memberships, error: memberError } = await supabase
          .from("memberships")
          .select("id, subject_ids")
          .eq("active", true);

        if (memberError) throw memberError;

        const subscribedUserIds = (memberships || [])
          .filter((m) => m.subject_ids && m.subject_ids.includes(subject.id))
          .map((m) => m.id);

        if (subscribedUserIds.length > 0) {
          const { data: teachers, error: teacherError } = await supabase
            .from("teachers")
            .select("id, first_name, last_name, email")
            .in("id", subscribedUserIds)
            .order("first_name");

          if (teacherError) throw teacherError;

          const teachersWithFullName = (teachers || []).map((t: any) => ({
            id: t.id,
            full_name:
              `${t.first_name || ""} ${t.last_name || ""}`.trim() || "Unknown",
            email: t.email || "No email",
          }));

          setSubscribers(teachersWithFullName);
        } else {
          setSubscribers([]);
        }
      }
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Failed to load subscribers",
        text2: error.message,
      });
    } finally {
      setLoadingSubscribers(false);
    }
  };

  // Handlers
  const handleViewSubscribers = (subject: SubjectWithGroupChat) => {
    setSelectedSubject(subject);
    setShowSubscribersModal(true);
    fetchSubscribers(subject);
  };

  const openCreateModal = () => {
    setEditingSubject(null);
    setFormData({
      name: "",
      description: "",
      groupChatDescription: "",
      isSubjectPublic: false,
      isGroupChatPublic: false,
    });
    setShowModal(true);
  };

  const openEditModal = (subject: SubjectWithGroupChat) => {
    setEditingSubject(subject);
    setFormData({
      name: subject.name,
      description: subject.description || "",
      groupChatDescription: subject.groupChat?.description || "",
      isSubjectPublic: subject.is_public,
      isGroupChatPublic: subject.groupChat?.is_public || false,
    });
    setShowModal(true);
  };

  const handleSaveSubject = async () => {
    if (!formData.name.trim()) {
      Toast.show({
        type: "error",
        text1: "Subject name is required",
      });
      return;
    }

    setSaving(true);

    try {
      if (!editingSubject) {
        const { data: existingSubject } = await supabase
          .from("subjects")
          .select("id, name")
          .ilike("name", formData.name.trim())
          .single();

        if (existingSubject) {
          Toast.show({
            type: "error",
            text1: "Subject already exists",
            text2: `A subject named "${existingSubject.name}" already exists`,
          });
          setSaving(false);
          return;
        }
      }

      if (editingSubject) {
        const { error: subjectError } = await supabase
          .from("subjects")
          .update({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            is_public: formData.isSubjectPublic,
          })
          .eq("id", editingSubject.id);

        if (subjectError) throw subjectError;

        if (editingSubject.groupChat) {
          const { error: groupError } = await supabase
            .from("group_chats")
            .update({
              name: `${formData.name.trim()} Teachers Chat`,
              description:
                formData.groupChatDescription.trim() ||
                `Group chat for all ${formData.name.trim()} teachers`,
              is_public: formData.isGroupChatPublic,
            })
            .eq("id", editingSubject.groupChat.id);

          if (groupError) throw groupError;
        } else {
          const { error: groupError } = await supabase
            .from("group_chats")
            .insert({
              subject_id: editingSubject.id,
              name: `${formData.name.trim()} Teachers Chat`,
              description:
                formData.groupChatDescription.trim() ||
                `Group chat for all ${formData.name.trim()} teachers`,
              is_public: formData.isGroupChatPublic,
            });

          if (groupError) throw groupError;
        }

        Toast.show({
          type: "success",
          text1: "Subject updated successfully",
        });
      } else {
        const { data: newSubject, error: subjectError } = await supabase
          .from("subjects")
          .insert({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            is_public: formData.isSubjectPublic,
          })
          .select()
          .single();

        if (subjectError) throw subjectError;

        const { error: groupError } = await supabase
          .from("group_chats")
          .insert({
            subject_id: newSubject.id,
            name: `${formData.name.trim()} Teachers Chat`,
            description:
              formData.groupChatDescription.trim() ||
              `Group chat for all ${formData.name.trim()} teachers`,
            is_public: formData.isGroupChatPublic,
          });

        if (groupError) throw groupError;

        Toast.show({
          type: "success",
          text1: "Subject & group chat created successfully",
        });
      }

      setShowModal(false);
      fetchSubjects();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: editingSubject ? "Failed to update" : "Failed to create",
        text2: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSubject = (subject: SubjectWithGroupChat) => {
    const warnings = [];
    if (subject.subscriberCount > 0 && !subject.is_public) {
      warnings.push(`${subject.subscriberCount} teacher(s) are subscribed`);
    }
    if (subject.messageCount > 0) {
      warnings.push(`${subject.messageCount} message(s) will be lost`);
    }

    const warningText =
      warnings.length > 0 ? `\n\nWarning:\n• ${warnings.join("\n• ")}` : "";

    Alert.alert(
      "Delete Subject & Group Chat",
      `Are you sure you want to permanently delete:\n\n` +
        `Subject: "${subject.name}"\n` +
        `Group Chat: "${subject.groupChat?.name || "N/A"}"\n` +
        `All messages and data` +
        warningText +
        `\n\nThis action CANNOT be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Everything",
          style: "destructive",
          onPress: async () => {
            setDeletingId(subject.id);

            try {
              if (subject.groupChat) {
                await supabase
                  .from("group_messages")
                  .delete()
                  .eq("group_chat_id", subject.groupChat.id);

                await supabase
                  .from("group_chats")
                  .delete()
                  .eq("id", subject.groupChat.id);
              }

              await supabase.from("subjects").delete().eq("id", subject.id);

              Toast.show({
                type: "success",
                text1: "Subject & group chat deleted",
                text2: "All associated data has been removed",
              });

              setSubjects((prev) => prev.filter((s) => s.id !== subject.id));
            } catch (error: any) {
              Toast.show({
                type: "error",
                text1: "Failed to delete",
                text2: error.message,
              });
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  // Loading states
  if (loading || roleLoading) {
    return (
      <ScreenWrapper>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#22d3ee" />
        </View>
      </ScreenWrapper>
    );
  }

  if (!isAdmin) return null;

  // Calculate stats
  const publicSubjectCount = subjects.filter((s) => s.is_public).length;
  const hasPublicSubjects = publicSubjectCount > 0;

  const publicCount = hasPublicSubjects
    ? subjects.find((s) => s.is_public)?.subscriberCount || 0
    : 0;
  const privateCount = subjects
    .filter((s) => !s.is_public)
    .reduce((sum, s) => sum + s.subscriberCount, 0);

  const totalSubscribers = hasPublicSubjects ? publicCount : privateCount;
  const totalMessages = subjects.reduce((sum, s) => sum + s.messageCount, 0);
  const totalDeleted = subjects.reduce(
    (sum, s) => sum + s.deletedMessageCount,
    0
  );

  return (
    <ScreenWrapper>
      <View className="flex-1 px-5 pt-4">
        <AdminHeader
          title="Subjects & Chats"
          subtitle={`${subjects.length} subject${subjects.length !== 1 ? "s" : ""} with group chats`}
        />

        <TouchableOpacity
          className="absolute top-4 right-5 bg-cyan-500 w-12 h-12 rounded-full items-center justify-center z-10"
          onPress={openCreateModal}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>

        {/* Stats Summary */}
        <View
          className={`bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-xl p-4 mb-4 border border-cyan-500/20`}
        >
          <View className="flex-row justify-around">
            <View className="items-center">
              <Text className="text-cyan-400 text-2xl font-bold">
                {totalMessages}
              </Text>
              <Text className={`${textMuted} text-xs`}>Messages</Text>
            </View>
            <View className={`w-px ${border}`} />
            <View className="items-center">
              <Text className="text-purple-400 text-2xl font-bold">
                {totalSubscribers}
              </Text>
              <Text className={`${textMuted} text-xs`}>Subscribers</Text>
            </View>
            <View className={`w-px ${border}`} />
            <View className="items-center">
              <Text className="text-red-400 text-2xl font-bold">
                {totalDeleted}
              </Text>
              <Text className={`${textMuted} text-xs`}>Deleted</Text>
            </View>
          </View>
        </View>

        {/* Subjects List */}
        {subjects.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <View className="bg-cyan-500/20 w-20 h-20 rounded-full items-center justify-center mb-4">
              <Ionicons name="book" size={40} color="#22d3ee" />
            </View>
            <Text className="text-white text-xl font-bold mb-2">
              No Subjects
            </Text>
            <Text className={`${textSecondary} text-center mb-4`}>
              Create your first subject with group chat
            </Text>
            <TouchableOpacity
              className="bg-cyan-500 px-6 py-3 rounded-full"
              onPress={openCreateModal}
            >
              <Text className="text-white font-semibold">Create Subject</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={subjects}
            renderItem={({ item }) => (
              <SubjectCard
                subject={item}
                onEdit={() => openEditModal(item)}
                onDelete={() => handleDeleteSubject(item)}
                onViewSubscribers={() => handleViewSubscribers(item)}
                isDeleting={deletingId === item.id}
              />
            )}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchSubjects();
                }}
                tintColor="#22d3ee"
              />
            }
          />
        )}
      </View>

      {/* Subscribers Modal */}
      <SubscribersModal
        visible={showSubscribersModal}
        onClose={() => setShowSubscribersModal(false)}
        subjectName={selectedSubject?.name || ""}
        subscribers={subscribers}
        loading={loadingSubscribers}
      />

      {/* Create/Edit Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View className="flex-1 bg-black/80 justify-end">
          <ScrollView className={`${bgCard} rounded-t-3xl p-6 max-h-[90%]`}>
            <View className="flex-row items-center justify-between mb-6">
              <Text className={`${textPrimary} text-2xl font-bold`}>
                {editingSubject ? "Edit Subject" : "Create Subject"}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={28} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View className="mb-4">
              <Text className={`${textMuted} text-sm mb-2`}>
                Subject Name *
              </Text>
              <TextInput
                className={`${bgInput} ${textPrimary} px-4 py-3 rounded-lg`}
                placeholder="e.g., English, Mathematics, EAL Support"
                placeholderTextColor="#6B7280"
                value={formData.name}
                onChangeText={(text) =>
                  setFormData({ ...formData, name: text })
                }
              />
            </View>

            <View className="mb-4">
              <Text className={`${textMuted} text-sm mb-2`}>
                Subject Description
              </Text>
              <TextInput
                className={`${bgInput} ${textPrimary} px-4 py-3 rounded-lg`}
                placeholder="Brief description of the subject"
                placeholderTextColor="#6B7280"
                value={formData.description}
                onChangeText={(text) =>
                  setFormData({ ...formData, description: text })
                }
                multiline
                numberOfLines={2}
              />
            </View>

            <View className="mb-4">
              <Text className={`${textMuted} text-sm mb-2`}>
                Group Chat Description
              </Text>
              <TextInput
                className={`${bgInput} ${textPrimary} px-4 py-3 rounded-lg`}
                placeholder="e.g., Discuss lesson plans and teaching strategies"
                placeholderTextColor="#6B7280"
                value={formData.groupChatDescription}
                onChangeText={(text) =>
                  setFormData({ ...formData, groupChatDescription: text })
                }
                multiline
                numberOfLines={2}
              />
              <Text className={`${textMuted} text-xs mt-1`}>
                Group chat name will be &quot;{formData.name || "Subject"}{" "}
                Teachers Chat&quot;
              </Text>
            </View>

            <AccessToggle
              label="Subject Access *"
              isPublic={formData.isSubjectPublic}
              onToggle={() =>
                setFormData({
                  ...formData,
                  isSubjectPublic: !formData.isSubjectPublic,
                })
              }
              publicLabel="Public Resources"
              privateLabel="Private Resources"
              publicDescription="All teachers can see resources"
              privateDescription="Only subscribers can see resources"
            />

            <AccessToggle
              label="Group Chat Access *"
              isPublic={formData.isGroupChatPublic}
              onToggle={() =>
                setFormData({
                  ...formData,
                  isGroupChatPublic: !formData.isGroupChatPublic,
                })
              }
              publicLabel="Public Group Chat"
              privateLabel="Private Group Chat"
              publicDescription="All teachers can join chat"
              privateDescription="Only subscribers can join chat"
              icon="chatbubbles"
            />

            <TouchableOpacity
              className={`py-4 rounded-full mt-2 ${
                formData.name.trim() ? "bg-cyan-500" : bgCardAlt
              }`}
              onPress={handleSaveSubject}
              disabled={!formData.name.trim() || saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white text-center font-bold text-lg">
                  {editingSubject
                    ? "Update Subject & Chat"
                    : "Create Subject & Chat"}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      <Toast />
    </ScreenWrapper>
  );
}
