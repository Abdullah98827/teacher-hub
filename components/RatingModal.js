import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { useAppTheme } from "../hooks/useAppTheme";
import { supabase } from "../supabase";
import { logEvent } from "../utils/logging";
import { useRatingNotifications } from "../utils/notificationIntegrations";
import { ThemedText } from './themed-text';

export default function RatingModal({
  visible,
  resourceId,
  resourceTitle,
  currentRating = 0,
  onClose,
  onRatingSubmitted,
}) {
  const [selectedRating, setSelectedRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resourceOwnerId, setResourceOwnerId] = useState(null);
  const [currentUserName, setCurrentUserName] = useState(null);
  const { notifyRating } = useRatingNotifications();

  const { bgCard, border, textPrimary, textSecondary, textMuted } =
    useAppTheme();

  const fetchUserRating = useCallback(async () => {
    if (!resourceId) return;

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch existing rating
      const { data, error: ratingError } = await supabase
        .from("resource_ratings")
        .select("rating")
        .eq("resource_id", resourceId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (ratingError && ratingError.code !== "PGRST116") {
        console.error("Error fetching rating:", ratingError);
      }

      if (data) {
        setSelectedRating(data.rating);
      } else {
        setSelectedRating(0);
      }

      // Fetch resource owner
      const { data: resourceData, error: resError } = await supabase
        .from("resources")
        .select("uploaded_by")
        .eq("id", resourceId)
        .single();

      if (!resError && resourceData) {
        setResourceOwnerId(resourceData.uploaded_by);
      }

      // Fetch current user name
      const { data: teacherData, error: teachError } = await supabase
        .from("teachers")
        .select("first_name, last_name")
        .eq("id", user.id)
        .single();

      if (!teachError && teacherData) {
        setCurrentUserName(
          `${teacherData.first_name} ${teacherData.last_name}`
        );
      }

      setLoading(false);
    } catch (error) {
      console.error("Error in fetchUserRating:", error);
      setLoading(false);
    }
  }, [resourceId]);

  useEffect(() => {
    if (visible) {
      fetchUserRating();
    }
  }, [visible, fetchUserRating]);

  const submitRating = async () => {
    if (selectedRating === 0) {
      Toast.show({ type: "error", text1: "Please select a rating" });
      return;
    }

    setSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Toast.show({ type: "error", text1: "Please log in" });
        setSubmitting(false);
        return;
      }

      // Check if rating already exists
      const { data: existingRating, error: checkError } = await supabase
        .from("resource_ratings")
        .select("id")
        .eq("resource_id", resourceId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (checkError && checkError.code !== "PGRST116") {
        console.error("Error checking existing rating:", checkError);
        throw checkError;
      }

      let error;

      if (existingRating) {
        // Update existing rating
        const result = await supabase
          .from("resource_ratings")
          .update({ rating: selectedRating })
          .eq("resource_id", resourceId)
          .eq("user_id", user.id);
        error = result.error;
      } else {
        // Insert new rating
        const result = await supabase.from("resource_ratings").insert({
          resource_id: resourceId,
          user_id: user.id,
          rating: selectedRating,
        });
        error = result.error;
      }

      if (error) {
        console.error("Rating submission error:", error);
        Toast.show({
          type: "error",
          text1: "Failed to submit rating",
          text2: error.message,
        });
        logEvent({
          event_type: "RATING_FAILED",
          user_id: user.id,
          target_id: resourceId,
          target_table: "resources",
          details: {
            error: error.message,
            rating: selectedRating,
            is_update: !!existingRating,
          },
        });
        setSubmitting(false);
        return;
      }

      logEvent({
        event_type: existingRating ? "RATING_UPDATED" : "RATING_CREATED",
        user_id: user.id,
        target_id: resourceId,
        target_table: "resources",
        details: { rating: selectedRating },
      });

      // Send notification only for new ratings
      if (!existingRating && resourceOwnerId && resourceOwnerId !== user.id) {
        await notifyRating(
          resourceOwnerId,
          currentUserName || "User",
          user.id,
          resourceId,
          selectedRating,
          resourceTitle
        ).catch((err) =>
          console.warn("Failed to send rating notification:", err)
        );
      }

      Toast.show({
        type: "success",
        text1: existingRating ? "Rating updated!" : "Rating submitted!",
      });

      setSubmitting(false);
      onRatingSubmitted();
      onClose();
    } catch (error) {
      console.error("Error in submitRating:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message || "Failed to submit rating",
      });
      setSubmitting(false);
    }
  };

  const ratingLabels = ["Poor", "Fair", "Good", "Very Good", "Excellent"];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/70 justify-center items-center px-5">
        <View
          className={`${bgCard} rounded-2xl w-full max-w-md border ${border}`}
        >
          {/* Header */}
          <View className={`p-5 border-b ${border}`}>
            <View className="flex-row items-center justify-between mb-2">
              <ThemedText className={`${textPrimary} font-bold text-xl`}>
                Rate Resource
              </ThemedText>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            <ThemedText className={`${textMuted} text-sm`} numberOfLines={2}>
              {resourceTitle}
            </ThemedText>
          </View>

          {/* Content */}
          {loading ? (
            <View className="p-10 items-center">
              <ActivityIndicator size="large" color="#22d3ee" />
            </View>
          ) : (
            <View className="p-6">
              <ThemedText className={`${textPrimary} text-center text-lg mb-6`}>
                How would you rate this resource?
              </ThemedText>

              {/* Star Rating */}
              <View className="flex-row items-center justify-center mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setSelectedRating(star)}
                    className="p-2"
                  >
                    <Ionicons
                      name={selectedRating >= star ? "star" : "star-outline"}
                      size={40}
                      color={selectedRating >= star ? "#fcd34d" : "#9ca3af"}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Rating Label */}
              {selectedRating > 0 && (
                <View className="bg-yellow-400/30 border-2 border-yellow-400 rounded-xl p-4 mb-6">
                  <ThemedText className="text-white text-center font-bold text-xl">
                    {ratingLabels[selectedRating - 1]}
                  </ThemedText>
                </View>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                className={`bg-cyan-500 py-4 rounded-xl ${
                  submitting || selectedRating === 0 ? "opacity-50" : ""
                }`}
                onPress={submitRating}
                disabled={submitting || selectedRating === 0}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ThemedText className="text-white text-center font-bold text-lg">
                    Submit Rating
                  </ThemedText>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                className="mt-3 py-3"
                onPress={onClose}
                disabled={submitting}
              >
                <ThemedText className={`${textSecondary} text-center`}>
                  Cancel
                </ThemedText>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
      <Toast />
    </Modal>
  );
}