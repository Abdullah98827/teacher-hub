import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AdminHeader from "../../components/AdminHeader";
import ScreenWrapper from "../../components/ScreenWrapper";
import { ThemedTextInput } from "../../components/themed-textinput";
import { useAppTheme } from "../../hooks/useAppTheme";
import { supabase } from "../../supabase";

const EVENT_CATEGORIES = {
  AUTH: ["LOGIN_SUCCESS", "LOGIN_FAILED", "SIGNUP_INITIATED", "SIGNUP_COMPLETED", "LOGOUT"],
  ACCOUNT: ["PASSWORD_CHANGED", "PASSWORD_CHANGE_FAILED", "PROFILE_UPDATED", "PROFILE_PICTURE_CHANGED", "PROFILE_PICTURE_DELETED", "THEME_PREFERENCE_CHANGED", "DYSLEXIA_MODE_TOGGLED"],
  RESOURCES: ["RESOURCE_CREATED", "RESOURCE_UPDATED", "RESOURCE_APPROVED", "RESOURCE_REJECTED", "RESOURCE_DELETED", "RESOURCE_BOOKMARKED", "RESOURCE_BOOKMARK_REMOVED"],
  SOCIAL: ["USER_FOLLOWED", "USER_UNFOLLOWED", "RATING_CREATED", "RATING_UPDATED", "RATING_FAILED"],
  COMMENTS: ["COMMENT_CREATED", "COMMENT_DELETED", "COMMENT_FAILED", "COMMENT_DELETE_FAILED"],
  MODERATION: ["RESOURCE_REPORTED", "RESOURCE_REPORT_FAILED", "COMMENT_APPROVED", "COMMENT_REJECTED"],
  CONTENT: ["RESOURCE_TRANSLATED", "TRANSLATION_FAILED", "EAL_ADAPTATION_CREATED", "EAL_ADAPTATION_FAILED"],
  COMMUNICATION: ["DM_SENT", "DM_SEND_FAILED", "GROUP_MESSAGE_SENT", "GROUP_MESSAGE_SEND_FAILED"],
};

const getEventCategory = (eventType) => {
  for (const [category, events] of Object.entries(EVENT_CATEGORIES)) {
    if (events.includes(eventType)) return category;
  }
  return "OTHER";
};

const getCategoryColor = (category) => {
  const colors = {
    AUTH: "#3b82f6",
    ACCOUNT: "#8b5cf6",
    RESOURCES: "#ec4899",
    SOCIAL: "#f59e0b",
    COMMENTS: "#06b6d4",
    MODERATION: "#ef4444",
    CONTENT: "#10b981",
    COMMUNICATION: "#14b8a6",
    OTHER: "#6b7280",
  };
  return colors[category] || colors.OTHER;
};

const getEventIcon = (category) => {
  const icons = {
    AUTH: "log-in",
    ACCOUNT: "person",
    RESOURCES: "document",
    SOCIAL: "heart",
    COMMENTS: "chatbubble",
    MODERATION: "shield-checkmark",
    CONTENT: "language",
    COMMUNICATION: "chatbubbles",
    OTHER: "help-circle",
  };
  return icons[category] || "help-circle";
};

const DATE_RANGES = [
  { label: "Last 24h", value: 1 },
  { label: "Last 7d", value: 7 },
  { label: "Last 30d", value: 30 },
  { label: "All time", value: null },
];

