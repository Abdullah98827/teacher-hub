import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Clipboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../supabase";

const MAX_WORDS = 500;

const ALL_LANGUAGES = [
  { code: "ur", name: "Urdu", rtl: true },
  { code: "ar", name: "Arabic", rtl: true },
  { code: "fa", name: "Persian (Farsi)", rtl: true },
  { code: "es", name: "Spanish", rtl: false },
  { code: "fr", name: "French", rtl: false },
  { code: "de", name: "German", rtl: false },
  { code: "it", name: "Italian", rtl: false },
  { code: "pt", name: "Portuguese", rtl: false },
  { code: "nl", name: "Dutch", rtl: false },
  { code: "pl", name: "Polish", rtl: false },
  { code: "ru", name: "Russian", rtl: false },
  { code: "uk", name: "Ukrainian", rtl: false },
  { code: "ro", name: "Romanian", rtl: false },
  { code: "tr", name: "Turkish", rtl: false },
  { code: "zh", name: "Chinese (Simplified)", rtl: false },
  { code: "zh-TW", name: "Chinese (Traditional)", rtl: false },
  { code: "ja", name: "Japanese", rtl: false },
  { code: "ko", name: "Korean", rtl: false },
  { code: "hi", name: "Hindi", rtl: false },
  { code: "bn", name: "Bengali", rtl: false },
  { code: "pa", name: "Punjabi", rtl: false },
  { code: "gu", name: "Gujarati", rtl: false },
  { code: "ta", name: "Tamil", rtl: false },
  { code: "te", name: "Telugu", rtl: false },
  { code: "ml", name: "Malayalam", rtl: false },
  { code: "sw", name: "Swahili", rtl: false },
  { code: "so", name: "Somali", rtl: false },
  { code: "am", name: "Amharic", rtl: false },
  { code: "vi", name: "Vietnamese", rtl: false },
  { code: "id", name: "Indonesian", rtl: false },
];

interface TranslationModalProps {
  visible: boolean;
  onClose: () => void;
  resourceId: string;
}

