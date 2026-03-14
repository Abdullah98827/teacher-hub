import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
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
import AdminHeader from "../../components/AdminHeader";
import ConfirmModal from "../../components/ConfirmModal";
import ResourceCard from "../../components/ResourceCard";
import ScreenWrapper from "../../components/ScreenWrapper";
import SearchBar from "../../components/SearchBar";
import StatsSummary from "../../components/StatsSummary";
import TabFilter from "../../components/TabFilter";
import { useAuth } from "../../contexts/AuthContext";
import { useAppTheme } from "../../hooks/useAppTheme";
import { useUserRole } from "../../hooks/useUserRole";
import { supabase } from "../../supabase";
import { deleteFile } from "../../utils/storage";

interface Resource {
  id: string;
  title: string;
  description: string;
  file_url: string;
  category: "powerpoint" | "worksheet" | "lesson_plan";
  status: "pending" | "approved" | "rejected";
  created_at: string;
  downloads_count: number;
  subject: { name: string };
  uploader: { first_name: string; last_name: string } | null;
}

export default function AdminResourcesScreen() {
  const { user } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const router = useRouter();
  const {
    bgCardAlt,
    bgCard,
    bgInput,
    border,
    borderInput,
    textPrimary,
    textSecondary,
    textMuted,
  } = useAppTheme();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("pending");
  const [confirmAction, setConfirmAction] = useState<{
    type: "reject" | "delete";
    resourceId: string;
    filePath: string;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "downloads">(
    "newest"
  );
  const [showFilters, setShowFilters] = useState(false);

  const isAdmin = role === "admin";

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

  const fetchResources = async () => {
    try {
      const { data, error } = await supabase
        .from("resources")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const enriched = await Promise.all(
        (data || []).map(async (resource) => {
          const { data: subject } = await supabase
            .from("subjects")
            .select("name")
            .eq("id", resource.subject_id)
            .single();

          const { data: teacher } = await supabase
            .from("teachers")
            .select("first_name, last_name")
            .eq("id", resource.uploaded_by)
            .single();

          return {
            ...resource,
            subject: subject || { name: "Unknown" },
            uploader: teacher,
          };
        })
      );

      setResources(enriched as any);
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Failed to load resources",
        text2: error.message,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!roleLoading && isAdmin) {
      fetchResources();
    }
  }, [isAdmin, roleLoading]);

  const approveResource = async (resourceId: string) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const { error } = await supabase
        .from("resources")
        .update({ status: "approved" })
        .eq("id", resourceId);

      if (error) throw error;

      Toast.show({
        type: "success",
        text1: "Resource approved",
      });
      fetchResources();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Failed to approve",
        text2: error.message,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmAction || isProcessing) return;
    setIsProcessing(true);

    try {
      if (confirmAction.type === "reject") {
        const { error } = await supabase
          .from("resources")
          .update({
            status: "rejected",
            rejection_reason: "Not approved by admin",
          })
          .eq("id", confirmAction.resourceId);

        if (error) throw error;

        Toast.show({
          type: "success",
          text1: "Resource rejected",
        });
      } else if (confirmAction.type === "delete") {
        const fileDeleted = await deleteFile(confirmAction.filePath);
        if (!fileDeleted) {
          setIsProcessing(false);
          return;
        }

        const { error } = await supabase
          .from("resources")
          .delete()
          .eq("id", confirmAction.resourceId);

        if (error) throw error;

        Toast.show({
          type: "success",
          text1: "Resource deleted",
        });
      }

      fetchResources();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Operation failed",
        text2: error.message,
      });
    } finally {
      setConfirmAction(null);
      setIsProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

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

  const filteredResources = resources.filter((r) =>
    filter === "all" ? true : r.status === filter
  );

  const finalFilteredResources = filteredResources
    .filter((item) => {
      if (
        searchQuery &&
        !item.title.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false;
      }
      if (selectedSubject !== "all" && item.subject.name !== selectedSubject) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "newest") {
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }
      if (sortBy === "oldest") {
        return (
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      }
      if (sortBy === "downloads") {
        return b.downloads_count - a.downloads_count;
      }
      return 0;
    });

  const uniqueSubjects = Array.from(
    new Set(resources.map((r) => r.subject.name))
  ).sort();

  const pendingCount = resources.filter((r) => r.status === "pending").length;
  const approvedCount = resources.filter((r) => r.status === "approved").length;
  const rejectedCount = resources.filter((r) => r.status === "rejected").length;

  return (
    <ScreenWrapper>
      <View className="flex-1 px-5 pt-4">
        <AdminHeader
          title="Manage Resources"
          subtitle={`${resources.length} total resource${resources.length !== 1 ? "s" : ""}`}
        />

        <StatsSummary
          stats={[
            { label: "Pending", value: pendingCount, color: "orange" },
            { label: "Approved", value: approvedCount, color: "green" },
            { label: "Rejected", value: rejectedCount, color: "red" },
          ]}
        />

        <TabFilter
          tabs={[
            { key: "pending", label: "Pending", count: pendingCount },
            { key: "approved", label: "Approved", count: approvedCount },
            { key: "rejected", label: "Rejected", count: rejectedCount },
            { key: "all", label: "All", count: resources.length },
          ]}
          activeTab={filter}
          onTabChange={(key) => setFilter(key as any)}
        />

        {filteredResources.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <View className="bg-cyan-500/20 w-20 h-20 rounded-full items-center justify-center mb-4">
              <Ionicons
                name="document-text-outline"
                size={40}
                color="#22d3ee"
              />
            </View>
            <Text className="text-white text-xl font-bold mb-2">
              No Resources
            </Text>
            <Text className={`${textSecondary} text-center`}>
              No {filter !== "all" ? filter : ""} resources found
            </Text>
          </View>
        ) : (
          <>
            {/* Advanced filters toggle */}
            <TouchableOpacity
              className={`${bgCardAlt} p-3 rounded-xl mb-3 flex-row items-center justify-between`}
              onPress={() => setShowFilters(!showFilters)}
            >
              <View className="flex-row items-center">
                <Ionicons name="options" size={20} color="#22d3ee" />
                <Text className={`${textPrimary} font-semibold ml-2`}>
                  Advanced Filters
                </Text>
              </View>
              <Ionicons
                name={showFilters ? "chevron-up" : "chevron-down"}
                size={20}
                color="#9CA3AF"
              />
            </TouchableOpacity>

            {/* Advanced filters panel */}
            {showFilters && (
              <View
                className={`${bgCard} p-4 rounded-xl mb-3 border ${border}`}
              >
                <SearchBar
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search by title..."
                />

                {/* Category filter */}
                <View className="mb-3">
                  <Text className={`${textPrimary} font-semibold mb-2`}>
                    Category
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {["all", "powerpoint", "worksheet", "lesson_plan"].map(
                      (cat) => (
                        <TouchableOpacity
                          key={cat}
                          className={`px-3 py-2 rounded-lg ${
                            selectedCategory === cat ? "bg-cyan-500" : bgCardAlt
                          }`}
                          onPress={() => setSelectedCategory(cat)}
                        >
                          <Text
                            className={`font-semibold text-sm ${
                              selectedCategory === cat
                                ? "text-white"
                                : textSecondary
                            }`}
                          >
                            {cat === "all"
                              ? "All"
                              : cat === "powerpoint"
                                ? "PowerPoint"
                                : cat === "worksheet"
                                  ? "Worksheet"
                                  : "Lesson Plan"}
                          </Text>
                        </TouchableOpacity>
                      )
                    )}
                  </View>
                </View>

                {/* Subject filter */}
                <View className="mb-3">
                  <Text className={`${textPrimary} font-semibold mb-2`}>
                    Subject
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        className={`px-3 py-2 rounded-lg ${
                          selectedSubject === "all" ? "bg-cyan-500" : bgCardAlt
                        }`}
                        onPress={() => setSelectedSubject("all")}
                      >
                        <Text
                          className={`font-semibold text-sm ${
                            selectedSubject === "all"
                              ? "text-white"
                              : textSecondary
                          }`}
                        >
                          All
                        </Text>
                      </TouchableOpacity>
                      {uniqueSubjects.map((subject) => (
                        <TouchableOpacity
                          key={subject}
                          className={`px-3 py-2 rounded-lg ${
                            selectedSubject === subject
                              ? "bg-cyan-500"
                              : bgCardAlt
                          }`}
                          onPress={() => setSelectedSubject(subject)}
                        >
                          <Text
                            className={`font-semibold text-sm ${
                              selectedSubject === subject
                                ? "text-white"
                                : textSecondary
                            }`}
                          >
                            {subject}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>

                {/* Sort options */}
                <View className="mb-3">
                  <Text className={`${textPrimary} font-semibold mb-2`}>
                    Sort By
                  </Text>
                  <View className="flex-row gap-2">
                    {[
                      { value: "newest", label: "Newest" },
                      { value: "oldest", label: "Oldest" },
                      { value: "downloads", label: "Most Downloaded" },
                    ].map((sort) => (
                      <TouchableOpacity
                        key={sort.value}
                        className={`px-3 py-2 rounded-lg ${
                          sortBy === sort.value ? "bg-cyan-500" : bgCardAlt
                        }`}
                        onPress={() => setSortBy(sort.value as any)}
                      >
                        <Text
                          className={`font-semibold text-sm ${
                            sortBy === sort.value ? "text-white" : textSecondary
                          }`}
                        >
                          {sort.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Clear filters */}
                <TouchableOpacity
                  className="bg-red-500/20 border border-red-500/30 p-3 rounded-xl flex-row items-center justify-center"
                  onPress={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                    setSelectedSubject("all");
                    setSortBy("newest");
                  }}
                >
                  <Ionicons name="close-circle" size={16} color="#ef4444" />
                  <Text className="text-red-400 font-semibold ml-2">
                    Clear All Filters
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Results count */}
            <Text className={`${textMuted} text-sm mb-3`}>
              Showing {finalFilteredResources.length} of{" "}
              {filteredResources.length} resources
            </Text>

            {finalFilteredResources.length === 0 ? (
              <View className="flex-1 items-center justify-center py-10">
                <View className="bg-cyan-500/20 w-16 h-16 rounded-full items-center justify-center mb-3">
                  <Ionicons name="search" size={32} color="#22d3ee" />
                </View>
                <Text className="text-white text-lg font-bold mb-2">
                  No Matches
                </Text>
                <Text className={`${textSecondary} text-center mb-4`}>
                  No resources match your filters
                </Text>
                <TouchableOpacity
                  className="bg-cyan-500 px-4 py-2 rounded-lg"
                  onPress={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                    setSelectedSubject("all");
                  }}
                >
                  <Text className="text-white font-semibold">
                    Clear Filters
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={finalFilteredResources}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => {
                      setRefreshing(true);
                      fetchResources();
                    }}
                    tintColor="#22d3ee"
                  />
                }
                renderItem={({ item }) => (
                  <View className="mb-4">
                    <ResourceCard
                      title={item.title}
                      description={item.description}
                      category={item.category}
                      status={item.status}
                      subjectName={item.subject.name}
                      uploadedBy={
                        item.uploader
                          ? `${item.uploader.first_name} ${item.uploader.last_name}`
                          : "Unknown"
                      }
                      createdAt={formatDate(item.created_at)}
                      downloads={item.downloads_count}
                    />

                    {/* Admin action buttons */}
                    <View className="flex-row gap-2 mt-2">
                      {item.status === "pending" && (
                        <>
                          <TouchableOpacity
                            className={`flex-1 bg-green-500 py-3 rounded-lg flex-row items-center justify-center ${
                              isProcessing ? "opacity-50" : ""
                            }`}
                            onPress={() => approveResource(item.id)}
                            disabled={isProcessing}
                          >
                            {isProcessing ? (
                              <ActivityIndicator color="#fff" size="small" />
                            ) : (
                              <>
                                <Ionicons
                                  name="checkmark-circle"
                                  size={18}
                                  color="#fff"
                                />
                                <Text className="text-white font-bold ml-2">
                                  Approve
                                </Text>
                              </>
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity
                            className={`flex-1 bg-red-500 py-3 rounded-lg flex-row items-center justify-center ${
                              isProcessing ? "opacity-50" : ""
                            }`}
                            onPress={() =>
                              setConfirmAction({
                                type: "reject",
                                resourceId: item.id,
                                filePath: item.file_url,
                              })
                            }
                            disabled={isProcessing}
                          >
                            <Ionicons
                              name="close-circle"
                              size={18}
                              color="#fff"
                            />
                            <Text className="text-white font-bold ml-2">
                              Reject
                            </Text>
                          </TouchableOpacity>
                        </>
                      )}
                      <TouchableOpacity
                        className={`${bgCardAlt} py-3 px-4 rounded-lg ${
                          isProcessing ? "opacity-50" : ""
                        }`}
                        onPress={() =>
                          setConfirmAction({
                            type: "delete",
                            resourceId: item.id,
                            filePath: item.file_url,
                          })
                        }
                        disabled={isProcessing}
                      >
                        <Ionicons name="trash" size={20} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
            )}
          </>
        )}
      </View>

      <ConfirmModal
        visible={confirmAction !== null && confirmAction?.type === "reject"}
        title="Reject Resource?"
        message="This resource will be marked as rejected."
        confirmText="Reject"
        confirmColor="bg-red-500"
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmAction(null)}
        isProcessing={isProcessing}
      />

      <ConfirmModal
        visible={confirmAction !== null && confirmAction?.type === "delete"}
        title="Delete Resource?"
        message="This will permanently delete the file from storage and database. This action cannot be undone."
        confirmText="Delete Forever"
        confirmColor="bg-red-600"
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmAction(null)}
        isProcessing={isProcessing}
      />

      <Toast />
    </ScreenWrapper>
  );
}
