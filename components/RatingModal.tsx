// components/RatingModal.tsx
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { supabase } from "../supabase";

interface RatingModalProps {
  visible: boolean;
  resourceId: string;
  resourceTitle: string;
  currentRating?: number;
  onClose: () => void;
  onRatingSubmitted: () => void;
}

export default function RatingModal({
  visible,
  resourceId,
  resourceTitle,
  currentRating = 0,
  onClose,
  onRatingSubmitted,
}: RatingModalProps) {
  const [selectedRating, setSelectedRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchUserRating = useCallback(async () => {
    if (!resourceId) return;

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("resource_ratings")
      .select("rating")
      .eq("resource_id", resourceId)
      .eq("user_id", user.id)
      .single();

    if (data) {
      setSelectedRating(data.rating);
    } else {
      setSelectedRating(0);
    }

    setLoading(false);
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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      Toast.show({ type: "error", text1: "Please log in" });
      setSubmitting(false);
      return;
    }

    // Check if user already rated
    const { data: existingRating } = await supabase
      .from("resource_ratings")
      .select("id")
      .eq("resource_id", resourceId)
      .eq("user_id", user.id)
      .single();

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
      Toast.show({
        type: "error",
        text1: "Failed to submit rating",
        text2: error.message,
      });
      setSubmitting(false);
      return;
    }

    Toast.show({
      type: "success",
      text1: existingRating ? "Rating updated!" : "Rating submitted!",
    });

    setSubmitting(false);
    onRatingSubmitted();
    onClose();
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
        <View className="bg-neutral-900 rounded-2xl w-full max-w-md border border-neutral-800">
          {/* Header */}
          <View className="p-5 border-b border-neutral-800">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-white font-bold text-xl">
                Rate Resource
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            <Text className="text-gray-400 text-sm" numberOfLines={2}>
              {resourceTitle}
            </Text>
          </View>

          {/* Content */}
          {loading ? (
            <View className="p-10 items-center">
              <ActivityIndicator size="large" color="#22d3ee" />
            </View>
          ) : (
            <View className="p-6">
              <Text className="text-white text-center text-lg mb-6">
                How would you rate this resource?
              </Text>

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
                  <Text className="text-white text-center font-bold text-xl">
                    {ratingLabels[selectedRating - 1]}
                  </Text>
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
                  <Text className="text-white text-center font-bold text-lg">
                    Submit Rating
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                className="mt-3 py-3"
                onPress={onClose}
                disabled={submitting}
              >
                <Text className="text-gray-400 text-center">Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
      <Toast />
    </Modal>
  );
}
