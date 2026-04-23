import { supabase } from "../supabase";

/**
 * Batch fetch resource stats for multiple resources
 * @param {string[]} resourceIds - Array of resource IDs
 * @returns {Map} Map of resourceId -> stats object
 */
export const getResourcesStatsBatched = async (resourceIds) => {
  if (!resourceIds || resourceIds.length === 0) return new Map();

  try {
    const [ratingsData, commentsData, resourcesData] = await Promise.all([
      supabase
        .from("resource_ratings")
        .select("resource_id, rating")
        .in("resource_id", resourceIds),
      supabase
        .from("resource_comments")
        .select("resource_id, id")
        .eq("is_deleted", false)
        .in("resource_id", resourceIds),
      supabase
        .from("resources")
        .select("id, view_count, downloads_count")
        .in("id", resourceIds),
    ]);

    const ratings = ratingsData.data || [];
    const comments = commentsData.data || [];
    const resources = resourcesData.data || [];

    const statsMap = new Map();

    resourceIds.forEach((id) => {
      const resourceData = resources.find((r) => r.id === id);
      const resourceRatings = ratings.filter((r) => r.resource_id === id);
      const resourceComments = comments.filter((c) => c.resource_id === id);

      const averageRating =
        resourceRatings.length > 0
          ? resourceRatings.reduce((sum, r) => sum + r.rating, 0) /
            resourceRatings.length
          : 0;

      statsMap.set(id, {
        averageRating: parseFloat(averageRating.toFixed(1)),
        ratingCount: resourceRatings.length,
        commentCount: resourceComments.length,
        viewCount: resourceData?.view_count || 0,
        downloadsCount: resourceData?.downloads_count || 0,
      });
    });

    return statsMap;
  } catch (error) {
    console.error("Error fetching resource stats in batch:", error);
    return new Map();
  }
};

/**
 * Batch fetch uploader info for multiple users
 * Note: Using teachers table instead of profiles (teachers is your main user profile table)
 * @param {string[]} uploaderIds - Array of user IDs
 * @returns {Map} Map of userId -> uploader object
 */
export const getUploadersBatched = async (uploaderIds) => {
  if (!uploaderIds || uploaderIds.length === 0) return new Map();

  try {
    const { data, error } = await supabase
      .from("teachers")
      .select("id, first_name, last_name, profile_picture_url")
      .in("id", uploaderIds);

    if (error) {
      console.error("Error fetching uploaders:", error);
      return new Map();
    }

    const uploaderMap = new Map();

    uploaderIds.forEach((id) => {
      const uploader = data?.find((p) => p.id === id);
      uploaderMap.set(id, uploader || {
        id,
        first_name: "Unknown",
        last_name: "",
        profile_picture_url: null,
      });
    });

    return uploaderMap;
  } catch (error) {
    console.error("Error fetching uploaders in batch:", error);
    return new Map();
  }
};

/**
 * Batch fetch bookmarks for multiple resources
 * @param {string[]} resourceIds - Array of resource IDs
 * @param {string} userId - User ID
 * @returns {Set} Set of bookmarked resource IDs
 */
export const getBookmarksBatched = async (resourceIds, userId) => {
  if (!resourceIds || resourceIds.length === 0 || !userId) return new Set();

  try {
    const { data, error } = await supabase
      .from("resource_bookmarks")
      .select("resource_id")
      .eq("user_id", userId)
      .in("resource_id", resourceIds);

    if (error) {
      console.error("Error fetching bookmarks:", error);
      return new Set();
    }

    return new Set(data?.map((b) => b.resource_id) || []);
  } catch (error) {
    console.error("Error fetching bookmarks in batch:", error);
    return new Set();
  }
};

/**
 * Batch fetch user ratings for multiple resources
 * @param {string[]} resourceIds - Array of resource IDs
 * @param {string} userId - User ID
 * @returns {Map} Map of resourceId -> rating value
 */