export default function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [userEmailMap, setUserEmailMap] = useState({});
  const [selectedDateRange, setSelectedDateRange] = useState(7); // Default 7 days
  const [pageIndex, setPageIndex] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const { isDark } = useAppTheme();

  const C = {
    bg: isDark ? "#0a0a0a" : "#ffffff",
    surface: isDark ? "#141414" : "#f9fafb",
    surfaceHi: isDark ? "#1f1f1f" : "#f3f4f6",
    border: isDark ? "#252525" : "#e5e7eb",
    borderHi: isDark ? "#2e2e2e" : "#d1d5db",
    accent: "#22d3ee",
    accentText: isDark ? "#0a0a0a" : "#000000",
    textPrimary: isDark ? "#e5e5e5" : "#111827",
    textSecondary: isDark ? "#9ca3af" : "#6b7280",
    textMuted: isDark ? "#6b7280" : "#9ca3af",
    green: "#34d399",
    red: "#f87171",
  };

  // Define fetchLogs with useCallback - ONLY depend on selectedDateRange
  const fetchLogs = useCallback(async (pageNum = 0, isLoadingMore = false, currentLogs = []) => {
    if (!isLoadingMore) setLoading(true);
    else setLoadingMore(true);

    // Calculate date range
    let fromDate = null;
    if (selectedDateRange) {
      const now = new Date();
      fromDate = new Date(now.getTime() - selectedDateRange * 24 * 60 * 60 * 1000);
    }

    const offset = pageNum === 0 ? 0 : 50 + (pageNum - 1) * 30;
    const limit = pageNum === 0 ? 50 : 30;

    let query = supabase
      .from("app_logs")
      .select("*")
      .order("created_at", { ascending: false });

    if (fromDate) {
      query = query.gte("created_at", fromDate.toISOString());
    }

    const { data, error } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching logs:", error);
    } else {
      const newLogs = data || [];

      // Check if there are more records
      if (newLogs.length < limit) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }

      if (isLoadingMore) {
        setLogs((prevLogs) => [...prevLogs, ...newLogs]);
      } else {
        setLogs(newLogs);
      }

      // Fetch user emails for all unique user_ids
      if (newLogs && newLogs.length > 0) {
        const uniqueUserIds = [
          ...new Set(
            [...(isLoadingMore ? currentLogs : []), ...newLogs]
              .map((log) => log.user_id)
              .filter(Boolean)
          ),
        ];

        if (uniqueUserIds.length > 0) {
          const { data: teachersData } = await supabase
            .from("teachers")
            .select("id, email, first_name, last_name")
            .in("id", uniqueUserIds);

          if (teachersData) {
            const emailMap = {};
            teachersData.forEach((teacher) => {
              emailMap[teacher.id] = {
                email: teacher.email,
                name: `${teacher.first_name} ${teacher.last_name}`,
              };
            });
            setUserEmailMap((prev) => ({ ...prev, ...emailMap }));
          }
        }
      }
    }

    if (!isLoadingMore) setLoading(false);
    else setLoadingMore(false);
  }, [selectedDateRange]);

  useEffect(() => {
    setPageIndex(0);
    fetchLogs(0, false, []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDateRange]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = pageIndex + 1;
      setPageIndex(nextPage);
      fetchLogs(nextPage, true);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesCategory = !selectedCategory || getEventCategory(log.event_type) === selectedCategory;
    const userEmail = userEmailMap[log.user_id]?.email || "";
    const userName = userEmailMap[log.user_id]?.name || "";
    const matchesSearch =
      log.event_type.toLowerCase().includes(searchText.toLowerCase()) ||
      log.user_id?.toLowerCase().includes(searchText.toLowerCase()) ||
      userEmail.toLowerCase().includes(searchText.toLowerCase()) ||
      userName.toLowerCase().includes(searchText.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const formatUserShort = (userId) => {
    if (!userId) return "System";
    return userId.substring(0, 8);
  };

  const renderLogItem = ({ item }) => {
    const category = getEventCategory(item.event_type);
    const categoryColor = getCategoryColor(category);
    const isExpanded = expandedId === item.id;
    const isFailed = item.event_type.includes("FAILED");

    return (
      <TouchableOpacity
        onPress={() => setExpandedId(isExpanded ? null : item.id)}
        activeOpacity={0.7}
        style={{
          backgroundColor: C.surface,
          marginBottom: 10,
          marginHorizontal: 16,
          borderRadius: 12,
          borderLeftWidth: 4,
          borderLeftColor: categoryColor,
          overflow: "hidden",
        }}
      >
        {/* Log Header */}
        <View style={{ padding: 14, paddingRight: 50 }}>
          {/* Event Type and Category Badge */}
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 8 }}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                backgroundColor: categoryColor + "20",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons name={getEventIcon(category)} size={14} color={categoryColor} />
            </View>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: categoryColor,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                flex: 1,
              }}
            >
              {category}
            </Text>
            {isFailed && (
              <View
                style={{
                  backgroundColor: C.red + "20",
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 4,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: "600", color: C.red }}>FAILED</Text>
              </View>
            )}
          </View>

          {/* Event Name */}
          <Text
            style={{
              fontSize: 15,
              fontWeight: "700",
              color: C.textPrimary,
              marginBottom: 8,
              letterSpacing: -0.3,
            }}
          >
            {item.event_type}
          </Text>

          {/* Metadata Row */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 12, color: C.textMuted }} numberOfLines={1}>
              {userEmailMap[item.user_id]?.email || formatUserShort(item.user_id)}
            </Text>
            <Text style={{ fontSize: 12, color: C.textMuted }}>
              {formatTime(item.created_at)}
            </Text>
          </View>
        </View>

        {/* Expand/Collapse Arrow */}
        <TouchableOpacity
          style={{
            position: "absolute",
            right: 12,
            top: 16,
            width: 32,
            height: 32,
            justifyContent: "center",
            alignItems: "center",
          }}
          onPress={() => setExpandedId(isExpanded ? null : item.id)}
        >
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={C.textSecondary}
          />
        </TouchableOpacity>

        {/* Expanded Details */}
        {isExpanded && (
          <View style={{ backgroundColor: C.surfaceHi, borderTopWidth: 1, borderTopColor: C.border }}>
            {/* Full Timestamp */}
            <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 }}>
              <Text style={{ fontSize: 11, fontWeight: "600", color: C.textMuted, textTransform: "uppercase" }}>
                Time
              </Text>
              <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 4 }}>
                {new Date(item.created_at).toLocaleString()}
              </Text>
            </View>

            {/* User Info */}
            {userEmailMap[item.user_id] ? (
              <>
                <View style={{ paddingHorizontal: 14, paddingVertical: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: "600", color: C.textMuted, textTransform: "uppercase" }}>
                    User
                  </Text>
                  <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 4 }}>
                    {userEmailMap[item.user_id].name}
                  </Text>
                  <Text style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                    {userEmailMap[item.user_id].email}
                  </Text>
                </View>

                <View style={{ paddingHorizontal: 14, paddingVertical: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: "600", color: C.textMuted, textTransform: "uppercase" }}>
                    User ID
                  </Text>
                  <Text
                    style={{ fontSize: 11, color: C.textSecondary, marginTop: 4, fontFamily: "monospace" }}
                    numberOfLines={1}
                  >
                    {item.user_id}
                  </Text>
                </View>
              </>
            ) : (
              <View style={{ paddingHorizontal: 14, paddingVertical: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: "600", color: C.textMuted, textTransform: "uppercase" }}>
                  User ID
                </Text>
                <Text
                  style={{ fontSize: 11, color: C.textSecondary, marginTop: 4, fontFamily: "monospace" }}
                  numberOfLines={1}
                >
                  {item.user_id || "System"}
                </Text>
              </View>
            )}

            {/* Target Info */}
            {item.target_id && (
              <View style={{ paddingHorizontal: 14, paddingVertical: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: "600", color: C.textMuted, textTransform: "uppercase" }}>
                  Target
                </Text>
                <Text style={{ fontSize: 12, color: C.textSecondary, marginTop: 4 }}>
                  {item.target_table} • {item.target_id.substring(0, 8)}
                </Text>
              </View>
            )}

            {/* Details */}
            {item.details && Object.keys(item.details).length > 0 && (
              <View style={{ paddingHorizontal: 14, paddingVertical: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: "600", color: C.textMuted, textTransform: "uppercase" }}>
                  Details
                </Text>
                {Object.entries(item.details).map(([key, value]) => (
                  <View key={key} style={{ marginTop: 8 }}>
                    <Text style={{ fontSize: 11, color: C.textMuted, fontWeight: "500" }}>
                      {key}:
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        color: C.textSecondary,
                        marginTop: 2,
                        fontFamily: "monospace",
                      }}
                      numberOfLines={2}
                    >
                      {typeof value === "object" ? JSON.stringify(value) : String(value)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* IP Address if available */}
            {item.ip_address && (
              <View style={{ paddingHorizontal: 14, paddingVertical: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: "600", color: C.textMuted, textTransform: "uppercase" }}>
                  IP Address
                </Text>
                <Text style={{ fontSize: 11, color: C.textSecondary, marginTop: 4 }}>
                  {item.ip_address}
                </Text>
              </View>
            )}

            <View style={{ height: 8 }} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const categories = ["ALL", ...Object.keys(EVENT_CATEGORIES)];

  return (
    <ScreenWrapper>
      <AdminHeader title="View Application Logs" subtitle="Review all application-wide events" />

      <View style={{ flex: 1, paddingHorizontal: 0, paddingVertical: 12 }}>
        {/* Search and Filters */}
        <View style={{ paddingHorizontal: 16, marginBottom: 12, gap: 12 }}>
          {/* Search */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.surface, borderRadius: 10, paddingHorizontal: 12 }}>
            <Ionicons name="search-outline" size={16} color={C.textMuted} />
            <ThemedTextInput
              style={{ flex: 1, color: C.textPrimary, fontSize: 13, paddingVertical: 10 }}
              placeholder="Search by email, event type, or user ID…"
              placeholderTextColor={C.textMuted}
              value={searchText}
              onChangeText={setSearchText}
            />
            {searchText && (
              <TouchableOpacity onPress={() => setSearchText("")}>
                <Ionicons name="close-circle" size={16} color={C.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Date Range Filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
            {DATE_RANGES.map((range) => {
              const isSelected = selectedDateRange === range.value;
              return (
                <TouchableOpacity
                  key={range.label}
                  onPress={() => setSelectedDateRange(range.value)}
                  style={{
                    backgroundColor: isSelected ? C.accent : C.surface,
                    borderWidth: isSelected ? 0 : 1,
                    borderColor: C.border,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 6,
                    marginRight: 8,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={12}
                    color={isSelected ? C.accentText : C.textSecondary}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: isSelected ? C.accentText : C.textSecondary,
                    }}
                  >
                    {range.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Category Filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
            {categories.map((cat) => {
              const isSelected = selectedCategory === (cat === "ALL" ? null : cat);
              const color = getCategoryColor(cat);

              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setSelectedCategory(cat === "ALL" ? null : cat)}
                  style={{
                    backgroundColor: isSelected ? color : C.surface,
                    borderWidth: isSelected ? 0 : 1,
                    borderColor: C.border,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 6,
                    marginRight: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: isSelected ? C.accentText : C.textSecondary,
                    }}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Results count */}
          <Text style={{ fontSize: 12, color: C.textMuted }}>
            {filteredLogs.length} event{filteredLogs.length !== 1 ? "s" : ""} loaded
          </Text>
        </View>

        {/* Logs List */}
        {loading ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" color={C.accent} />
          </View>
        ) : filteredLogs.length === 0 ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 }}>
            <Ionicons name="filter-outline" size={48} color={C.textMuted} style={{ marginBottom: 12 }} />
            <Text style={{ fontSize: 16, fontWeight: "600", color: C.textPrimary, textAlign: "center" }}>
              No events found
            </Text>
            <Text style={{ fontSize: 13, color: C.textMuted, marginTop: 6, textAlign: "center" }}>
              Try adjusting your search or filters
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredLogs}
            renderItem={renderLogItem}
            keyExtractor={(item) => item.id}
            onRefresh={() => {
              setPageIndex(0);
              fetchLogs(0, false);
            }}
            refreshing={loading}
            scrollEnabled={true}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              loadingMore ? (
                <View style={{ paddingVertical: 16, alignItems: "center" }}>
                  <ActivityIndicator size="small" color={C.accent} />
                  <Text style={{ fontSize: 12, color: C.textMuted, marginTop: 6 }}>
                    Loading more...
                  </Text>
                </View>
              ) : !hasMore && filteredLogs.length > 0 ? (
                <View style={{ paddingVertical: 12, alignItems: "center" }}>
                  <Text style={{ fontSize: 12, color: C.textMuted }}>
                    All logs loaded
                  </Text>
                </View>
              ) : null
            }
          />
        )}
      </View>
    </ScreenWrapper>
  );
}
