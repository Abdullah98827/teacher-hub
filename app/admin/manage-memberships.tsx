import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import LogoHeader from "../../components/logoHeader";
import ScreenWrapper from "../../components/ScreenWrapper";
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
  const { role, loading: roleLoading } = useUserRole();
  const [memberships, setMemberships] = useState<ActiveMembership[]>([]);
  const [fetching, setFetching] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "single" | "multi">("all");

  useEffect(() => {
    if (!roleLoading && role === "admin") {
      fetchMemberships();
    } else if (!roleLoading && role !== "admin") {
      setFetching(false);
    }
  }, [role, roleLoading]);

  const fetchMemberships = async () => {
    const { data, error } = await supabase
      .from("active_memberships_view")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      Toast.show({
        type: "error",
        text1: "Fetch Failed",
        text2: error.message,
      });
      setMemberships([]);
    } else {
      setMemberships(data || []);
    }

    setFetching(false);
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const filteredMemberships = [...memberships].filter((m) => {
    if (filter === "all") return true;
    return m.tier === filter;
  });

  if (roleLoading || fetching) {
    return (
      <ScreenWrapper>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#22d3ee" />
          <Text className="text-gray-400 mt-4">Loading memberships...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (role !== "admin") {
    return null;
  }

  return (
    <ScreenWrapper>
      <LogoHeader position="left" />

      <View className="flex-1 px-5">
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-3xl font-bold text-cyan-400 mb-2">
              Manage Memberships
            </Text>
            <Text className="text-gray-400">
              View active teacher memberships
            </Text>
          </View>

          <TouchableOpacity
            className="p-2 rounded-full bg-neutral-800 active:scale-95"
            onPress={() => {
              Alert.alert("Filter Memberships", "Choose a tier", [
                { text: "All", onPress: () => setFilter("all") },
                { text: "Single", onPress: () => setFilter("single") },
                { text: "Multi", onPress: () => setFilter("multi") },
                { text: "Cancel", style: "cancel" },
              ]);
            }}
          >
            <Ionicons name="filter" size={20} color="#22d3ee" />
          </TouchableOpacity>
        </View>

        {filteredMemberships.length === 0 ? (
          <View className="bg-neutral-900 p-8 rounded-xl border border-neutral-800">
            <Text className="text-center text-2xl mb-2">📭</Text>
            <Text className="text-center text-gray-400">
              No memberships found
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredMemberships}
            keyExtractor={(item) => item.teacher_id}
            contentContainerStyle={{ paddingBottom: 20 }}
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
            renderItem={({ item }) => (
              <View className="bg-neutral-900 rounded-xl mb-4 border border-neutral-800 overflow-hidden">
                <View className="p-5">
                  <View className="flex-row justify-between items-center mb-4">
                    <Text className="text-white font-bold text-base">
                      {item.email}
                    </Text>
                    <Text className="text-gray-500 text-xs">
                      {formatDate(item.created_at)}
                    </Text>
                  </View>

                  <View className="flex-row items-center gap-2 mb-2">
                    <Text className="text-gray-500 text-xs">Approved:</Text>
                    <Text className="text-sm">
                      {item.approved ? "✅" : "❌"}
                    </Text>
                  </View>

                  <View className="mb-2">
                    <Text className="text-gray-500 text-xs">Tier</Text>
                    <Text className="text-white text-base capitalize">
                      {item.tier === "multi"
                        ? "Multi Subject"
                        : "Single Subject"}
                    </Text>
                  </View>

                  <View className="mb-2">
                    <Text className="text-gray-500 text-xs">Subjects</Text>
                    <Text className="text-gray-200 leading-6">
                      {item.subject_names?.length > 0
                        ? item.subject_names.join(", ")
                        : "None selected"}
                    </Text>
                  </View>

                  <View>
                    <Text className="text-gray-500 text-xs">Status</Text>
                    <Text className="text-green-400 font-semibold text-base">
                      ✅ Active
                    </Text>
                  </View>
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
