import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { WebView } from "react-native-webview";
import CommentsModal from "../../components/CommentsModal";
import EALAdapterModal from "../../components/EALAdapterModal";
import LogoHeader from "../../components/logoHeader";
import OnboardingModal from '../../components/OnboardingModal';
import RatingModal from "../../components/RatingModal";
import ReportModal from "../../components/ReportModal";
import ResourceCard from "../../components/ResourceCard";
import ScreenWrapper from "../../components/ScreenWrapper";
import ShareModal from "../../components/ShareModal";
import { ThemedText } from '../../components/themed-text';
import TranslationModal from "../../components/TranslationModal";
import UserProfileModal from "../../components/UserProfileModal";
import { useAuth } from "../../contexts/AuthContext";
import { useAppTheme } from "../../hooks/useAppTheme";
import { supabase } from "../../supabase";
import { logEvent } from "../../utils/logging";
import { hasSeenOnboarding, setOnboardingSeen } from '../../utils/onboardingHelpers';
import {
  checkBookmark,
  getResourceStats,
  toggleBookmark,
  trackResourceView,
} from "../../utils/resourceHelpers";
import { deleteFile, getSignedUrl } from "../../utils/storage";

export default function ResourcesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { openResourceId, activeTab: activeTabParam } = useLocalSearchParams();
  const {
    bg,
    bgCard,
    bgCardAlt,
    bgInput,
    borderInput,
    textPrimary,
    textSecondary,
    textMuted,
    placeholderColor,
    isDark,
  } = useAppTheme();

  const [resources, setResources] = useState([]);
  const [myResources, setMyResources] = useState([]);
  const [followingResources, setFollowingResources] = useState([]);
  const [savedResources, setSavedResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("browse");
  const [selectedResource, setSelectedResource] = useState(null);
  const [signedUrl, setSignedUrl] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileUserId, setProfileUserId] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteResourceId, setDeleteResourceId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);

  const [showTranslationModal, setShowTranslationModal] = useState(false);
  const [showEALModal, setShowEALModal] = useState(false);

  const [selectedResourceId, setSelectedResourceId] = useState(null);
  const [selectedResourceTitle, setSelectedResourceTitle] = useState("");
  const [selectedResourceSubjectId, setSelectedResourceSubjectId] = useState(null);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const [resourceStats, setResourceStats] = useState(new Map());
  const [bookmarks, setBookmarks] = useState(new Set());
  const [showOnboarding, setShowOnboarding] = useState(false);

  const [showTranslateOnboarding, setShowTranslateOnboarding] = useState(false);
  const [showEALOnboarding, setShowEALOnboarding] = useState(false);

  const fetchResources = useCallback(async () => {
    if (!user?.id) return;
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("id", user.id)
      .single();
    const isAdmin =
      roleData?.role === "admin" || roleData?.role === "super_admin";
    let approvedData;
    if (isAdmin) {
      const { data } = await supabase
        .from("resources")
        .select("*, uploaded_by, subject:subjects(name, is_public)")
        .eq("status", "approved")
        .order("created_at", { ascending: false });
      approvedData = data;
    } else {
      const { data: membershipData } = await supabase
        .from("memberships")
        .select("subject_ids")
        .eq("id", user.id)
        .eq("active", true)
        .single();
      const subscribedSubjectIds = membershipData?.subject_ids || [];
      const { data: publicSubjects } = await supabase
        .from("subjects")
        .select("id")
        .eq("is_public", true);
      const publicSubjectIds = (publicSubjects || []).map((s) => s.id);
      const allAccessibleSubjectIds = [
        ...new Set([...subscribedSubjectIds, ...publicSubjectIds]),
      ];
      if (allAccessibleSubjectIds.length === 0) {
        setResources([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      const { data } = await supabase
        .from("resources")
        .select("*, uploaded_by, subject:subjects(name, is_public)")
        .eq("status", "approved")
        .in("subject_id", allAccessibleSubjectIds)
        .order("created_at", { ascending: false });
      approvedData = data;
    }
    const { data: myData } = await supabase
      .from("resources")
      .select("*, uploaded_by, subject:subjects(name, is_public)")
      .eq("uploaded_by", user.id)
      .order("created_at", { ascending: false });
    const enrichApproved = await Promise.all(
      (approvedData || []).map(async (resource) => {
        const { data: teacher } = await supabase
          .from("teachers")
          .select("first_name, last_name")
          .eq("id", resource.uploaded_by)
          .single();
        return {
          ...resource,
          uploader: teacher || { first_name: "Unknown", last_name: "" },
        };
      })
    );
    const enrichMy = await Promise.all(
      (myData || []).map(async (resource) => {
        const { data: teacher } = await supabase
          .from("teachers")
          .select("first_name, last_name")
          .eq("id", resource.uploaded_by)
          .single();
        return {
          ...resource,
          uploader: teacher || { first_name: "Unknown", last_name: "" },
        };
      })
    );
    const allResources = [...enrichApproved, ...enrichMy];
    const statsMap = new Map();
    const bookmarkSet = new Set();
    await Promise.all(
      allResources.map(async (resource) => {
        const stats = await getResourceStats(resource.id);
        statsMap.set(resource.id, stats);
        const isBookmarked = await checkBookmark(resource.id, user.id);
        if (isBookmarked) {
          bookmarkSet.add(resource.id);
        }
      })
    );
    setResourceStats(statsMap);
    setBookmarks(bookmarkSet);
    setResources(enrichApproved);
    setMyResources(enrichMy);
    const { data: bookmarkedIds } = await supabase
      .from("resource_bookmarks")
      .select("resource_id")
      .eq("user_id", user.id);
    if (bookmarkedIds && bookmarkedIds.length > 0) {
      const bookmarkedResourceIds = bookmarkedIds.map((b) => b.resource_id);
      const savedList = enrichApproved.filter((r) =>
        bookmarkedResourceIds.includes(r.id)
      );
      setSavedResources(savedList);
    } else {
      setSavedResources([]);
    }
    setLoading(false);
    setRefreshing(false);
  }, [user?.id]);

  const fetchFollowingResources = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data: followingData } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id);
    if (!followingData || followingData.length === 0) {
      setFollowingResources([]);
      setLoading(false);
      return;
    }
    const followingIds = followingData.map((f) => f.following_id);
    const { data } = await supabase
      .from("resources")
      .select("*, uploaded_by, subject:subjects(name, is_public)")
      .eq("status", "approved")
      .in("uploaded_by", followingIds)
      .order("created_at", { ascending: false });
    const enriched = await Promise.all(
      (data || []).map(async (resource) => {
        const { data: teacher } = await supabase
          .from("teachers")
          .select("first_name, last_name")
          .eq("id", resource.uploaded_by)
          .single();
        return {
          ...resource,
          uploader: teacher || { first_name: "Unknown", last_name: "" },
        };
      })
    );
    const statsMap = new Map();
    const bookmarkSet = new Set();
    await Promise.all(
      enriched.map(async (resource) => {
        const stats = await getResourceStats(resource.id);
        statsMap.set(resource.id, stats);
        const isBookmarked = await checkBookmark(resource.id, user.id);
        if (isBookmarked) {
          bookmarkSet.add(resource.id);
        }
      })
    );
    setResourceStats((prev) => new Map([...prev, ...statsMap]));
    setBookmarks((prev) => new Set([...prev, ...bookmarkSet]));
    setFollowingResources(enriched);
    setLoading(false);
  };

  useEffect(() => {
    fetchResources();
    if (activeTab === "following") {
      fetchFollowingResources();
    }
  }, [fetchResources, fetchFollowingResources, activeTab]);

  useEffect(() => {
    if (user && user.id) {
      hasSeenOnboarding(user.id, 'library').then((seen) => {
        if (!seen) {
          setShowOnboarding(true);
        }
      });
    }
  }, [user]);

  const handleCloseOnboarding = () => {
    if (user && user.id) {
      setOnboardingSeen(user.id, 'library');
    }
    setShowOnboarding(false);
  };

  // Handle opening a specific resource from deep link
  useEffect(() => {
    if (openResourceId && resources.length > 0) {
      const resource = resources.find((r) => r.id === openResourceId);
      if (resource) {
        // Immediately show the preview with the resource
        setSelectedResource(resource);
        setSelectedResourceId(resource.id);
        setSelectedResourceTitle(resource.title);
        setSelectedResourceSubjectId(resource.subject_id);
        
        // Load stats and signed URL in the background
        (async () => {
          try {
            if (user?.id) {
              await trackResourceView(resource.id, user.id);
              const stats = await getResourceStats(resource.id);
              setResourceStats((prev) => new Map(prev).set(resource.id, stats));
            }
            const url = await getSignedUrl(resource.file_url, 600);
            if (url) {
              setSignedUrl(url);
            }
          } catch (err) {
            console.error("Error loading resource preview:", err);
          }
        })();
        
        // Show preview after a small delay
        setTimeout(() => {
          setShowPreview(true);
        }, 100);
        
        // If activeTab is specified, open the corresponding modal after preview
        if (activeTabParam === 'comments') {
          setTimeout(() => {
            setShowPreview(false);
            setShowCommentsModal(true);
          }, 600);
        } else if (activeTabParam === 'ratings') {
          setTimeout(() => {
            setShowPreview(false);
            setShowRatingModal(true);
          }, 600);
        }
        
        // Clear the query param to prevent re-opening on close
        router.setParams({ openResourceId: undefined, activeTab: undefined });
      }
    }
  }, [openResourceId, resources, user?.id, router, activeTabParam]);

  const handleTranslateClick = async () => {
    if (!user || !selectedResource) return;
    const seen = await hasSeenOnboarding(user.id, 'translate');
    if (!seen) {
      setShowPreview(false);
      setTimeout(() => {
        setShowTranslateOnboarding(true);
      }, 400);
    } else {
      setShowPreview(false);
      setTimeout(() => setShowTranslationModal(true), 400);
    }
  };

  const handleEALClick = async () => {
    if (!user || !selectedResource) return;
    const seen = await hasSeenOnboarding(user.id, 'eal-adapter');
    if (!seen) {
      setShowPreview(false);
      setTimeout(() => {
        setShowEALOnboarding(true);
      }, 400);
    } else {
      setShowPreview(false);
      setTimeout(() => setShowEALModal(true), 400);
    }
  };

  const openPreview = async (resource) => {
    if (user?.id) {
      await trackResourceView(resource.id, user.id);
      const stats = await getResourceStats(resource.id);
      setResourceStats((prev) => new Map(prev).set(resource.id, stats));
    }
    const url = await getSignedUrl(resource.file_url, 600);
    if (!url) {
      Toast.show({
        type: "error",
        text1: "Cannot open preview",
        text2: "Failed to generate download link",
      });
      return;
    }
    if (Platform.OS === "web") {
      window.open(url, "_blank");
    } else {
      setSelectedResource(resource);
      setSignedUrl(url);
      setShowPreview(true);
    }
  };

  const downloadResource = async (resource) => {
    await supabase
      .from("resources")
      .update({ downloads_count: resource.downloads_count + 1 })
      .eq("id", resource.id);
    const url = await getSignedUrl(resource.file_url, 600);
    if (!url) {
      Toast.show({
        type: "error",
        text1: "Cannot download",
        text2: "Failed to generate download link",
      });
      return;
    }
    await Linking.openURL(url);
    Toast.show({ type: "success", text1: "Downloading resource..." });
    setShowPreview(false);
    fetchResources();
  };

  const deleteResource = async (resourceId) => {
    if (isDeleting) return;
    setIsDeleting(true);
    const resourceToDelete = myResources.find((r) => r.id === resourceId);
    if (!resourceToDelete) {
      Toast.show({ type: "error", text1: "Resource not found" });
      setIsDeleting(false);
      return;
    }
    const fileDeleted = await deleteFile(resourceToDelete.file_url);
    if (!fileDeleted) {
      logEvent({
        event_type: "RESOURCE_DELETE_FAILED",
        user_id: user?.id,
        target_id: resourceId,
        target_table: "resources",
        details: { reason: "file_deletion_failed" },
      });
      setIsDeleting(false);
      return;
    }
    const { error } = await supabase
      .from("resources")
      .delete()
      .eq("id", resourceId);
    if (error) {
      logEvent({
        event_type: "RESOURCE_DELETE_FAILED",
        user_id: user?.id,
        target_id: resourceId,
        target_table: "resources",
        details: { error: error.message },
      });
      Toast.show({ type: "error", text1: "Failed to delete" });
      setIsDeleting(false);
      return;
    }
    logEvent({
      event_type: "RESOURCE_DELETED",
      user_id: user?.id,
      target_id: resourceId,
      target_table: "resources",
      details: { title: resourceToDelete.title },
    });
    Toast.show({ type: "success", text1: "Resource deleted" });
    setIsDeleting(false);
    fetchResources();
  };

  const handleDeletePress = (resourceId) => {
    setDeleteResourceId(resourceId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (deleteResourceId) {
      deleteResource(deleteResourceId);
      setShowDeleteConfirm(false);
      setDeleteResourceId(null);
    }
  };

  const handleBookmark = async (resourceId) => {
    if (!user?.id) return;
    const result = await toggleBookmark(resourceId, user.id);
    if (result.success) {
      if (result.isBookmarked) {
        setBookmarks((prev) => new Set(prev).add(resourceId));
        logEvent({
          event_type: "RESOURCE_BOOKMARKED",
          user_id: user.id,
          target_id: resourceId,
          target_table: "resources",
        });
        Toast.show({ type: "success", text1: "Resource saved!" });
      } else {
        setBookmarks((prev) => {
          const newSet = new Set(prev);
          newSet.delete(resourceId);
          return newSet;
        });
        logEvent({
          event_type: "RESOURCE_BOOKMARK_REMOVED",
          user_id: user.id,
          target_id: resourceId,
          target_table: "resources",
        });
        Toast.show({ type: "success", text1: "Resource removed" });
      }
      fetchResources();
    }
  };

  const handleRatingSubmitted = async () => {
    if (selectedResourceId) {
      const stats = await getResourceStats(selectedResourceId);
      setResourceStats((prev) => new Map(prev).set(selectedResourceId, stats));
    }
  };

  const handleViewProfile = (uploaderId) => {
    setProfileUserId(uploaderId);
    setShowProfileModal(true);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
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

  const displayResources =
    activeTab === "browse"
      ? resources
      : activeTab === "mine"
        ? myResources
        : activeTab === "saved"
          ? savedResources
          : followingResources;

  const filteredResources = displayResources
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

  return (
    <ScreenWrapper>
      <OnboardingModal
        visible={showOnboarding}
        onClose={handleCloseOnboarding}
        title="Welcome to the Library!"
        description="Here's what you can do on this screen:"
        steps={[
          'Browse and search teaching resources',
          'Bookmark resources for later',
          'Download and share materials',
          'Rate and comment on resources',
        ]}
      />
      <LogoHeader position="left" />
      <View className="flex-1 px-5">
        <View className="mb-4">
          <ThemedText className="text-3xl font-bold text-cyan-400 mb-4">
            Resources
          </ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-4"
          >
            <View className="flex-row gap-2">
              {[
                { key: "browse", label: `Browse (${resources.length})` },
                { key: "saved", label: `Saved (${savedResources.length})` },
                { key: "mine", label: `My Uploads (${myResources.length})` },
                {
                  key: "following",
                  label: `Following (${followingResources.length})`,
                },
              ].map(({ key, label }) => (
                <TouchableOpacity
                  key={key}
                  className={`py-3 px-4 rounded-xl ${activeTab === key ? "bg-cyan-500" : bgCardAlt}`}
                  onPress={() => setActiveTab(key)}
                >
                  <ThemedText
                    className={`text-center font-bold ${activeTab === key ? "text-white" : textSecondary}`}
                  >
                    {label}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <TouchableOpacity
            className="bg-cyan-500 p-4 rounded-xl flex-row items-center justify-center"
            onPress={() => router.push("/upload-resource")}
          >
            <Ionicons name="cloud-upload" size={20} color="#fff" />
            <ThemedText className="text-white font-bold ml-2">Upload Resource</ThemedText>
          </TouchableOpacity>
        </View>

        {displayResources.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <View className="bg-cyan-500/20 w-20 h-20 rounded-full items-center justify-center mb-4">
              <Ionicons
                name={activeTab === "saved" ? "bookmark" : "folder-open"}
                size={40}
                color="#22d3ee"
              />
            </View>
            <ThemedText className={`${textSecondary} text-center`}>
              {activeTab === "browse"
                ? "No resources available yet"
                : activeTab === "saved"
                  ? "No saved resources yet"
                  : activeTab === "following"
                    ? "No resources from teachers you follow"
                    : "You haven't uploaded any resources"}
            </ThemedText>
            {activeTab === "following" && displayResources.length === 0 && (
              <TouchableOpacity
                className="bg-cyan-600 px-6 py-3 rounded-lg mt-4"
                onPress={() => router.push("/suggested-users")}
              >
                <ThemedText className="text-white font-semibold">
                  Find Teachers to Follow
                </ThemedText>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View className="flex-1">
            <TouchableOpacity
              className={`${bgCardAlt} p-3 rounded-xl mb-3 flex-row items-center justify-between`}
              onPress={() => setShowFilters(!showFilters)}
            >
              <View className="flex-row items-center">
                <Ionicons name="filter" size={20} color="#22d3ee" />
                <ThemedText className={`${textPrimary} font-semibold ml-2`}>
                  Filters & Sort
                </ThemedText>
              </View>
              <Ionicons
                name={showFilters ? "chevron-up" : "chevron-down"}
                size={20}
                color={placeholderColor}
              />
            </TouchableOpacity>

            {showFilters && (
              <View className={`${bgCard} p-4 rounded-xl mb-3`}>
                <View className="mb-3">
                  <ThemedText className={`${textPrimary} font-semibold mb-2`}>
                    Search
                  </ThemedText>
                  <View
                    className={`${bgInput} flex-row items-center px-3 py-2 rounded-xl ${borderInput} border`}
                  >
                    <Ionicons name="search" size={20} color={placeholderColor} />
                    <TextInput
                      className={`flex-1 ${textPrimary} ml-2`}
                      placeholder="Search by title..."
                      placeholderTextColor={placeholderColor}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                    {searchQuery !== "" && (
                      <TouchableOpacity onPress={() => setSearchQuery("")}>
                        <Ionicons
                          name="close-circle"
                          size={20}
                          color={placeholderColor}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                <View className="mb-3">
                  <ThemedText className={`${textPrimary} font-semibold mb-2`}>
                    Category
                  </ThemedText>
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
                          <ThemedText
                            className={`font-semibold ${
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
                          </ThemedText>
                        </TouchableOpacity>
                      )
                    )}
                  </View>
                </View>

                <View>
                  <ThemedText className={`${textPrimary} font-semibold mb-2`}>
                    Sort By
                  </ThemedText>
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
                        onPress={() => setSortBy(sort.value)}
                      >
                        <ThemedText
                          className={`font-semibold ${
                            sortBy === sort.value ? "text-white" : textSecondary
                          }`}
                        >
                          {sort.label}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <TouchableOpacity
                  className="bg-red-600/20 border border-red-600 p-3 rounded-xl mt-3"
                  onPress={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                    setSortBy("newest");
                  }}
                >
                  <ThemedText className="text-red-400 text-center font-semibold">
                    Clear All Filters
                  </ThemedText>
                </TouchableOpacity>
              </View>
            )}

            <ThemedText className={`${textMuted} mb-3`}>
              Showing {filteredResources.length} of {displayResources.length}{" "}
              resources
            </ThemedText>

            {filteredResources.length === 0 ? (
              <View className="flex-1 items-center justify-center py-10">
                <View className="bg-cyan-500/20 w-20 h-20 rounded-full items-center justify-center mb-4">
                  <Ionicons name="search" size={40} color="#22d3ee" />
                </View>
                <ThemedText className={`${textSecondary} text-center`}>
                  No resources match your filters
                </ThemedText>
                <TouchableOpacity
                  className="mt-4 bg-cyan-500 px-4 py-2 rounded-lg"
                  onPress={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                  }}
                >
                  <ThemedText className="text-white font-semibold">
                    Clear Filters
                  </ThemedText>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={filteredResources}
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
                  <View className="mb-3">
                    {item.subject.is_public && (
                      <View className="bg-green-500/20 px-3 py-1 rounded-t-xl border-b border-green-500/30">
                        <View className="flex-row items-center justify-center">
                          <Ionicons name="globe" size={14} color="#22c55e" />
                          <ThemedText className="text-green-400 text-xs font-bold ml-1">
                            PUBLIC RESOURCE
                          </ThemedText>
                        </View>
                      </View>
                    )}
                    <ResourceCard
                      title={item.title}
                      description={item.description}
                      category={item.category}
                      status={activeTab === "mine" ? item.status : undefined}
                      subjectName={item.subject.name}
                      uploadedBy={
                        item.uploader
                          ? `${item.uploader.first_name} ${item.uploader.last_name}`
                          : "Unknown"
                      }
                      uploadedById={item.uploaded_by}
                      onViewProfile={handleViewProfile}
                      createdAt={formatDate(item.created_at)}
                      downloads={item.downloads_count}
                      views={resourceStats.get(item.id)?.viewCount || 0}
                      averageRating={
                        resourceStats.get(item.id)?.averageRating || 0
                      }
                      ratingCount={resourceStats.get(item.id)?.ratingCount || 0}
                      commentCount={
                        resourceStats.get(item.id)?.commentCount || 0
                      }
                      isBookmarked={bookmarks.has(item.id)}
                      onPress={() => openPreview(item)}
                      onComment={() => {
                        setSelectedResourceId(item.id);
                        setSelectedResourceTitle(item.title);
                        setShowCommentsModal(true);
                      }}
                      onRate={() => {
                        setSelectedResourceId(item.id);
                        setSelectedResourceTitle(item.title);
                        setShowRatingModal(true);
                      }}
                      onReport={() => {
                        setSelectedResourceId(item.id);
                        setSelectedResourceTitle(item.title);
                        setShowReportModal(true);
                      }}
                      onBookmark={() => handleBookmark(item.id)}
                      onShare={() => {
                        setSelectedResourceId(item.id);
                        setSelectedResourceTitle(item.title);
                        setSelectedResourceSubjectId(item.subject?.id);
                        setShowShareModal(true);
                      }}
                      showActions={
                        activeTab === "mine" && item.status === "pending"
                      }
                      onDelete={
                        activeTab === "mine" && item.status === "pending"
                          ? () => handleDeletePress(item.id)
                          : undefined
                      }
                    />
                  </View>
                )}
              />
            )}
          </View>
        )}
      </View>

      {/* Preview Modal */}
      <Modal
        visible={showPreview}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowPreview(false)}
      >
        <View className={`flex-1 ${bg}`}>
          <View
            className={`${bgCard} p-4 pt-12 flex-row items-center justify-between`}
          >
            <TouchableOpacity
              className="p-2"
              onPress={() => setShowPreview(false)}
            >
              <Ionicons
                name="close"
                size={28}
                color={isDark ? "#fff" : "#111827"}
              />
            </TouchableOpacity>
            <ThemedText
              className={`${textPrimary} font-bold text-lg flex-1 text-center`}
              numberOfLines={1}
            >
              {selectedResource?.title}
            </ThemedText>
            <View className="flex-row items-center gap-6">
              <TouchableOpacity
                onPress={async () => {
                  if (selectedResource)
                    await downloadResource(selectedResource);
                }}
              >
                <Ionicons name="download-outline" size={26} color="#22d3ee" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleTranslateClick}
              >
                <Ionicons name="language-outline" size={26} color="#22d3ee" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleEALClick}
              >
                <Ionicons name="sparkles-outline" size={26} color="#22d3ee" />
              </TouchableOpacity>
            </View>
          </View>

          {signedUrl && Platform.OS !== "web" && (
            <WebView
              source={{ uri: signedUrl }}
              style={{ flex: 1 }}
              startInLoadingState={true}
              renderLoading={() => (
                <View className="flex-1 items-center justify-center">
                  <ActivityIndicator size="large" color="#22d3ee" />
                  <ThemedText className={`${textMuted} mt-2`}>
                    Loading preview...
                  </ThemedText>
                </View>
              )}
            />
          )}
        </View>
      </Modal>

      <OnboardingModal
        visible={showTranslateOnboarding}
        onClose={async () => {
          if (user && selectedResource) {
            await setOnboardingSeen(user.id, 'translate');
          }
          setShowTranslateOnboarding(false);
          setTimeout(() => setShowTranslationModal(true), 400);
        }}
        title="Translate Feature"
        description="Here's what you can do:"
        steps={[
          'Translate resources into multiple languages',
          'Choose your target language',
          'Copy or share translated content',
        ]}
      />
      <TranslationModal
        visible={showTranslationModal}
        onClose={() => setShowTranslationModal(false)}
        resourceId={selectedResource?.id ?? ""}
      />

      <OnboardingModal
        visible={showEALOnboarding}
        onClose={async () => {
          if (user && selectedResource) {
            await setOnboardingSeen(user.id, 'eal-adapter');
          }
          setShowEALOnboarding(false);
          setTimeout(() => setShowEALModal(true), 400);
        }}
        title="EAL Adapter Feature"
        description="Here's what you can do:"
        steps={[
          'Adapt resources for English as an Additional Language (EAL) learners',
          'Select a language and simplify content',
          'Download or share adapted resources',
        ]}
      />
      <EALAdapterModal
        visible={showEALModal}
        onClose={() => setShowEALModal(false)}
        resourceId={selectedResource?.id ?? ""}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center p-5">
          <View className={`${bgCard} rounded-2xl p-6 w-full max-w-sm`}>
            <ThemedText className={`${textPrimary} text-xl font-bold mb-2`}>
              Delete Resource?
            </ThemedText>
            <ThemedText className={`${textSecondary} mb-6`}>
              This will permanently delete the file and all its data.
            </ThemedText>
            <View className="flex-row gap-3">
              <TouchableOpacity
                className={`flex-1 ${bgCardAlt} py-3 rounded-xl`}
                onPress={() => {
                  setShowDeleteConfirm(false);
                  setDeleteResourceId(null);
                }}
                disabled={isDeleting}
              >
                <ThemedText className={`${textPrimary} text-center font-bold`}>
                  Cancel
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 bg-red-600 py-3 rounded-xl ${isDeleting ? "opacity-50" : ""}`}
                onPress={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ThemedText className="text-white text-center font-bold">
                    Delete
                  </ThemedText>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {selectedResourceId && (
        <>
          <CommentsModal
            visible={showCommentsModal}
            resourceId={selectedResourceId}
            resourceTitle={selectedResourceTitle}
            onClose={() => setShowCommentsModal(false)}
          />
          <RatingModal
            visible={showRatingModal}
            resourceId={selectedResourceId}
            resourceTitle={selectedResourceTitle}
            onClose={() => setShowRatingModal(false)}
            onRatingSubmitted={handleRatingSubmitted}
          />
          <ReportModal
            visible={showReportModal}
            resourceId={selectedResourceId}
            resourceTitle={selectedResourceTitle}
            onClose={() => setShowReportModal(false)}
          />
          <ShareModal
            visible={showShareModal}
            resourceId={selectedResourceId}
            resourceTitle={selectedResourceTitle}
            subjectId={selectedResourceSubjectId}
            onClose={() => setShowShareModal(false)}
          />
        </>
      )}

      <UserProfileModal
        visible={showProfileModal}
        userId={profileUserId}
        onClose={() => {
          setShowProfileModal(false);
          setProfileUserId(null);
        }}
        onNavigateToPath={(path) => {
          setShowProfileModal(false);
          setProfileUserId(null);
          setTimeout(() => router.push(path), 400);
        }}
      />

      <Toast />
    </ScreenWrapper>
  );
}
