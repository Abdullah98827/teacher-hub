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
import MembershipCard from "../../components/MembershipCard";
import ScreenWrapper from "../../components/ScreenWrapper";
import StatsSummary from "../../components/StatsSummary";
import TabFilter from "../../components/TabFilter";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../supabase";
import { useUserRole } from "../hooks/useUserRole";

interface ActiveMembership {
  teacher_id: string;
  email: string;
  approved: boolean;
  tier: string;
  subject_ids: string[];
  subject_names: string[];
  active: boolean;
  created_at: string;
}

export default function ManageMembershipsScreen() {
  const { user } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const router = useRouter();
  const [memberships, setMemberships] = useState<ActiveMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "single" | "multi">("all");

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

  const fetchMemberships = async () => {
    try {
      const { data, error } = await supabase
        .from("active_memberships_view")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setMemberships(data || []);
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Failed to load memberships",
        text2: error.message,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!roleLoading && isAdmin) {
      fetchMemberships();
    }
  }, [isAdmin, roleLoading]);

  const filteredMemberships = memberships.filter((m) => {
    if (filter === "all") return true;
    return m.tier === filter;
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

  const singleCount = memberships.filter((m) => m.tier === "single").length;
  const multiCount = memberships.filter((m) => m.tier === "multi").length;
  const approvedCount = memberships.filter((m) => m.approved).length;

  return (
    <ScreenWrapper>
      <View className="flex-1 px-5 pt-4">
        <AdminHeader
          title="Memberships"
          subtitle={`${memberships.length} active membership${memberships.length !== 1 ? "s" : ""}`}
        />

        <StatsSummary
          stats={[
            { label: "Total", value: memberships.length, color: "cyan" },
            { label: "Single", value: singleCount, color: "cyan" },
            { label: "Multi", value: multiCount, color: "purple" },
            { label: "Approved", value: approvedCount, color: "green" },
          ]}
        />

        <TabFilter
          tabs={[
            { key: "all", label: "All", count: memberships.length },
            { key: "single", label: "Single", count: singleCount },
            { key: "multi", label: "Multi", count: multiCount },
          ]}
          activeTab={filter}
          onTabChange={(key) => setFilter(key as any)}
        />

        {filteredMemberships.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <View className="bg-cyan-500/20 w-20 h-20 rounded-full items-center justify-center mb-4">
              <Ionicons name="card-outline" size={40} color="#22d3ee" />
            </View>
            <Text className="text-white text-xl font-bold mb-2">
              No Memberships
            </Text>
            <Text className="text-gray-400 text-center">
              No memberships match your filter
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredMemberships}
            keyExtractor={(item) => item.teacher_id}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchMemberships();
                }}
                tintColor="#22d3ee"
              />
            }
            renderItem={({ item }) => <MembershipCard membership={item} />}
          />
        )}
      </View>
      <Toast />
    </ScreenWrapper>
  );
}