export default function TranslationModal({
  visible,
  onClose,
  resourceId,
}: TranslationModalProps) {
  const [inputText, setInputText] = useState("");
  const [selectedLang, setSelectedLang] = useState(ALL_LANGUAGES[0]);
  const [translatedText, setTranslatedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [langSearch, setLangSearch] = useState("");
  const [recentLangs, setRecentLangs] = useState<typeof ALL_LANGUAGES>([]);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // ── word count ──────────────────────────────────────────────────────────────
  const wordCount =
    inputText.trim() === ""
      ? 0
      : inputText.trim().split(/\s+/).filter(Boolean).length;
  const isOverLimit = wordCount > MAX_WORDS;
  const isNearLimit = wordCount >= 400 && !isOverLimit;
  const wordCountColor = isOverLimit
    ? "#f87171"
    : isNearLimit
      ? "#fbbf24"
      : "#4B5563";

  function handleClose() {
    setInputText("");
    setTranslatedText("");
    setError("");
    setDone(false);
    setShowDropdown(false);
    setLangSearch("");
    onClose();
  }

  function selectLanguage(lang: (typeof ALL_LANGUAGES)[0]) {
    setSelectedLang(lang);
    setShowDropdown(false);
    setLangSearch("");
    setDone(false);
    setTranslatedText("");
    setError("");
    setRecentLangs((prev) => {
      const filtered = prev.filter((l) => l.code !== lang.code);
      return [lang, ...filtered].slice(0, 3);
    });
  }

  async function handleTranslate() {
    if (!inputText.trim()) {
      setError("Please paste or type some text first.");
      return;
    }
    if (isOverLimit) {
      setError(`Please reduce your text to under ${MAX_WORDS} words.`);
      return;
    }

    setLoading(true);
    setError("");
    setTranslatedText("");
    setDone(false);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in.");

      const { data, error: fnError } = await supabase.functions.invoke(
        "translate",
        {
          body: {
            text: inputText.trim(), // always the current typed text
            target_language: selectedLang.code,
            resource_id: resourceId, // only used for analytics logging
            user_id: user.id,
          },
        }
      );

      if (fnError) throw new Error(fnError.message);
      if (!data?.translated_text)
        throw new Error(data?.error ?? "Translation failed.");

      setTranslatedText(data.translated_text);
      setDone(true);

      // Add to recents on success
      setRecentLangs((prev) => {
        const filtered = prev.filter((l) => l.code !== selectedLang.code);
        return [selectedLang, ...filtered].slice(0, 3);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    Clipboard.setString(translatedText);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  }

  async function handleShare() {
    try {
      await Share.share({
        message: `Original:\n${inputText}\n\n${selectedLang.name} Translation:\n${translatedText}`,
        title: `Translation to ${selectedLang.name}`,
      });
    } catch (_) {}
  }

  // Build language list: recents pinned at top
  const recentCodes = new Set(recentLangs.map((l) => l.code));
  const otherLangs = ALL_LANGUAGES.filter((l) => !recentCodes.has(l.code));
  const filteredRecent = recentLangs.filter((l) =>
    l.name.toLowerCase().includes(langSearch.toLowerCase())
  );
  const filteredOthers = otherLangs.filter((l) =>
    l.name.toLowerCase().includes(langSearch.toLowerCase())
  );

  const isRtl = selectedLang.rtl;
  const card = {
    backgroundColor: "#171717",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#262626",
  } as const;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: "#0a0a0a" }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 16,
            backgroundColor: "#171717",
            borderBottomWidth: 1,
            borderBottomColor: "#262626",
          }}
        >
          <TouchableOpacity onPress={handleClose} style={{ padding: 4 }}>
            <Text style={{ color: "#9CA3AF", fontSize: 15, fontWeight: "600" }}>
              Cancel
            </Text>
          </TouchableOpacity>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="language-outline" size={20} color="#22d3ee" />
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 17 }}>
              Translate
            </Text>
          </View>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView
          style={{ flex: 1, paddingHorizontal: 20 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Text input */}
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              color: "#6B7280",
              marginTop: 24,
              marginBottom: 8,
              letterSpacing: 0.8,
            }}
          >
            PASTE OR TYPE YOUR TEXT
          </Text>
          <TextInput
            style={{
              ...card,
              padding: 14,
              color: "#fff",
              fontSize: 15,
              minHeight: 140,
              textAlignVertical: "top",
              lineHeight: 22,
              borderColor: isOverLimit
                ? "#7f1d1d"
                : isNearLimit
                  ? "#78350f"
                  : "#262626",
            }}
            placeholder="Paste text from your document here…"
            placeholderTextColor="#4B5563"
            multiline
            value={inputText}
            onChangeText={(t) => {
              setInputText(t);
              setDone(false);
              setTranslatedText("");
              setError("");
            }}
          />

          {/* Word count + progress bar */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 8,
              marginBottom: 4,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                color: wordCountColor,
                fontWeight: isOverLimit || isNearLimit ? "700" : "400",
              }}
            >
              {wordCount} / {MAX_WORDS} words
              {isOverLimit
                ? `  — remove ${wordCount - MAX_WORDS} words`
                : isNearLimit
                  ? "  — approaching limit"
                  : ""}
            </Text>
          </View>
          <View
            style={{
              height: 3,
              backgroundColor: "#262626",
              borderRadius: 2,
              marginBottom: 24,
            }}
          >
            <View
              style={{
                height: 3,
                borderRadius: 2,
                width:
                  `${Math.min((wordCount / MAX_WORDS) * 100, 100)}%` as any,
                backgroundColor: isOverLimit
                  ? "#ef4444"
                  : isNearLimit
                    ? "#f59e0b"
                    : "#22d3ee",
              }}
            />
          </View>

          {/* Over-limit warning */}
          {isOverLimit && (
            <View
              style={{
                backgroundColor: "#450a0a",
                borderWidth: 1,
                borderColor: "#7f1d1d",
                borderRadius: 10,
                padding: 14,
                marginBottom: 20,
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <Ionicons
                name="warning-outline"
                size={18}
                color="#f87171"
                style={{ marginTop: 1 }}
              />
              <Text
                style={{
                  color: "#fca5a5",
                  fontSize: 14,
                  lineHeight: 20,
                  flex: 1,
                }}
              >
                Text exceeds the {MAX_WORDS}-word limit. Please shorten before
                translating.
              </Text>
            </View>
          )}

          {/* Language label */}
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              color: "#6B7280",
              marginBottom: 10,
              letterSpacing: 0.8,
            }}
          >
            TARGET LANGUAGE
          </Text>

          {/* Recently used chips */}
          {!showDropdown && recentLangs.length > 0 && (
            <View style={{ marginBottom: 10 }}>
              <Text
                style={{
                  fontSize: 10,
                  color: "#4B5563",
                  marginBottom: 6,
                  letterSpacing: 0.5,
                }}
              >
                RECENTLY USED
              </Text>
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                {recentLangs.map((lang) => {
                  const isSel = lang.code === selectedLang.code;
                  return (
                    <TouchableOpacity
                      key={lang.code}
                      onPress={() => selectLanguage(lang)}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 8,
                        borderWidth: 1.5,
                        backgroundColor: isSel ? "#22d3ee15" : "#171717",
                        borderColor: isSel ? "#22d3ee" : "#374151",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      {isSel && (
                        <Ionicons name="checkmark" size={13} color="#22d3ee" />
                      )}
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "600",
                          color: isSel ? "#22d3ee" : "#9CA3AF",
                        }}
                      >
                        {lang.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Dropdown trigger */}
          <TouchableOpacity
            onPress={() => setShowDropdown(!showDropdown)}
            style={{
              ...card,
              borderColor: showDropdown ? "#22d3ee" : "#374151",
              paddingHorizontal: 16,
              paddingVertical: 14,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: showDropdown ? 0 : 24,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}>
              {selectedLang.name}
            </Text>
            <Ionicons
              name={showDropdown ? "chevron-up" : "chevron-down"}
              size={20}
              color="#22d3ee"
            />
          </TouchableOpacity>

          {/* Dropdown panel */}
          {showDropdown && (
            <View style={{ ...card, marginBottom: 24, overflow: "hidden" }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  borderBottomWidth: 1,
                  borderBottomColor: "#262626",
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  gap: 8,
                }}
              >
                <Ionicons name="search-outline" size={16} color="#6B7280" />
                <TextInput
                  style={{ flex: 1, color: "#fff", fontSize: 14 }}
                  placeholder="Search language…"
                  placeholderTextColor="#4B5563"
                  value={langSearch}
                  onChangeText={setLangSearch}
                />
              </View>
              <ScrollView style={{ maxHeight: 300 }} nestedScrollEnabled>
                {filteredRecent.length > 0 && langSearch === "" && (
                  <>
                    <View
                      style={{
                        paddingHorizontal: 16,
                        paddingTop: 10,
                        paddingBottom: 4,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          color: "#4B5563",
                          fontWeight: "700",
                          letterSpacing: 0.5,
                        }}
                      >
                        RECENTLY USED
                      </Text>
                    </View>
                    {filteredRecent.map((lang) => {
                      const isSel = lang.code === selectedLang.code;
                      return (
                        <TouchableOpacity
                          key={`r-${lang.code}`}
                          onPress={() => selectLanguage(lang)}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            paddingHorizontal: 16,
                            paddingVertical: 13,
                            backgroundColor: isSel
                              ? "#22d3ee10"
                              : "transparent",
                            borderBottomWidth: 1,
                            borderBottomColor: "#1f1f1f",
                          }}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <Ionicons
                              name="time-outline"
                              size={14}
                              color="#4B5563"
                            />
                            <Text
                              style={{
                                fontSize: 14,
                                fontWeight: isSel ? "700" : "500",
                                color: isSel ? "#22d3ee" : "#D1D5DB",
                              }}
                            >
                              {lang.name}
                            </Text>
                          </View>
                          {isSel && (
                            <Ionicons
                              name="checkmark"
                              size={16}
                              color="#22d3ee"
                            />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                    <View
                      style={{
                        paddingHorizontal: 16,
                        paddingTop: 12,
                        paddingBottom: 4,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          color: "#4B5563",
                          fontWeight: "700",
                          letterSpacing: 0.5,
                        }}
                      >
                        ALL LANGUAGES
                      </Text>
                    </View>
                  </>
                )}
                {(langSearch !== ""
                  ? [...filteredRecent, ...filteredOthers]
                  : filteredOthers
                ).map((lang, index, arr) => {
                  const isSel = lang.code === selectedLang.code;
                  return (
                    <TouchableOpacity
                      key={lang.code}
                      onPress={() => selectLanguage(lang)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingHorizontal: 16,
                        paddingVertical: 13,
                        backgroundColor: isSel ? "#22d3ee10" : "transparent",
                        borderBottomWidth: index < arr.length - 1 ? 1 : 0,
                        borderBottomColor: "#1f1f1f",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: isSel ? "700" : "400",
                          color: isSel ? "#22d3ee" : "#D1D5DB",
                        }}
                      >
                        {lang.name}
                      </Text>
                      {isSel && (
                        <Ionicons name="checkmark" size={16} color="#22d3ee" />
                      )}
                    </TouchableOpacity>
                  );
                })}
                {filteredRecent.length === 0 && filteredOthers.length === 0 && (
                  <View style={{ padding: 24, alignItems: "center" }}>
                    <Text style={{ color: "#6B7280", fontSize: 14 }}>
                      No languages found
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          )}

          {/* Error */}
          {!!error && (
            <View
              style={{
                backgroundColor: "#450a0a",
                borderWidth: 1,
                borderColor: "#7f1d1d",
                borderRadius: 10,
                padding: 14,
                marginBottom: 20,
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <Ionicons
                name="alert-circle-outline"
                size={18}
                color="#f87171"
                style={{ marginTop: 1 }}
              />
              <Text
                style={{
                  color: "#fca5a5",
                  fontSize: 14,
                  lineHeight: 20,
                  flex: 1,
                }}
              >
                {error}
              </Text>
            </View>
          )}

          {/* Results */}
          {done && !!translatedText && (
            <>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color: "#6B7280",
                  marginBottom: 12,
                  letterSpacing: 0.8,
                }}
              >
                TRANSLATION
              </Text>

              {/* Original */}
              <View style={{ ...card, padding: 16, marginBottom: 12 }}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: "#6B7280",
                    marginBottom: 8,
                    letterSpacing: 0.5,
                  }}
                >
                  ORIGINAL
                </Text>
                <Text
                  style={{ fontSize: 15, color: "#D1D5DB", lineHeight: 24 }}
                >
                  {inputText}
                </Text>
              </View>

              {/* Translated + Copy/Share */}
              <View
                style={{
                  backgroundColor: "#0e2a2e",
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#164e63",
                  marginBottom: 32,
                }}
              >
                <View style={{ padding: 16 }}>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color: "#22d3ee",
                      marginBottom: 8,
                      letterSpacing: 0.5,
                    }}
                  >
                    {selectedLang.name.toUpperCase()}
                  </Text>
                  <Text
                    style={{
                      fontSize: 15,
                      color: "#a5f3fc",
                      lineHeight: 26,
                      writingDirection: isRtl ? "rtl" : "ltr",
                      textAlign: isRtl ? "right" : "left",
                    }}
                  >
                    {translatedText}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    borderTopWidth: 1,
                    borderTopColor: "#164e63",
                  }}
                >
                  <TouchableOpacity
                    onPress={handleCopy}
                    style={{
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      paddingVertical: 13,
                      gap: 6,
                      borderRightWidth: 1,
                      borderRightColor: "#164e63",
                    }}
                  >
                    <Ionicons
                      name={copyFeedback ? "checkmark-circle" : "copy-outline"}
                      size={16}
                      color={copyFeedback ? "#4ade80" : "#22d3ee"}
                    />
                    <Text
                      style={{
                        color: copyFeedback ? "#4ade80" : "#22d3ee",
                        fontSize: 14,
                        fontWeight: "600",
                      }}
                    >
                      {copyFeedback ? "Copied!" : "Copy"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleShare}
                    style={{
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      paddingVertical: 13,
                      gap: 6,
                    }}
                  >
                    <Ionicons name="share-outline" size={16} color="#22d3ee" />
                    <Text
                      style={{
                        color: "#22d3ee",
                        fontSize: 14,
                        fontWeight: "600",
                      }}
                    >
                      Share
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}

          <View style={{ height: 12 }} />
        </ScrollView>

        {/* Translate button */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingBottom: 36,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: "#262626",
            backgroundColor: "#0a0a0a",
          }}
        >
          <TouchableOpacity
            onPress={handleTranslate}
            disabled={loading || !inputText.trim() || isOverLimit}
            style={{
              backgroundColor:
                loading || !inputText.trim() || isOverLimit
                  ? "#1f1f1f"
                  : "#22d3ee",
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: "center",
            }}
          >
            {loading ? (
              <ActivityIndicator color="#22d3ee" />
            ) : (
              <Text
                style={{
                  fontWeight: "700",
                  fontSize: 15,
                  color: !inputText.trim() || isOverLimit ? "#4B5563" : "#000",
                }}
              >
                {isOverLimit
                  ? `Remove ${wordCount - MAX_WORDS} words to translate`
                  : `Translate to ${selectedLang.name}`}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
