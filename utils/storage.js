import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import Toast from "react-native-toast-message";
import { supabase } from "../supabase";

export const getSignedUrl = async (path, expiresIn = 60) => {
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

export const uploadFile = async (filePath, fileUri, mimeType) => {
  const contentType = mimeType || "application/octet-stream";

  // ── WEB ──────────────────────────────────────────────────────────────────
  // On web, fileUri is already a blob:// or data: URL so fetch() works fine
  if (Platform.OS === "web") {
    const response = await fetch(fileUri).catch(() => null);

    if (!response || !response.ok) {
      Toast.show({
        type: "error",
        text1: "Upload failed",
        text2: "Could not read the file",
      });
      return false;
    }

    const blob = await response.blob().catch(() => null);

    if (!blob) {
      Toast.show({
        type: "error",
        text1: "Upload failed",
        text2: "Could not process the file",
      });
      return false;
    }

    const { error } = await supabase.storage
      .from("resources")
      .upload(filePath, blob, { contentType });

    if (error) {
      Toast.show({
        type: "error",
        text1: "Upload failed",
        text2: error.message,
      });
      return false;
    }

    return true;
  }

  // ── iOS & ANDROID ─────────────────────────────────────────────────────────
  // On mobile, fetch() on a local file:// URI returns 0 bytes.
  // We must use expo-file-system to read the file as base64 first.
  const base64Result = await FileSystem.readAsStringAsync(fileUri, {
    encoding: "base64",          // ← plain string, avoids the EncodingType bug
  }).catch(() => null);

  if (!base64Result) {
    Toast.show({
      type: "error",
      text1: "Upload failed",
      text2: "Could not read the file from your device",
    });
    return false;
  }

  // Convert base64 string → Uint8Array so Supabase receives real bytes
  const binaryString = atob(base64Result);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const { error } = await supabase.storage
    .from("resources")
    .upload(filePath, bytes.buffer, { contentType });

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

export const deleteFile = async (filePath) => {
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