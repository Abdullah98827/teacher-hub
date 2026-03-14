import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import ConfirmModal from "../components/ConfirmModal";
import LogoHeader from "../components/logoHeader";
import ProfilePicture from "../components/ProfilePicture";
import ScreenWrapper from "../components/ScreenWrapper";
import { useAppTheme } from "../hooks/useAppTheme";
import { supabase } from "../supabase";
import {
  deleteProfilePicture,
  pickProfileImage,
  uploadProfilePicture,
} from "../utils/profilePictureHelpers";

export default function EditProfileScreen() {
  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [trn, setTrn] = useState("");
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(
    null
  );
  const [userId, setUserId] = useState<string | null>(null);

  // Phase 2: Enhanced profile fields
  const [bio, setBio] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [allowDms, setAllowDms] = useState<
    "everyone" | "followers_only" | "nobody"
  >("everyone");

  // Loading states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [deletingPicture, setDeletingPicture] = useState(false);

  // Modal state
  const [showPictureModal, setShowPictureModal] = useState(false);
  const [showDeletePictureModal, setShowDeletePictureModal] = useState(false);

  const router = useRouter();

  const {
    bgCard,
    bgInput,
    bgCardAlt,
    border,
    borderInput,
    textPrimary,
    textSecondary,
    placeholderColor,
    isDark,
  } = useAppTheme();

  /**
   * Load user's current profile data when page opens
   */
  useEffect(() => {
    loadProfile();
  }, []);

  /**
   * Fetch profile data from database
   */
  const loadProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setUserId(user.id);

    // Get teacher details including Phase 2 fields
    const { data } = await supabase
      .from("teachers")
      .select(
        `
        first_name,
        last_name,
        email,
        trn,
        profile_picture_url,
        bio,
        school_name,
        years_experience,
        allow_dms
      `
      )
      .eq("id", user.id)
      .single();

    if (data) {
      setFirstName(data.first_name || "");
      setLastName(data.last_name || "");
      setEmail(data.email || "");
      setTrn(data.trn || "");
      setProfilePictureUrl(data.profile_picture_url);
      setBio(data.bio || "");
      setSchoolName(data.school_name || "");
      setYearsExperience(data.years_experience?.toString() || "");
      setAllowDms(data.allow_dms || "everyone");
    }

    setLoading(false);
  };

  /**
   * Handle profile picture click
   */
  const handlePictureClick = () => {
    if (profilePictureUrl) {
      setShowPictureModal(true);
    } else {
      handleChangeProfilePicture();
    }
  };

  /**
   * Handle profile picture change
   */
  const handleChangeProfilePicture = async () => {
    if (!userId) return;

    setShowPictureModal(false);

    const imageUri = await pickProfileImage();
    if (!imageUri) return;

    setUploadingPicture(true);
    const publicUrl = await uploadProfilePicture(imageUri, userId);
    setUploadingPicture(false);

    if (publicUrl) {
      setProfilePictureUrl(publicUrl);
    }
  };

  /**
   * Handle delete profile picture
   */
  const handleDeletePicture = async () => {
    setShowPictureModal(false);
    setShowDeletePictureModal(true);
  };

  const confirmDeletePicture = async () => {
    if (!userId) return;
    setDeletingPicture(true);
    const success = await deleteProfilePicture(userId, profilePictureUrl);
    setDeletingPicture(false);
    setShowDeletePictureModal(false);
    if (success) {
      setProfilePictureUrl(null);
    }
  };

  /**
   * Save profile changes
   */
  const handleSave = async () => {
    // Validate required fields
    if (!firstName || !lastName) {
      Toast.show({
        type: "error",
        text1: "Missing Fields",
        text2: "Please fill in all required fields",
      });
      return;
    }

    // Validate bio length (150 characters max)
    if (bio.length > 150) {
      Toast.show({
        type: "error",
        text1: "Bio Too Long",
        text2: "Please keep your bio under 150 characters",
      });
      return;
    }

    // Validate years experience
    const yearsNum = parseInt(yearsExperience);
    if (yearsExperience && (isNaN(yearsNum) || yearsNum < 0 || yearsNum > 60)) {
      Toast.show({
        type: "error",
        text1: "Invalid Experience",
        text2: "Please enter a valid number of years (0-60)",
      });
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    // Update teacher profile
    const { error: updateError } = await supabase
      .from("teachers")
      .update({
        first_name: firstName,
        last_name: lastName,
        bio: bio || null,
        school_name: schoolName || null,
        years_experience: yearsExperience ? parseInt(yearsExperience) : null,
        allow_dms: allowDms,
      })
      .eq("id", user.id);

    if (updateError) {
      Toast.show({
        type: "error",
        text1: "Update Failed",
        text2: updateError.message,
      });
      setSaving(false);
      return;
    }

    Toast.show({
      type: "success",
      text1: "Success",
      text2: "Profile updated successfully",
    });

    setSaving(false);
    setTimeout(() => router.back(), 1500);
  };

  // Show loading spinner while fetching data
  if (loading) {
    return (
      <ScreenWrapper>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#22d3ee" />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      {/* Logo Header */}
      <LogoHeader position="left" />

      {/* Page Title with Back Button */}
      <View className={`px-5 py-4 border-b ${border}`}>
        <View className="flex-row items-center">
          {/* Back Button */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-4 p-2"
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#22d3ee" />
          </TouchableOpacity>

          {/* Title */}
          <View className="flex-1">
            <Text className="text-2xl font-bold text-cyan-400">
              Edit Profile
            </Text>
            <Text className={`${textSecondary} text-sm`}>
              Update your personal information
            </Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 px-6">
        {/* Profile Picture Section */}
        <View className={`${bgCard} rounded-xl p-6 mb-4 mt-6 border ${border}`}>
          <Text className="text-lg font-bold text-cyan-400 mb-4 text-center">
            Profile Picture
          </Text>

          <View className="items-center">
            <TouchableOpacity
              onPress={handlePictureClick}
              activeOpacity={0.7}
              disabled={uploadingPicture || deletingPicture}
            >
              {uploadingPicture || deletingPicture ? (
                <View
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: 48,
                    backgroundColor: "#0891b2",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ActivityIndicator size="large" color="#fff" />
                  <Text className="text-white text-xs mt-2">
                    {uploadingPicture ? "Uploading..." : "Deleting..."}
                  </Text>
                </View>
              ) : (
                <>
                  <ProfilePicture
                    imageUrl={profilePictureUrl}
                    firstName={firstName}
                    lastName={lastName}
                    size="xl"
                  />

                  <View
                    className={`absolute bottom-0 right-0 bg-cyan-600 rounded-full p-2 border-2 ${
                      isDark ? "border-neutral-900" : "border-gray-50"
                    }`}
                  >
                    <Ionicons name="camera" size={16} color="#fff" />
                  </View>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handlePictureClick}
              className="mt-3"
              disabled={uploadingPicture || deletingPicture}
            >
              <Text className="text-cyan-400 text-sm text-center font-semibold">
                {profilePictureUrl
                  ? "Tap to change or delete"
                  : "Tap to upload picture"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Basic Information */}
        <View className={`${bgCard} rounded-xl p-6 mb-4 border ${border}`}>
          <Text className="text-lg font-bold text-cyan-400 mb-4">
            Basic Information
          </Text>

          {/* First Name */}
          <View className="mb-4">
            <Text className={`${textSecondary} text-xs mb-2`}>
              First Name <Text className="text-red-400">*</Text>
            </Text>
            <TextInput
              className={`${bgInput} border ${borderInput} ${textPrimary} p-4 rounded-lg`}
              placeholder="First Name"
              value={firstName}
              onChangeText={setFirstName}
              placeholderTextColor={placeholderColor}
            />
          </View>

          {/* Last Name */}
          <View className="mb-4">
            <Text className={`${textSecondary} text-xs mb-2`}>
              Last Name <Text className="text-red-400">*</Text>
            </Text>
            <TextInput
              className={`${bgInput} border ${borderInput} ${textPrimary} p-4 rounded-lg`}
              placeholder="Last Name"
              value={lastName}
              onChangeText={setLastName}
              placeholderTextColor={placeholderColor}
            />
          </View>

          {/* Email (Read-only) */}
          <View className="mb-4">
            <Text className={`${textSecondary} text-xs mb-2`}>
              Email (Cannot be changed)
            </Text>
            <View
              className={`${bgCardAlt} border ${borderInput} p-4 rounded-lg flex-row items-center`}
            >
              <Ionicons name="lock-closed" size={16} color="#6B7280" />
              <Text className={`${textSecondary} ml-2 flex-1`}>{email}</Text>
            </View>
          </View>

          {/* TRN (Read-only) */}
          <View>
            <Text className={`${textSecondary} text-xs mb-2`}>
              Teacher Reference Number (Cannot be changed)
            </Text>
            <View
              className={`${bgCardAlt} border ${borderInput} p-4 rounded-lg flex-row items-center`}
            >
              <Ionicons name="lock-closed" size={16} color="#6B7280" />
              <Text className={`${textSecondary} ml-2 flex-1`}>{trn}</Text>
            </View>
          </View>
        </View>

        {/* Professional Information */}
        <View className={`${bgCard} rounded-xl p-6 mb-4 border ${border}`}>
          <Text className="text-lg font-bold text-cyan-400 mb-4">
            Professional Information
          </Text>

          {/* Bio */}
          <View className="mb-4">
            <View className="flex-row justify-between items-center mb-2">
              <Text className={`${textSecondary} text-xs`}>Bio (Optional)</Text>
              <Text
                className={`text-xs ${
                  bio.length > 150 ? "text-red-400" : textSecondary
                }`}
              >
                {bio.length}/150
              </Text>
            </View>
            <TextInput
              className={`${bgInput} border ${borderInput} ${textPrimary} p-4 rounded-lg`}
              placeholder="Tell us about yourself..."
              value={bio}
              onChangeText={setBio}
              placeholderTextColor={placeholderColor}
              multiline
              numberOfLines={3}
              maxLength={150}
              textAlignVertical="top"
            />
          </View>

          {/* School Name */}
          <View className="mb-4">
            <Text className={`${textSecondary} text-xs mb-2`}>
              School/Institution (Optional)
            </Text>
            <TextInput
              className={`${bgInput} border ${borderInput} ${textPrimary} p-4 rounded-lg`}
              placeholder="e.g. Wellington Academy"
              value={schoolName}
              onChangeText={setSchoolName}
              placeholderTextColor={placeholderColor}
            />
          </View>

          {/* Years of Experience */}
          <View>
            <Text className={`${textSecondary} text-xs mb-2`}>
              Years of Teaching Experience (Optional)
            </Text>
            <TextInput
              className={`${bgInput} border ${borderInput} ${textPrimary} p-4 rounded-lg`}
              placeholder="e.g. 5"
              value={yearsExperience}
              onChangeText={setYearsExperience}
              placeholderTextColor={placeholderColor}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
        </View>

        {/* Privacy Settings - Only DM Permissions */}
        <View className={`${bgCard} rounded-xl p-6 mb-4 border ${border}`}>
          <Text className="text-lg font-bold text-cyan-400 mb-4">
            Privacy Settings
          </Text>

          <Text className={`${textSecondary} text-xs mb-3`}>
            Who can send you direct messages?
          </Text>

          {(["everyone", "followers_only", "nobody"] as const).map((option) => {
            const isSelected = allowDms === option;
            const labels: Record<
              string,
              { title: string; sub: string; icon: string }
            > = {
              everyone: {
                title: "Everyone",
                sub: "All teachers can message you",
                icon: "mail-outline",
              },
              followers_only: {
                title: "Followers Only",
                sub: "Only people you follow",
                icon: "people-outline",
              },
              nobody: {
                title: "Nobody",
                sub: "Turn off direct messages",
                icon: "close-circle-outline",
              },
            };
            const { title, sub, icon } = labels[option];
            return (
              <TouchableOpacity
                key={option}
                className={`p-4 rounded-lg mb-2 border ${
                  isSelected
                    ? "bg-cyan-600 border-cyan-500"
                    : `${bgInput} ${borderInput}`
                }`}
                onPress={() => setAllowDms(option)}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <Ionicons
                      name={icon as any}
                      size={20}
                      color={isSelected ? "#fff" : "#9CA3AF"}
                    />
                    <View className="ml-3 flex-1">
                      <Text
                        className={`font-semibold ${
                          isSelected ? "text-white" : textPrimary
                        }`}
                      >
                        {title}
                      </Text>
                      <Text
                        className={`text-xs ${
                          isSelected ? "text-cyan-100" : textSecondary
                        }`}
                      >
                        {sub}
                      </Text>
                    </View>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={24} color="#fff" />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Action Buttons */}
        <View className={`${bgCard} rounded-xl p-6 mb-6 border ${border}`}>
          {/* Save Button */}
          <TouchableOpacity
            className={`p-4 rounded-lg mb-3 ${
              saving ? "bg-gray-400" : "bg-cyan-600"
            }`}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <View className="flex-row items-center justify-center">
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text className="text-white font-bold ml-2">Save Changes</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Cancel Button */}
          <TouchableOpacity
            className={`${bgInput} p-4 rounded-lg border ${borderInput}`}
            onPress={() => router.back()}
          >
            <Text className="text-center text-cyan-400 font-semibold">
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Picture Options Modal */}
      <Modal
        visible={showPictureModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPictureModal(false)}
      >
        <View className="flex-1 bg-black/70 justify-center items-center">
          <View
            className={`${bgCard} rounded-xl p-6 mx-5 w-80 border ${border}`}
          >
            <Text
              className={`text-xl font-bold ${textPrimary} mb-4 text-center`}
            >
              Profile Picture
            </Text>

            <TouchableOpacity
              className="bg-cyan-600 p-4 rounded-lg mb-3 flex-row items-center justify-center"
              onPress={handleChangeProfilePicture}
            >
              <Ionicons name="camera" size={20} color="#fff" />
              <Text className="text-white font-bold ml-2">Change Picture</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-red-600 p-4 rounded-lg mb-3 flex-row items-center justify-center"
              onPress={handleDeletePicture}
            >
              <Ionicons name="trash" size={20} color="#fff" />
              <Text className="text-white font-bold ml-2">Delete Picture</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`${bgInput} p-4 rounded-lg border ${borderInput}`}
              onPress={() => setShowPictureModal(false)}
            >
              <Text className={`${textPrimary} text-center font-semibold`}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ConfirmModal
        visible={showDeletePictureModal}
        title="Delete Profile Picture"
        message="Are you sure you want to delete your profile picture?"
        confirmText="Delete"
        confirmColor="bg-red-600"
        isProcessing={deletingPicture}
        onConfirm={confirmDeletePicture}
        onCancel={() => setShowDeletePictureModal(false)}
      />

      <Toast />
    </ScreenWrapper>
  );
}
