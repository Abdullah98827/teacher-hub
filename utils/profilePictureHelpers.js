import * as ImagePicker from "expo-image-picker";
import Toast from "react-native-toast-message";
import { supabase } from "../supabase";

/**
 * PROFILE PICTURE HELPERS
 *
 * These functions help you:
 * 1. Pick an image from the user's device
 * 2. Upload it to Supabase Storage (PUBLIC bucket)
 * 3. Delete profile pictures
 * 4. Get profile picture URLs
 *
 * IMPORTANT: Your 'profile-pictures' bucket MUST be set to PUBLIC in Supabase Dashboard
 */

/**
 * Pick a profile picture from the user's photo library
 */
export const pickProfileImage = async () => {
  // Request permission to access photo library
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  
  // Check if permission was granted
  if (status !== "granted") {
    Toast.show({
      type: "error",
      text1: "Permission Required",
      text2: "Please allow access to your photo library",
    });
    return null;
  }

  // Open image picker
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  // Check if user canceled
  if (result.canceled) {
    return null;
  }

  // Return selected image URI
  return result.assets[0].uri;
};

/**
 * Upload a profile picture to Supabase Storage
 * Returns PUBLIC URL (bucket must be public!)
 */
export const uploadProfilePicture = async (imageUri, userId) => {
  // Generate file path
  const fileExtension = imageUri.split(".").pop()?.toLowerCase() || "jpg";
  const timestamp = Date.now();
  const filePath = `${userId}/profile_${timestamp}.${fileExtension}`;

  // Prepare form data
  const formData = new FormData();
  const file = {
    uri: imageUri,
    type: `image/${fileExtension}`,
    name: `profile.${fileExtension}`,
  };
  formData.append("file", file);

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("profile-pictures")
    .upload(filePath, formData, {
      cacheControl: "3600",
      upsert: true,
    });

  // Check for upload error
  if (uploadError) {
    console.error("Upload error:", uploadError);
    Toast.show({
      type: "error",
      text1: "Upload Failed",
      text2: uploadError.message || "Please try again",
    });
    return null;
  }

  // Get public URL
  const { data: publicUrlData } = supabase.storage
    .from("profile-pictures")
    .getPublicUrl(filePath);

  const publicUrl = publicUrlData.publicUrl;

  // Update database with new URL
  const { error: updateError } = await supabase
    .from("teachers")
    .update({ profile_picture_url: publicUrl })
    .eq("id", userId);

  // Check for database update error
  if (updateError) {
    console.error("Database update error:", updateError);
    Toast.show({
      type: "error",
      text1: "Upload Failed",
      text2: updateError.message || "Please try again",
    });
    return null;
  }

  // Success
  Toast.show({
    type: "success",
    text1: "Profile Picture Updated",
    text2: "Your picture has been uploaded successfully",
  });

  return publicUrl;
};

/**
 * Delete user's profile picture
 */
export const deleteProfilePicture = async (userId, profilePictureUrl) => {
  // Check if picture exists
  if (!profilePictureUrl) {
    Toast.show({
      type: "info",
      text1: "No Profile Picture",
      text2: "You don't have a profile picture to delete",
    });
    return false;
  }

  // Extract file path from URL
  const urlParts = profilePictureUrl.split("/profile-pictures/");
  
  // Check if URL format is valid
  if (urlParts.length < 2) {
    console.error("Invalid profile picture URL:", profilePictureUrl);
    Toast.show({
      type: "error",
      text1: "Delete Failed",
      text2: "Invalid picture URL",
    });
    return false;
  }
  
  const filePath = urlParts[1];

  // Delete from storage
  const { error: deleteError } = await supabase.storage
    .from("profile-pictures")
    .remove([filePath]);

  // Check for delete error
  if (deleteError) {
    console.error("Storage delete error:", deleteError);
    Toast.show({
      type: "error",
      text1: "Delete Failed",
      text2: deleteError.message || "Please try again",
    });
    return false;
  }

  // Update database to remove URL
  const { error: updateError } = await supabase
    .from("teachers")
    .update({ profile_picture_url: null })
    .eq("id", userId);

  // Check for database error
  if (updateError) {
    console.error("Database update error:", updateError);
    Toast.show({
      type: "error",
      text1: "Delete Failed",
      text2: updateError.message || "Please try again",
    });
    return false;
  }

  // Success
  Toast.show({
    type: "success",
    text1: "Profile Picture Removed",
    text2: "Your picture has been deleted",
  });

  return true;
};

/**
 * Get the profile picture URL for a specific user
 */
export const getProfilePictureUrl = async (userId) => {
  // Query database for user's profile picture URL
  const { data, error } = await supabase
    .from("teachers")
    .select("profile_picture_url")
    .eq("id", userId)
    .single();

  // Check for error
  if (error) {
    console.error("Error fetching profile picture:", error);
    return null;
  }

  // Return URL or null
  return data?.profile_picture_url || null;
};
