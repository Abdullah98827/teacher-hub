import Toast from "react-native-toast-message";
import { supabase } from "../supabase";

/**
 * Generate a short-lived signed URL for a file stored in Supabase Storage.
 * @param path The file path stored in the database (not a public URL).
 * @param expiresIn Expiration time in seconds (default 60).
 * @returns Signed URL string or null if error.
 */
export const getSignedUrl = async (
  path: string,
  expiresIn: number = 60
): Promise<string | null> => {
  const { data, error } = await supabase.storage
    .from("resources")
    .createSignedUrl(path, expiresIn);

  if (error) {
    Toast.show({
      type: "error",
      text1: "Failed to generate secure link",
      text2: error.message,
    });
    return null;
  }

  return data.signedUrl;
};

/**
 * Upload a file blob to Supabase Storage.
 * @param filePath Path where the file will be stored (e.g., userId/filename.ext).
 * @param blob File blob to upload.
 * @returns true if successful, false otherwise.
 */
export const uploadFile = async (
  filePath: string,
  blob: Blob
): Promise<boolean> => {
  const { error } = await supabase.storage
    .from("resources")
    .upload(filePath, blob);

  if (error) {
    Toast.show({
      type: "error",
      text1: "Upload failed",
      text2: error.message,
    });
    return false;
  }

  return true;
};

/**
 * Delete a file from Supabase Storage.
 * @param filePath Path of the file to delete.
 * @returns true if successful, false otherwise.
 */
export const deleteFile = async (filePath: string): Promise<boolean> => {
  const { error } = await supabase.storage.from("resources").remove([filePath]);

  if (error) {
    Toast.show({
      type: "error",
      text1: "Failed to delete file",
      text2: error.message,
    });
    return false;
  }

  return true;
};
