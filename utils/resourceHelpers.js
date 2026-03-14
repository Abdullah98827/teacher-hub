import { supabase } from "../supabase";

/**
 * Track a view for a resource
 */
export const trackResourceView = async (resourceId, userId) => {
  await supabase.from("resource_views").insert({
    resource_id: resourceId,
    user_id: userId,
  });

  const { data } = await supabase
    .from("resource_views")
    .select("id")
    .eq("resource_id", resourceId);

  if (data) {
    await supabase
      .from("resources")
      .update({ view_count: data.length })
      .eq("id", resourceId);
  }
};

/**
 * Get resource stats (ratings, comments, etc.)
 */
export const getResourceStats = async (resourceId) => {
  const { data: ratings } = await supabase
    .from("resource_ratings")
    .select("rating")
    .eq("resource_id", resourceId);

  const averageRating =
    ratings && ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      : 0;

  const { data: comments } = await supabase
    .from("resource_comments")
    .select("id")
    .eq("resource_id", resourceId);

  const { data: resource } = await supabase
    .from("resources")
    .select("view_count")
    .eq("id", resourceId)
    .single();

  return {
    averageRating: Number(averageRating.toFixed(1)),
    ratingCount: ratings?.length || 0,
    commentCount: comments?.length || 0,
    viewCount: resource?.view_count || 0,
  };
};

/**
 * Check if user has bookmarked a resource
 */
export const checkBookmark = async (resourceId, userId) => {
  const { data } = await supabase
    .from("resource_bookmarks")
    .select("id")
    .eq("resource_id", resourceId)
    .eq("user_id", userId)
    .single();

  return !!data;
};

/**
 * Toggle bookmark for a resource
 */
export const toggleBookmark = async (resourceId, userId) => {
  const isBookmarked = await checkBookmark(resourceId, userId);

  if (isBookmarked) {
    const { error } = await supabase
      .from("resource_bookmarks")
      .delete()
      .eq("resource_id", resourceId)
      .eq("user_id", userId);

    return { success: !error, isBookmarked: false };
  } else {
    const { error } = await supabase.from("resource_bookmarks").insert({
      resource_id: resourceId,
      user_id: userId,
    });

    return { success: !error, isBookmarked: true };
  }
};

/**
 * Check if user has rated a resource
 */
export const getUserRating = async (resourceId, userId) => {
  const { data } = await supabase
    .from("resource_ratings")
    .select("rating")
    .eq("resource_id", resourceId)
    .eq("user_id", userId)
    .single();

  return data?.rating || 0;
};