export const getUserRatingsBatched = async (resourceIds, userId) => {
  if (!resourceIds || resourceIds.length === 0 || !userId) return new Map();

  try {
    const { data, error } = await supabase
      .from("resource_ratings")
      .select("resource_id, rating")
      .eq("user_id", userId)
      .in("resource_id", resourceIds);

    if (error) {
      console.error("Error fetching user ratings:", error);
      return new Map();
    }

    const ratingsMap = new Map();
    data?.forEach((r) => {
      ratingsMap.set(r.resource_id, r.rating);
    });

    return ratingsMap;
  } catch (error) {
    console.error("Error fetching user ratings in batch:", error);
    return new Map();
  }
};

/**
 * Track a resource view
 * @param {string} resourceId - Resource ID
 * @param {string} userId - User ID
 */
export const trackResourceView = async (resourceId, userId) => {
  if (!resourceId || !userId) return;

  try {
    // Get current view count
    const { data: resource, error: fetchError } = await supabase
      .from("resources")
      .select("view_count")
      .eq("id", resourceId)
      .single();

    if (fetchError) {
      console.error("Error fetching resource:", fetchError);
      return;
    }

    if (resource) {
      // Increment view count
      const { error: updateError } = await supabase
        .from("resources")
        .update({ view_count: (resource.view_count || 0) + 1 })
        .eq("id", resourceId);

      if (updateError) {
        console.error("Error updating view count:", updateError);
      }
    }

    // Log the view
    const { error: insertError } = await supabase
      .from("resource_views")
      .insert({
        resource_id: resourceId,
        user_id: userId,
        viewed_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error("Error logging view:", insertError);
    }
  } catch (error) {
    console.error("Error tracking resource view:", error);
  }
};

/**
 * Get stats for a single resource
 * @param {string} resourceId - Resource ID
 * @returns {object} Stats object
 */
export const getResourceStats = async (resourceId) => {
  try {
    const statsMap = await getResourcesStatsBatched([resourceId]);
    return (
      statsMap.get(resourceId) || {
        averageRating: 0,
        ratingCount: 0,
        commentCount: 0,
        viewCount: 0,
        downloadsCount: 0,
      }
    );
  } catch (error) {
    console.error("Error fetching resource stats:", error);
    return {
      averageRating: 0,
      ratingCount: 0,
      commentCount: 0,
      viewCount: 0,
      downloadsCount: 0,
    };
  }
};

/**
 * Toggle bookmark for a resource
 * @param {string} resourceId - Resource ID
 * @param {string} userId - User ID
 * @returns {object} { success: boolean, isBookmarked: boolean }
 */
export const toggleBookmark = async (resourceId, userId) => {
  if (!resourceId || !userId) {
    return { success: false, isBookmarked: false };
  }

  try {
    const { data: existing, error: fetchError } = await supabase
      .from("resource_bookmarks")
      .select("id")
      .eq("resource_id", resourceId)
      .eq("user_id", userId)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      // PGRST116 = not found, which is expected
      console.error("Error checking bookmark:", fetchError);
      return { success: false, isBookmarked: false };
    }

    if (existing) {
      // Remove bookmark
      const { error: deleteError } = await supabase
        .from("resource_bookmarks")
        .delete()
        .eq("id", existing.id);

      if (deleteError) {
        console.error("Error removing bookmark:", deleteError);
        return { success: false, isBookmarked: true };
      }
      return { success: true, isBookmarked: false };
    } else {
      // Add bookmark
      const { error: insertError } = await supabase
        .from("resource_bookmarks")
        .insert({
          resource_id: resourceId,
          user_id: userId,
          created_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error("Error adding bookmark:", insertError);
        return { success: false, isBookmarked: false };
      }
      return { success: true, isBookmarked: true };
    }
  } catch (error) {
    console.error("Error toggling bookmark:", error);
    return { success: false, isBookmarked: false };
  }
};

/**
 * Check if a resource is bookmarked
 * @param {string} resourceId - Resource ID
 * @param {string} userId - User ID
 * @returns {boolean}
 */
export const checkBookmark = async (resourceId, userId) => {
  if (!resourceId || !userId) return false;

  try {
    const { data, error } = await supabase
      .from("resource_bookmarks")
      .select("id")
      .eq("resource_id", resourceId)
      .eq("user_id", userId)
      .single();

    if (error && error.code === "PGRST116") {
      // Not found - this is expected
      return false;
    }

    if (error) {
      console.error("Error checking bookmark:", error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error("Error checking bookmark:", error);
    return false;
  }
};