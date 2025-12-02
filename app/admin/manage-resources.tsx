import { Ionicons } from "@expo/vector-icons";
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
import EmptyState from "../../components/EmptyState";
import LogoHeader from "../../components/logoHeader";
import ResourceCard from "../../components/ResourceCard";
import ScreenWrapper from "../../components/ScreenWrapper";
import SearchBar from "../../components/SearchBar";
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

  // Filter states for advanced search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "downloads">(
    "newest"
  );
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchResources();
  }, []);

  // Loads all resources with subject and uploader's info
  const fetchResources = async () => {
    const { data, error } = await supabase
      .from("resources")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      Toast.show({
        type: "error",
        text1: "Failed to load resources",
        text2: error.message,
      });
      setLoading(false);
      setRefreshing(false);
      return;
    }

    // Gets subject names and teacher names for each resource
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
    setLoading(false);
    setRefreshing(false);
  };

  // Admin has to approve the resource to make it visible to teachers
  const approveResource = async (resourceId: string) => {
    if (isProcessing) return;

    setIsProcessing(true);

    const { error } = await supabase
      .from("resources")
      .update({ status: "approved" })
      .eq("id", resourceId);

    if (error) {
      Toast.show({
        type: "error",
        text1: "Failed to approve",
        text2: error.message,
      });
      setIsProcessing(false);
      return;
    }

    Toast.show({
      type: "success",
      text1: "Resource approved!",
    });

    setIsProcessing(false);
    fetchResources();
  };

  // Handles reject or delete action after confirmation
  const handleConfirmAction = async () => {
    if (!confirmAction || isProcessing) return;

    setIsProcessing(true);

    if (confirmAction.type === "reject") {
      // Just marks as rejected, don't delete file
      const { error } = await supabase
        .from("resources")
        .update({
          status: "rejected",
          rejection_reason: "Not approved by admin",
        })
        .eq("id", confirmAction.resourceId);

      if (error) {
        Toast.show({
          type: "error",
          text1: "Failed to reject",
          text2: error.message,
        });
        setIsProcessing(false);
        return;
      }

      Toast.show({
        type: "success",
        text1: "Resource rejected",
      });
    } else if (confirmAction.type === "delete") {
      // Deletes the file from storage bucket first
      const fileDeleted = await deleteFile(confirmAction.filePath);
      if (!fileDeleted) {
        setIsProcessing(false);
        return;
      }

      // Then deletes from database
      const { error } = await supabase
        .from("resources")
        .delete()
        .eq("id", confirmAction.resourceId);

      if (error) {
        Toast.show({
          type: "error",
          text1: "Failed to delete",
          text2: error.message,
        });
        setIsProcessing(false);
        return;
      }

      Toast.show({
        type: "success",
        text1: "Resource deleted",
      });
    }

    setConfirmAction(null);
    setIsProcessing(false);
    fetchResources();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <ScreenWrapper>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#22d3ee" />
          <Text className="text-gray-400 mt-4">Loading resources...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  // Filter by status first
  const filteredResources = resources.filter((r) =>
    filter === "all" ? true : r.status === filter
  );

  // Apply additional filters (search, category, subject) and sorting
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

  // Get unique subject names for filter dropdown
  const uniqueSubjects = Array.from(
    new Set(resources.map((r) => r.subject.name))
  ).sort();

  const pendingCount = resources.filter((r) => r.status === "pending").length;
  const approvedCount = resources.filter((r) => r.status === "approved").length;
  const rejectedCount = resources.filter((r) => r.status === "rejected").length;

  return (
    <ScreenWrapper>
      <LogoHeader position="left" />

      <View className="flex-1 px-5">
        <AdminHeader title="Manage Resources" showBack={false} />

        {/* Status cards */}
        <View className="flex-row gap-2 mb-4">
          <View className="flex-1 bg-orange-900/30 p-3 rounded-xl border border-orange-800">
            <Text className="text-orange-400 text-2xl font-bold">
              {pendingCount}
            </Text>
            <Text className="text-orange-400 text-xs">Pending</Text>
          </View>
          <View className="flex-1 bg-green-900/30 p-3 rounded-xl border border-green-800">
            <Text className="text-green-400 text-2xl font-bold">
              {approvedCount}
            </Text>
            <Text className="text-green-400 text-xs">Approved</Text>
          </View>
          <View className="flex-1 bg-red-900/30 p-3 rounded-xl border border-red-800">
            <Text className="text-red-400 text-2xl font-bold">
              {rejectedCount}
            </Text>
            <Text className="text-red-400 text-xs">Rejected</Text>
          </View>
        </View>

        {/* Status filter tabs */}
        <View className="flex-row gap-2 mb-4">
          {["pending", "approved", "rejected", "all"].map((status) => (
            <TouchableOpacity
              key={status}
              className={`px-4 py-2 rounded-xl ${
                filter === status ? "bg-cyan-500" : "bg-neutral-800"
              }`}
              onPress={() => setFilter(status as any)}
            >
              <Text
                className={`font-semibold ${
                  filter === status ? "text-white" : "text-gray-400"
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {filteredResources.length === 0 ? (
          <EmptyState icon="📚" message={`No ${filter} resources`} />
        ) : (
          <>
            {/* Toggle for advanced filters */}
            <TouchableOpacity
              className="bg-neutral-800 p-3 rounded-xl mb-3 flex-row items-center justify-between"
              onPress={() => setShowFilters(!showFilters)}
            >
              <View className="flex-row items-center">
                <Ionicons name="filter" size={20} color="#22d3ee" />
                <Text className="text-white font-semibold ml-2">
                  Filters & Sort
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
              <View className="bg-neutral-900 p-4 rounded-xl mb-3">
                <SearchBar
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search by title..."
                  label="Search"
                />

                {/* Category filter */}
                <View className="mb-3">
                  <Text className="text-white font-semibold mb-2">
                    Category
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {["all", "powerpoint", "worksheet", "lesson_plan"].map(
                      (cat) => (
                        <TouchableOpacity
                          key={cat}
                          className={`px-3 py-2 rounded-lg ${
                            selectedCategory === cat
                              ? "bg-cyan-500"
                              : "bg-neutral-800"
                          }`}
                          onPress={() => setSelectedCategory(cat)}
                        >
                          <Text
                            className={`font-semibold ${
                              selectedCategory === cat
                                ? "text-white"
                                : "text-gray-400"
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
                  <Text className="text-white font-semibold mb-2">Subject</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        className={`px-3 py-2 rounded-lg ${
                          selectedSubject === "all"
                            ? "bg-cyan-500"
                            : "bg-neutral-800"
                        }`}
                        onPress={() => setSelectedSubject("all")}
                      >
                        <Text
                          className={`font-semibold ${
                            selectedSubject === "all"
                              ? "text-white"
                              : "text-gray-400"
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
                              : "bg-neutral-800"
                          }`}
                          onPress={() => setSelectedSubject(subject)}
                        >
                          <Text
                            className={`font-semibold ${
                              selectedSubject === subject
                                ? "text-white"
                                : "text-gray-400"
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
                  <Text className="text-white font-semibold mb-2">Sort By</Text>
                  <View className="flex-row gap-2">
                    {[
                      { value: "newest", label: "Newest" },
                      { value: "oldest", label: "Oldest" },
                      { value: "downloads", label: "Most Downloaded" },
                    ].map((sort) => (
                      <TouchableOpacity
                        key={sort.value}
                        className={`px-3 py-2 rounded-lg ${
                          sortBy === sort.value
                            ? "bg-cyan-500"
                            : "bg-neutral-800"
                        }`}
                        onPress={() => setSortBy(sort.value as any)}
                      >
                        <Text
                          className={`font-semibold ${
                            sortBy === sort.value
                              ? "text-white"
                              : "text-gray-400"
                          }`}
                        >
                          {sort.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Clear all filters button */}
                <TouchableOpacity
                  className="bg-red-600/20 border border-red-600 p-3 rounded-xl"
                  onPress={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                    setSelectedSubject("all");
                    setSortBy("newest");
                  }}
                >
                  <Text className="text-red-400 text-center font-semibold">
                    Clear All Filters
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Results count */}
            <Text className="text-gray-400 mb-3">
              Showing {finalFilteredResources.length} of{" "}
              {filteredResources.length} resources
            </Text>

            {finalFilteredResources.length === 0 ? (
              <View className="flex-1 items-center justify-center py-10">
                <EmptyState
                  icon="🔍"
                  message="No resources match your filters"
                />
                <TouchableOpacity
                  className="mt-4 bg-cyan-500 px-4 py-2 rounded-lg"
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
                            className={`flex-1 bg-green-600 py-3 rounded-xl flex-row items-center justify-center ${
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
                                  size={20}
                                  color="#fff"
                                />
                                <Text className="text-white font-bold ml-2">
                                  Approve
                                </Text>
                              </>
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity
                            className={`flex-1 bg-red-600 py-3 rounded-xl flex-row items-center justify-center ${
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
                              size={20}
                              color="#fff"
                            />
                            <Text className="text-white font-bold ml-2">
                              Reject
                            </Text>
                          </TouchableOpacity>
                        </>
                      )}
                      <TouchableOpacity
                        className={`bg-neutral-800 py-3 px-4 rounded-xl ${
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

      {/* Reject confirmation modal */}
      <ConfirmModal
        visible={confirmAction !== null && confirmAction?.type === "reject"}
        title="Reject Resource?"
        message="This resource will be marked as rejected."
        confirmText="Reject"
        confirmColor="bg-red-600"
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmAction(null)}
        isProcessing={isProcessing}
      />

      {/* Delete confirmation modal */}
      <ConfirmModal
        visible={confirmAction !== null && confirmAction?.type === "delete"}
        title="Delete Resource?"
        message="This will permanently delete the file from storage and database."
        confirmText="Delete"
        confirmColor="bg-red-700"
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmAction(null)}
        isProcessing={isProcessing}
      />

      <Toast />
    </ScreenWrapper>
  );
}
