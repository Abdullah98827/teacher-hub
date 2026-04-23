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
import OnboardingModal from "../../components/OnboardingModal";
import RatingModal from "../../components/RatingModal";
import ReportModal from "../../components/ReportModal";
import ResourceCard from "../../components/ResourceCard";
import ScreenWrapper from "../../components/ScreenWrapper";
import ShareModal from "../../components/ShareModal";
import { ThemedText } from "../../components/themed-text";
import TranslationModal from "../../components/TranslationModal";
import UserProfileModal from "../../components/UserProfileModal";
import { useAuth } from "../../contexts/AuthContext";
import { useAppTheme } from "../../hooks/useAppTheme";
import { supabase } from "../../supabase";
import { logEvent } from "../../utils/logging";
import {
  hasSeenOnboarding,
  setOnboardingSeen,
} from "../../utils/onboardingHelpers";
import {
  getBookmarksBatched,
  getResourcesStatsBatched,
  getUploadersBatched,
  getUserRatingsBatched,
  toggleBookmark,
  trackResourceView
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
  const [selectedResourceSubjectId, setSelectedResourceSubjectId] =
    useState(null);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showTranslateOnboarding, setShowTranslateOnboarding] =
    useState(false);
  const [showEALOnboarding, setShowEALOnboarding] = useState(false);

  // BATCHED enrichment function - replaces individual Promise.all loops
  const enrichResourcesBatched = useCallback(
    async (resourcesToEnrich) => {
      if (!resourcesToEnrich || resourcesToEnrich.length === 0) return [];

      const resourceIds = resourcesToEnrich.map((r) => r.id);
      const uploaderIds = resourcesToEnrich.map((r) => r.uploaded_by);

      // Single batch query for stats, uploaders, and bookmarks
      const [statsMap, uploaderMap, bookmarkSet, userRatingsMap] =
        await Promise.all([
          getResourcesStatsBatched(resourceIds),
          getUploadersBatched(uploaderIds),
          user?.id
            ? getBookmarksBatched(resourceIds, user.id)
            : Promise.resolve(new Set()),
          user?.id
            ? getUserRatingsBatched(resourceIds, user.id)
            : Promise.resolve(new Map()),
        ]);

      // Enrich resources with all data
      return resourcesToEnrich.map((resource) => ({
        ...resource,
        stats: statsMap.get(resource.id) || {
          averageRating: 0,
          ratingCount: 0,
          commentCount: 0,
          viewCount: 0,
          downloadsCount: 0,
        },
        uploader: uploaderMap.get(resource.uploaded_by) || {
          first_name: "Unknown",
          last_name: "",
        },
        isBookmarked: bookmarkSet.has(resource.id),
        userRating: userRatingsMap.get(resource.id) || 0,
      }));
    },
    [user?.id]
  );

  const fetchResources = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

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
          .select(
            "id, title, description, category, uploaded_by, created_at, status, downloads_count, view_count, file_url, subject:subjects(name, is_public, id)"
          )
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
          setMyResources([]);
          setSavedResources([]);
          setLoading(false);
          setRefreshing(false);
          return;
        }

        const { data } = await supabase
          .from("resources")
          .select(
            "id, title, description, category, uploaded_by, created_at, status, downloads_count, view_count, file_url, subject:subjects(name, is_public, id)"
          )
          .eq("status", "approved")
          .in("subject_id", allAccessibleSubjectIds)
          .order("created_at", { ascending: false });
        approvedData = data;
      }

      const { data: myData } = await supabase
        .from("resources")
        .select(
          "id, title, description, category, uploaded_by, created_at, status, downloads_count, view_count, file_url, subject:subjects(name, is_public, id)"
        )
        .eq("uploaded_by", user.id)
        .order("created_at", { ascending: false });

      // BATCHED enrichment instead of per-resource queries
      const enrichedApproved = await enrichResourcesBatched(approvedData || []);
      const enrichedMy = await enrichResourcesBatched(myData || []);

      setResources(enrichedApproved);
      setMyResources(enrichedMy);

      // Get saved resources
      const { data: bookmarkedIds } = await supabase
        .from("resource_bookmarks")
        .select("resource_id")
        .eq("user_id", user.id);

      if (bookmarkedIds && bookmarkedIds.length > 0) {
        const bookmarkedResourceIds = bookmarkedIds.map((b) => b.resource_id);
        const savedList = enrichedApproved.filter((r) =>
          bookmarkedResourceIds.includes(r.id)
        );
        setSavedResources(savedList);
      } else {
        setSavedResources([]);
      }

      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error("Error fetching resources:", error);
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, enrichResourcesBatched]);

  const fetchFollowingResources = useCallback(async () => {
    if (!user?.id) return;

    try {
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
        .select(
          "id, title, description, category, uploaded_by, created_at, status, downloads_count, view_count, file_url, subject:subjects(name, is_public, id)"
        )
        .eq("status", "approved")
        .in("uploaded_by", followingIds)
        .order("created_at", { ascending: false });

      // BATCHED enrichment
      const enriched = await enrichResourcesBatched(data || []);
      setFollowingResources(enriched);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching following resources:", error);
      setLoading(false);
    }
  }, [user?.id, enrichResourcesBatched]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  useEffect(() => {
    if (activeTab === "following") {
      fetchFollowingResources();
    }
  }, [activeTab, fetchFollowingResources]);

  useEffect(() => {
    if (user && user.id) {
      hasSeenOnboarding(user.id, "library").then((seen) => {
        if (!seen) {
          setShowOnboarding(true);
        }
      });
    }
  }, [user]);

  const handleCloseOnboarding = () => {
    if (user && user.id) {
      setOnboardingSeen(user.id, "library");
    }
    setShowOnboarding(false);
  };

  // Handle opening a specific resource from deep link
  useEffect(() => {
    if (openResourceId && resources.length > 0) {
      const resource = resources.find((r) => r.id === openResourceId);
      if (resource) {
        setSelectedResource(resource);
        setSelectedResourceId(resource.id);
        setSelectedResourceTitle(resource.title);
        setSelectedResourceSubjectId(resource.subject?.id);

        (async () => {
          try {
            if (user?.id) {
              await trackResourceView(resource.id, user.id);
            }
            const url = await getSignedUrl(resource.file_url, 600);
            if (url) {
              setSignedUrl(url);
            }
          } catch (err) {
            console.error("Error loading resource preview:", err);
          }
        })();

        setTimeout(() => {
          setShowPreview(true);
        }, 100);

        if (activeTabParam === "comments") {
          setTimeout(() => {
            setShowPreview(false);
            setShowCommentsModal(true);
          }, 600);
        } else if (activeTabParam === "ratings") {
          setTimeout(() => {
            setShowPreview(false);
            setShowRatingModal(true);
          }, 600);
        }

        router.setParams({
          openResourceId: undefined,
          activeTab: undefined,
        });
      }
    }
  }, [openResourceId, resources, user?.id, router, activeTabParam]);

  const handleTranslateClick = async () => {
    if (!user || !selectedResource) return;
    const seen = await hasSeenOnboarding(user.id, "translate");
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
    const seen = await hasSeenOnboarding(user.id, "eal-adapter");
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
    try {
      if (user?.id) {
        await trackResourceView(resource.id, user.id);
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
    } catch (error) {
      console.error("Error opening preview:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to open preview",
      });
    }
  };

  const downloadResource = async (resource) => {
    try {
      await supabase
        .from("resources")
        .update({
          downloads_count: (resource.downloads_count || 0) + 1,
        })
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
      Toast.show({
        type: "success",
        text1: "Downloading resource...",
      });
      setShowPreview(false);
      fetchResources();
    } catch (error) {
      console.error("Error downloading:", error);
      Toast.show({
        type: "error",
        text1: "Download failed",
        text2: error.message,
      });
    }
  };

  const deleteResource = async (resourceId) => {
    if (isDeleting) return;
    setIsDeleting(true);

    try {
      const resourceToDelete = myResources.find((r) => r.id === resourceId);
      if (!resourceToDelete) {
        Toast.show({
          type: "error",
          text1: "Resource not found",
        });
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
        Toast.show({
          type: "error",
          text1: "Failed to delete file",
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
        Toast.show({
          type: "error",
          text1: "Failed to delete",
        });
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

      Toast.show({
        type: "success",
        text1: "Resource deleted",
      });
      setIsDeleting(false);
      fetchResources();
    } catch (error) {
      console.error("Error deleting resource:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message,
      });
      setIsDeleting(false);
    }
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

    try {
      const result = await toggleBookmark(resourceId, user.id);
      if (result.success) {
        if (result.isBookmarked) {
          logEvent({
            event_type: "RESOURCE_BOOKMARKED",
            user_id: user.id,
            target_id: resourceId,
            target_table: "resources",
          });
          Toast.show({
            type: "success",
            text1: "Resource saved!",
          });
        } else {
          logEvent({
            event_type: "RESOURCE_BOOKMARK_REMOVED",
            user_id: user.id,
            target_id: resourceId,
            target_table: "resources",
          });
          Toast.show({
            type: "success",
            text1: "Resource removed",
          });
        }
        fetchResources();
      }
    } catch (error) {
      console.error("Error toggling bookmark:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to update bookmark",
      });
    }
  };

  const handleRatingSubmitted = async () => {
    fetchResources();
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
        return (b.downloads_count || 0) - (a.downloads_count || 0);
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
          "Browse and search teaching resources",
          "Bookmark resources for later",
          "Download and share materials",
          "Rate and comment on resources",
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
                {
                  key: "browse",
                  label: `Browse (${resources.length})`,
                },
                {
                  key: "saved",
                  label: `Saved (${savedResources.length})`,
                },
                {
                  key: "mine",
                  label: `My Uploads (${myResources.length})`,
                },
                {
                  key: "following",
                  label: `Following (${followingResources.length})`,
                },
              ].map(({ key, label }) => (
                <TouchableOpacity
                  key={key}
                  className={`py-3 px-4 rounded-xl ${
                    activeTab === key ? "bg-cyan-500" : bgCardAlt
                  }`}
                  onPress={() => setActiveTab(key)}
                >
                  <ThemedText
                    className={`text-center font-bold ${
                      activeTab === key ? "text-white" : textSecondary
                    }`}
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
            <ThemedText className="text-white font-bold ml-2">
              Upload Resource
            </ThemedText>
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
                  <ThemedText
                    className={`${textPrimary} font-semibold mb-2`}
                  >
                    Search
                  </ThemedText>
                  <View
                    className={`${bgInput} flex-row items-center px-3 py-2 rounded-xl ${borderInput} border`}
                  >
                    <Ionicons
                      name="search"
                      size={20}
                      color={placeholderColor}
                    />
                    <TextInput
                      className={`flex-1 ${textPrimary} ml-2`}
                      placeholder="Search by title..."
                      placeholderTextColor={placeholderColor}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                    {searchQuery !== "" && (
                      <TouchableOpacity
                        onPress={() => setSearchQuery("")}
                      >
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
                  <ThemedText
                    className={`${textPrimary} font-semibold mb-2`}
                  >
                    Category
                  </ThemedText>
                  <View className="flex-row flex-wrap gap-2">
                    {[
                      "all",
                      "powerpoint",
                      "worksheet",
                      "lesson_plan",
                    ].map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        className={`px-3 py-2 rounded-lg ${
                          selectedCategory === cat
                            ? "bg-cyan-500"
                            : bgCardAlt
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
                    ))}
                  </View>
                </View>

                <View>
                  <ThemedText
                    className={`${textPrimary} font-semibold mb-2`}
                  >
                    Sort By
                  </ThemedText>
                  <View className="flex-row gap-2">
                    {[
                      { value: "newest", label: "Newest" },
                      { value: "oldest", label: "Oldest" },
                      {
                        value: "downloads",
                        label: "Most Downloaded",
                      },
                    ].map((sort) => (
                      <TouchableOpacity
                        key={sort.value}
                        className={`px-3 py-2 rounded-lg ${
                          sortBy === sort.value
                            ? "bg-cyan-500"
                            : bgCardAlt
                        }`}
                        onPress={() => setSortBy(sort.value)}
                      >
                        <ThemedText
                          className={`font-semibold ${
                            sortBy === sort.value
                              ? "text-white"
                              : textSecondary
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
                    {item.subject?.is_public && (
                      <View className="bg-green-500/20 px-3 py-1 rounded-t-xl border-b border-green-500/30">
                        <View className="flex-row items-center justify-center">
                          <Ionicons
                            name="globe"
                            size={14}
                            color="#22c55e"
                          />
                          <ThemedText className="text-green-400 text-xs font-bold ml-1">
                            PUBLIC RESOURCE
                          </ThemedText>
                        </View>
                      </View>
                    )}
                    <ResourceCard
                      id={item.id}
                      title={item.title}
                      description={item.description}
                      category={item.category}
                      status={
                        activeTab === "mine"
                          ? item.status
                          : undefined
                      }
                      subjectName={
                        item.subject?.name || "General"
                      }
                      uploadedBy={`${item.uploader?.first_name || "Unknown"} ${item.uploader?.last_name || ""}`}
                      uploadedById={item.uploaded_by}
                      createdAt={formatDate(
                        item.created_at
                      )}
                      downloads={
                        item.stats?.downloadsCount || 0
                      }
                      views={
                        item.stats?.viewCount || 0
                      }
                      averageRating={
                        item.stats?.averageRating || 0
                      }
                      ratingCount={
                        item.stats?.ratingCount || 0
                      }
                      commentCount={
                        item.stats?.commentCount || 0
                      }
                      isBookmarked={item.isBookmarked}
                      onPress={() => openPreview(item)}
                      onViewProfile={handleViewProfile}
                      onComment={() => {
                        setSelectedResourceId(
                          item.id
                        );
                        setSelectedResourceTitle(
                          item.title
                        );
                        setShowCommentsModal(true);
                      }}
                      onRate={() => {
                        setSelectedResourceId(
                          item.id
                        );
                        setSelectedResourceTitle(
                          item.title
                        );
                        setShowRatingModal(true);
                      }}
                      onReport={() => {
                        setSelectedResourceId(
                          item.id
                        );
                        setSelectedResourceTitle(
                          item.title
                        );
                        setShowReportModal(true);
                      }}
                      onBookmark={() =>
                        handleBookmark(item.id)
                      }
                      onShare={() => {
                        setSelectedResourceId(
                          item.id
                        );
                        setSelectedResourceTitle(
                          item.title
                        );
                        setSelectedResourceSubjectId(
                          item.subject?.id
                        );
                        setShowShareModal(true);
                      }}
                      showActions={
                        activeTab === "mine" &&
                        item.status ===
                          "pending"
                      }
                      onDelete={
                        activeTab === "mine" &&
                        item.status ===
                          "pending"
                          ? () =>
                              handleDeletePress(
                                item.id
                              )
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
                    await downloadResource(
                      selectedResource
                    );
                }}
              >
                <Ionicons
                  name="download-outline"
                  size={26}
                  color="#22d3ee"
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleTranslateClick}>
                <Ionicons
                  name="language-outline"
                  size={26}
                  color="#22d3ee"
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleEALClick}>
                <Ionicons
                  name="sparkles-outline"
                  size={26}
                  color="#22d3ee"
                />
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
                  <ActivityIndicator
                    size="large"
                    color="#22d3ee"
                  />
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
            await setOnboardingSeen(user.id, "translate");
          }
          setShowTranslateOnboarding(false);
          setTimeout(() => setShowTranslationModal(true), 400);
        }}
        title="Translate Feature"
        description="Here's what you can do:"
        steps={[
          "Translate resources into multiple languages",
          "Choose your target language",
          "Copy or share translated content",
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
            await setOnboardingSeen(user.id, "eal-adapter");
          }
          setShowEALOnboarding(false);
          setTimeout(() => setShowEALModal(true), 400);
        }}
        title="EAL Adapter Feature"
        description="Here's what you can do:"
        steps={[
          "Adapt resources for English as an Additional Language (EAL) learners",
          "Select a language and simplify content",
          "Download or share adapted resources",
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
            <ThemedText
              className={`${textPrimary} text-xl font-bold mb-2`}
            >
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
                <ThemedText
                  className={`${textPrimary} text-center font-bold`}
                >
                  Cancel
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 bg-red-600 py-3 rounded-xl ${
                  isDeleting ? "opacity-50" : ""
                }`}
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