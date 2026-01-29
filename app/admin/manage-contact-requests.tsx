import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import AdminHeader from "../../components/AdminHeader";
import ContactRequestCard from "../../components/ContactRequestCard";
import ScreenWrapper from "../../components/ScreenWrapper";
import SearchBar from "../../components/SearchBar";
import StatsSummary from "../../components/StatsSummary";
import TabFilter from "../../components/TabFilter";
import { useAuth } from "../../contexts/AuthContext";
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
  const { user } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const router = useRouter();
  const [requests, setRequests] = useState<ManageContactRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "resolved">("all");
  const [searchQuery, setSearchQuery] = useState("");

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

  const fetchRequests = async () => {
    try {
      const { data: rawRequests, error: requestError } = await supabase
        .from("manage_contact_requests")
        .select("*")
        .order("created_at", { ascending: false });

      const { data: teachers, error: teacherError } = await supabase
        .from("teachers")
        .select("id, verified");

      if (requestError || teacherError) throw requestError || teacherError;

      const enriched = (rawRequests || []).map((req) => {
        const teacher = teachers?.find((t) => t.id === req.user_id);
        return { ...req, verified: teacher?.verified ?? false };
      });

      setRequests(enriched);
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Failed to load requests",
        text2: error.message,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!roleLoading && isAdmin) {
      fetchRequests();
    }
  }, [isAdmin, roleLoading]);

  const markAsResolved = async (id: string) => {
    try {
      const { error } = await supabase
        .from("manage_contact_requests")
        .update({ status: "resolved" })
        .eq("id", id);

      if (error) throw error;

      Toast.show({
        type: "success",
        text1: "Request resolved",
      });
      fetchRequests();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Failed to update",
        text2: error.message,
      });
    }
  };

  const filteredRequests = [...requests]
    .filter((r) => {
      if (filter === "all") return true;
      return r.status === filter;
    })
    .filter((r) =>
      r.email.toLowerCase().includes(searchQuery.toLowerCase().trim())
    )
    .sort((a, b) => {
      if (a.status === b.status) {
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }
      return a.status === "pending" ? -1 : 1;
    });

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

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const resolvedCount = requests.filter((r) => r.status === "resolved").length;

  return (
    <ScreenWrapper>
      <View className="flex-1 px-5 pt-4">
        <AdminHeader
          title="Contact Requests"
          subtitle={`${requests.length} total request${requests.length !== 1 ? "s" : ""}`}
        />

        <StatsSummary
          stats={[
            { label: "Total", value: requests.length, color: "cyan" },
            { label: "Pending", value: pendingCount, color: "orange" },
            { label: "Resolved", value: resolvedCount, color: "green" },
          ]}
        />

        <TabFilter
          tabs={[
            { key: "all", label: "All", count: requests.length },
            { key: "pending", label: "Pending", count: pendingCount },
            { key: "resolved", label: "Resolved", count: resolvedCount },
          ]}
          activeTab={filter}
          onTabChange={(key) => setFilter(key as any)}
        />

        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by email..."
        />

        {filteredRequests.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <View className="bg-cyan-500/20 w-20 h-20 rounded-full items-center justify-center mb-4">
              <Ionicons name="mail-outline" size={40} color="#22d3ee" />
            </View>
            <Text className="text-white text-xl font-bold mb-2">
              No Requests
            </Text>
            <Text className="text-gray-400 text-center">
              No contact requests match your filter
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredRequests}
            keyExtractor={(item) => item.id}
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
              <ContactRequestCard
                request={item}
                onMarkResolved={() => markAsResolved(item.id)}
              />
            )}
          />
        )}
      </View>
      <Toast />
    </ScreenWrapper>
  );
}
