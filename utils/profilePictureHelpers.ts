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
export const pickProfileImage = async (): Promise<string | null> => {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Toast.show({
        type: "error",
        text1: "Permission Required",
        text2: "Please allow access to your photo library",
      });
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) {
      return null;
    }

    return result.assets[0].uri;
  } catch (error) {
    console.error("Error picking image:", error);
    Toast.show({
      type: "error",
      text1: "Failed to Pick Image",
      text2: "Please try again",
    });
    return null;
  }
};

/**
 * Upload a profile picture to Supabase Storage
 * Returns PUBLIC URL (bucket must be public!)
 */
export const uploadProfilePicture = async (
  imageUri: string,
  userId: string
): Promise<string | null> => {
  try {
    const fileExtension = imageUri.split(".").pop()?.toLowerCase() || "jpg";
    const timestamp = Date.now();
    const filePath = `${userId}/profile_${timestamp}.${fileExtension}`;

    console.log("Uploading to path:", filePath);

    const formData = new FormData();
    const file = {
      uri: imageUri,
      type: `image/${fileExtension}`,
      name: `profile.${fileExtension}`,
    } as any;
    formData.append("file", file);

    const { error: uploadError } = await supabase.storage
      .from("profile-pictures")
      .upload(filePath, formData, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw uploadError;
    }

    // Get PUBLIC URL (works only if bucket is public)
    const { data: publicUrlData } = supabase.storage
      .from("profile-pictures")
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;
    console.log("Public URL generated:", publicUrl);

    // Update database
    const { error: updateError } = await supabase
      .from("teachers")
      .update({ profile_picture_url: publicUrl })
      .eq("id", userId);

    if (updateError) {
      console.error("Database update error:", updateError);
      throw updateError;
    }

    Toast.show({
      type: "success",
      text1: "Profile Picture Updated",
      text2: "Your picture has been uploaded successfully",
    });

    return publicUrl;
  } catch (error: any) {
    console.error("Error uploading profile picture:", error);
    Toast.show({
      type: "error",
      text1: "Upload Failed",
      text2: error.message || "Please try again",
    });
    return null;
  }
};

/**
 * Delete user's profile picture
 */
export const deleteProfilePicture = async (
  userId: string,
  profilePictureUrl: string | null
): Promise<boolean> => {
  try {
    if (!profilePictureUrl) {
      Toast.show({
        type: "info",
        text1: "No Profile Picture",
        text2: "You don't have a profile picture to delete",
      });
      return false;
    }

    // Extract file path from URL
    // URL: https://xxx.supabase.co/storage/v1/object/public/profile-pictures/userId/profile_123.jpg
    const urlParts = profilePictureUrl.split("/profile-pictures/");
    if (urlParts.length < 2) {
      throw new Error("Invalid profile picture URL");
    }
    const filePath = urlParts[1];

    console.log("Deleting file:", filePath);

    // Delete from storage
    const { error: deleteError } = await supabase.storage
      .from("profile-pictures")
      .remove([filePath]);

    if (deleteError) {
      console.error("Storage delete error:", deleteError);
      throw deleteError;
    }

    // Remove URL from database
    const { error: updateError } = await supabase
      .from("teachers")
      .update({ profile_picture_url: null })
      .eq("id", userId);

    if (updateError) {
      console.error("Database update error:", updateError);
      throw updateError;
    }

    Toast.show({
      type: "success",
      text1: "Profile Picture Removed",
      text2: "Your picture has been deleted",
    });

    return true;
  } catch (error: any) {
    console.error("Error deleting profile picture:", error);
    Toast.show({
      type: "error",
      text1: "Delete Failed",
      text2: error.message || "Please try again",
    });
    return false;
  }
};

/**
 * Get the profile picture URL for a specific user
 */
export const getProfilePictureUrl = async (userId: string): Promise<string | null> => {
  try {
    const { data } = await supabase
      .from("teachers")
      .select("profile_picture_url")
      .eq("id", userId)
      .single();
    return data?.profile_picture_url || null;
  } catch (error) {
    console.error("Error fetching profile picture:", error);
    return null;
  }
};