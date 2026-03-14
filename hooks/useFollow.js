import { useEffect, useState } from "react";
import Toast from "react-native-toast-message";
import { supabase } from "../supabase";

/**
 * Hook to manage following/unfollowing users
 *
 * Usage:
 * const { isFollowing, followersCount, followingCount, toggleFollow, loading } = useFollow(userId);
 */
export function useFollow(targetUserId) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (targetUserId && currentUserId) {
      loadFollowStatus();
      loadFollowCounts();
    }
  }, [targetUserId, currentUserId]);

  const getCurrentUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const loadFollowStatus = async () => {
    if (!currentUserId || !targetUserId) return;

    const { data, error } = await supabase.rpc("is_following", {
      follower_uuid: currentUserId,
      following_uuid: targetUserId,
    });

    if (error) {
      console.error("Error checking follow status:", error);
    } else {
      setIsFollowing(data || false);
    }
  };

  const loadFollowCounts = async () => {
    if (!targetUserId) return;

    const { data, error } = await supabase.rpc("get_follow_stats", {
      teacher_uuid: targetUserId,
    });

    if (error) {
      console.error("Error loading follow counts:", error);
    } else if (data && data.length > 0) {
      setFollowersCount(Number(data[0].followers_count) || 0);
      setFollowingCount(Number(data[0].following_count) || 0);
    }
  };

  const toggleFollow = async () => {
    if (!currentUserId || !targetUserId) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Please log in to follow users",
      });
      return;
    }

    if (currentUserId === targetUserId) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "You cannot follow yourself",
      });
      return;
    }

    setLoading(true);

    if (isFollowing) {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", targetUserId);

      if (error) {
        console.error("Error unfollowing:", error);
        Toast.show({
          type: "error",
          text1: "Error",
          text2: error.message || "Failed to update follow status",
        });
      } else {
        setIsFollowing(false);
        setFollowersCount((prev) => Math.max(0, prev - 1));
        Toast.show({
          type: "success",
          text1: "Unfollowed",
          text2: "You are no longer following this teacher",
        });
      }
    } else {
      const { error } = await supabase.from("follows").insert({
        follower_id: currentUserId,
        following_id: targetUserId,
      });

      if (error) {
        console.error("Error following:", error);
        Toast.show({
          type: "error",
          text1: "Error",
          text2: error.message || "Failed to update follow status",
        });
      } else {
        setIsFollowing(true);
        setFollowersCount((prev) => prev + 1);
        Toast.show({
          type: "success",
          text1: "Following",
          text2: "You are now following this teacher",
        });
      }
    }

    setLoading(false);
  };

  const refresh = async () => {
    await loadFollowStatus();
    await loadFollowCounts();
  };

  return {
    isFollowing,
    followersCount,
    followingCount,
    toggleFollow,
    loading,
    refresh,
  };
}
