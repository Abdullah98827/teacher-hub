import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import LogoHeader from "../../components/logoHeader";
import ScreenWrapper from "../../components/ScreenWrapper";
import { supabase } from "../../supabase";
import { useUserRole } from "../hooks/useUserRole";

interface ManageContactRequest {
  id: string;
  email: string;
  message: string;
  status: string;
  created_at: string;
  user_id: string | null;
  verified?: boolean;
}

export default function ManageContactRequestsScreen() {
  const { role, loading: roleLoading } = useUserRole();
  const [requests, setRequests] = useState<ManageContactRequest[]>([]);
  const [fetching, setFetching] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "resolved">("all");
  const [searchEmail, setSearchEmail] = useState("");

  useEffect(() => {
    if (!roleLoading && role === "admin") {
      fetchRequests();
    } else if (!roleLoading && role !== "admin") {
      setFetching(false);
    }
  }, [role, roleLoading]);

  const fetchRequests = async () => {
    // grabs all contact requests and teacher data
    const { data: rawRequests, error: requestError } = await supabase
      .from("manage_contact_requests")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: teachers, error: teacherError } = await supabase
      .from("teachers")
      .select("id, verified");

    if (requestError || teacherError) {
      Toast.show({
        type: "error",
        text1: "Fetch Failed",
        text2: requestError?.message || teacherError?.message,
      });
      setRequests([]);
      setFetching(false);
      return;
    }

    // adds verified status to each request
    const enriched = rawRequests.map((req) => {
      const teacher = teachers.find((t) => t.id === req.user_id);
      return { ...req, verified: teacher?.verified ?? false };
    });

    setRequests(enriched);
    setFetching(false);
    setRefreshing(false);
  };

  const markAsResolved = async (id: string) => {
    const { error } = await supabase
      .from("manage_contact_requests")
      .update({ status: "resolved" })
      .eq("id", id);

    if (error) {
      Toast.show({
        type: "error",
        text1: "Update Failed",
        text2: error.message,
      });
    } else {
      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Marked as resolved",
      });
      fetchRequests();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  if (roleLoading || fetching) {
    return (
      <ScreenWrapper>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#22d3ee" />
          <Text className="text-gray-400 mt-4">Loading requests...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (role !== "admin") {
    return null;
  }

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const resolvedCount = requests.filter((r) => r.status === "resolved").length;

  // filters by status and email, then sort pending first
  const filteredRequests = [...requests]
    .filter((r) => {
      if (filter === "all") return true;
      return r.status === filter;
    })
    .filter((r) =>
      r.email.toLowerCase().includes(searchEmail.toLowerCase().trim())
    )
    .sort((a, b) => {
      if (a.status === b.status) {
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }
      return a.status === "pending" ? -1 : 1;
    });

  return (
    <ScreenWrapper>
      <LogoHeader position="left" />

      <View className="flex-1 px-5">
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-3xl font-bold text-cyan-400 mb-2">
              Manage Contact Requests
            </Text>
            <View className="flex-row items-center gap-4">
              <View className="flex-row items-center">
                <View className="w-3 h-3 rounded-full bg-orange-500 mr-2" />
                <Text className="text-gray-400">{pendingCount} Pending</Text>
              </View>
              <View className="flex-row items-center">
                <View className="w-3 h-3 rounded-full bg-green-500 mr-2" />
                <Text className="text-gray-400">{resolvedCount} Resolved</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            className="p-2 rounded-full bg-neutral-800 active:scale-95"
            onPress={() => {
              Alert.alert("Filter Requests", "Choose a filter", [
                { text: "All", onPress: () => setFilter("all") },
                { text: "Pending", onPress: () => setFilter("pending") },
                { text: "Resolved", onPress: () => setFilter("resolved") },
                { text: "Cancel", style: "cancel" },
              ]);
            }}
          >
            <Ionicons name="filter" size={20} color="#22d3ee" />
          </TouchableOpacity>
        </View>

        <TextInput
          className="bg-neutral-800 text-white px-4 py-3 rounded-xl mb-4 border border-neutral-700"
          placeholder="Search by email..."
          placeholderTextColor="#9CA3AF"
          value={searchEmail}
          onChangeText={setSearchEmail}
        />

        {filteredRequests.length === 0 ? (
          <View className="bg-neutral-900 p-8 rounded-xl border border-neutral-800">
            <Text className="text-center text-2xl mb-2">📭</Text>
            <Text className="text-center text-gray-400">
              No contact requests found
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredRequests}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchRequests();
                }}
                tintColor="#22d3ee"
              />
            }
            renderItem={({ item }) => (
              <View className="bg-neutral-900 rounded-xl mb-4 border border-neutral-800 overflow-hidden">
                <View className="p-5">
                  <View className="flex-row items-center justify-between mb-4">
                    <View
                      className={`px-3 py-1.5 rounded-full ${
                        item.status === "resolved"
                          ? "bg-green-900"
                          : "bg-orange-900"
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          item.status === "resolved"
                            ? "text-green-400"
                            : "text-orange-400"
                        }`}
                      >
                        {item.status === "resolved"
                          ? "✓ RESOLVED"
                          : "• PENDING"}
                      </Text>
                    </View>
                    <Text className="text-gray-500 text-xs">
                      {formatDate(item.created_at)}
                    </Text>
                  </View>

                  <View className="mb-4">
                    <Text className="text-gray-500 text-xs mb-1">From</Text>
                    <View className="flex-row items-center gap-2">
                      <Text className="text-white text-base font-semibold">
                        {item.email}
                      </Text>
                      <Text className="text-sm">
                        {item.verified ? "✅" : "❌"}
                      </Text>
                    </View>
                  </View>

                  <View className="bg-neutral-800 rounded-lg p-4 mb-4">
                    <Text className="text-gray-500 text-xs mb-2">Message</Text>
                    <Text className="text-gray-200 leading-6">
                      {item.message}
                    </Text>
                  </View>

                  {item.status !== "resolved" ? (
                    <TouchableOpacity
                      className="bg-green-600 p-4 rounded-lg active:scale-95"
                      onPress={() => markAsResolved(item.id)}
                    >
                      <Text className="text-white text-center font-bold">
                        ✓ Mark as Resolved
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View className="bg-green-900/30 p-4 rounded-lg border border-green-800">
                      <Text className="text-green-400 text-center font-semibold">
                        ✓ This request has been resolved
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          />
        )}
      </View>
      <Toast />
    </ScreenWrapper>
  );
}
