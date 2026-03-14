import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
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
import { useAppTheme } from "../hooks/useAppTheme";
import { supabase } from "../supabase";

const MAX_CHARS = 3000;

const LANGUAGES = [
  { code: "ur", name: "Urdu",            rtl: true  },
  { code: "ar", name: "Arabic",          rtl: true  },
  { code: "fa", name: "Persian (Farsi)", rtl: true  },
  { code: "hi", name: "Hindi",           rtl: false },
  { code: "bn", name: "Bengali",         rtl: false },
  { code: "pa", name: "Punjabi",         rtl: false },
  { code: "gu", name: "Gujarati",        rtl: false },
  { code: "ta", name: "Tamil",           rtl: false },
  { code: "so", name: "Somali",          rtl: false },
  { code: "sw", name: "Swahili",         rtl: false },
  { code: "pl", name: "Polish",          rtl: false },
  { code: "ro", name: "Romanian",        rtl: false },
  { code: "uk", name: "Ukrainian",       rtl: false },
  { code: "ru", name: "Russian",         rtl: false },
  { code: "tr", name: "Turkish",         rtl: false },
  { code: "es", name: "Spanish",         rtl: false },
  { code: "fr", name: "French",          rtl: false },
  { code: "de", name: "German",          rtl: false },
  { code: "pt", name: "Portuguese",      rtl: false },
  { code: "zh", name: "Chinese",         rtl: false },
  { code: "ja", name: "Japanese",        rtl: false },
  { code: "ko", name: "Korean",          rtl: false },
  { code: "vi", name: "Vietnamese",      rtl: false },
  { code: "id", name: "Indonesian",      rtl: false },
];

export default function TranslationModal({ visible, onClose, resourceId }) {
  const { isDark } = useAppTheme();
  const C = {
    bg:            isDark ? "#0d0d0d" : "#ffffff",
    surface:       isDark ? "#161616" : "#f9fafb",
    surfaceHi:     isDark ? "#1e1e1e" : "#f3f4f6",
    border:        isDark ? "#252525" : "#e5e7eb",
    borderHi:      isDark ? "#2e2e2e" : "#d1d5db",
    accent:        "#22d3ee",
    accentDim:     "#22d3ee18",
    textPrimary:   isDark ? "#f0f0f0" : "#111827",
    textSecondary: isDark ? "#888888" : "#6b7280",
    textMuted:     isDark ? "#555555" : "#9ca3af",
    green:         "#34d399",
    red:           "#f87171",
  };

  const [inputText, setInputText]       = useState("");
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const [translated, setTranslated]     = useState("");
  const [showLangDrop, setShowLangDrop] = useState(false);
  const [langSearch, setLangSearch]     = useState("");
  const [copyFeedback, setCopyFeedback] = useState(false);

  const charCount   = inputText.length;
  const isOverLimit = charCount > MAX_CHARS;
  const isNearLimit = charCount >= MAX_CHARS * 0.85 && !isOverLimit;
  const charColor   = isOverLimit ? C.red : isNearLimit ? "#fbbf24" : C.textMuted;

  const filteredLangs = LANGUAGES.filter((l) =>
    l.name.toLowerCase().includes(langSearch.toLowerCase())
  );
  const isRtl = selectedLang.rtl;

  function handleClose() {
    setInputText("");
    setError("");
    setTranslated("");
    setShowLangDrop(false);
    setLangSearch("");
    onClose();
  }

  async function handleTranslate() {
    if (!inputText.trim()) {
      setError("Please enter some text to translate.");
      return;
    }
    if (isOverLimit) {
      setError(`Please reduce text to under ${MAX_CHARS} characters.`);
      return;
    }
    setLoading(true);
    setError("");
    setTranslated("");
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in.");

      const { data, error: fnError } = await supabase.functions.invoke(
        "translate",
        {
          body: {
            text: inputText.trim(),
            target_language: selectedLang.code,
            resource_id: resourceId || null,
            user_id: user.id,
          },
        }
      );

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
      if (!data?.translated_text) throw new Error("No translation returned.");

      setTranslated(data.translated_text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!translated) return;
    Clipboard.setString(translated);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  }

  async function handleShare() {
    if (!translated) return;
    try {
      await Share.share({
        message: `Translation (${selectedLang.name}):\n\n${translated}`,
        title: `Translation — ${selectedLang.name}`,
      });
    } catch (_) {}
  }

  const canTranslate = !loading && !!inputText.trim() && !isOverLimit;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: C.bg }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* ── Header ── */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingTop: 18,
            paddingBottom: 14,
            backgroundColor: C.surface,
            borderBottomWidth: 1,
            borderBottomColor: C.border,
          }}
        >
          <TouchableOpacity
            onPress={handleClose}
            style={{ padding: 4, minWidth: 60 }}
          >
            <Text style={{ color: C.textSecondary, fontSize: 15 }}>Cancel</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
            <Ionicons name="language-outline" size={17} color={C.accent} />
            <Text
              style={{
                color: C.textPrimary,
                fontWeight: "600",
                fontSize: 16,
                letterSpacing: -0.3,
              }}
            >
              Translate
            </Text>
          </View>
          <View style={{ minWidth: 60 }} />
        </View>

        {/* ── Result view ── */}
        {translated ? (
          <View style={{ flex: 1 }}>
            {/* Result header */}
            <View
              style={{
                backgroundColor: C.surface,
                paddingHorizontal: 20,
                paddingTop: 16,
                paddingBottom: 16,
                borderBottomWidth: 1,
                borderBottomColor: C.border,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text
                style={{
                  flex: 1,
                  color: C.textPrimary,
                  fontSize: 15,
                  fontWeight: "600",
                  letterSpacing: -0.2,
                }}
              >
                Translated to{" "}
                <Text style={{ color: C.accent }}>{selectedLang.name}</Text>
              </Text>
              <View style={{ flexDirection: "row", gap: 16 }}>
                <TouchableOpacity
                  onPress={handleCopy}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={copyFeedback ? "checkmark" : "copy-outline"}
                    size={20}
                    color={copyFeedback ? C.green : C.textSecondary}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleShare}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name="share-outline"
                    size={20}
                    color={C.textSecondary}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setTranslated("")}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name="arrow-back-outline"
                    size={20}
                    color={C.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Original */}
              <Text
                style={{
                  color: C.textMuted,
                  fontSize: 11,
                  fontWeight: "600",
                  letterSpacing: 1,
                  marginBottom: 10,
                  textTransform: "uppercase",
                }}
              >
                Original (English)
              </Text>
              <View
                style={{
                  backgroundColor: C.surface,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: C.border,
                  padding: 16,
                  marginBottom: 24,
                }}
              >
                <Text
                  style={{ color: C.textSecondary, fontSize: 14, lineHeight: 22 }}
                >
                  {inputText.trim()}
                </Text>
              </View>

              {/* Translation */}
              <Text
                style={{
                  color: C.textMuted,
                  fontSize: 11,
                  fontWeight: "600",
                  letterSpacing: 1,
                  marginBottom: 10,
                  textTransform: "uppercase",
                }}
              >
                {selectedLang.name} Translation
              </Text>
              <View
                style={{
                  backgroundColor: C.surface,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: C.border,
                  overflow: "hidden",
                }}
              >
                <View style={{ flexDirection: "row" }}>
                  <View
                    style={{
                      width: 3,
                      backgroundColor: C.accent,
                      borderTopLeftRadius: 10,
                      borderBottomLeftRadius: 10,
                    }}
                  />
                  <Text
                    style={{
                      flex: 1,
                      color: C.textPrimary,
                      fontSize: 16,
                      lineHeight: 28,
                      padding: 16,
                      letterSpacing: -0.1,
                      writingDirection: isRtl ? "rtl" : "ltr",
                      textAlign: isRtl ? "right" : "left",
                    }}
                  >
                    {translated}
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        ) : (
          /* ── Input view ── */
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 24,
              paddingBottom: 140,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "600",
                color: C.textMuted,
                marginBottom: 8,
                letterSpacing: 0.8,
                textTransform: "uppercase",
              }}
            >
              Text to translate
            </Text>
            <TextInput
              style={{
                backgroundColor: C.surface,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: isOverLimit
                  ? (isDark ? "#7f1d1d" : "#fca5a5")
                  : C.border,
                padding: 14,
                color: C.textPrimary,
                fontSize: 15,
                minHeight: 160,
                textAlignVertical: "top",
                lineHeight: 23,
              }}
              placeholder="Type or paste the English text you want to translate…"
              placeholderTextColor={C.textMuted}
              multiline
              value={inputText}
              onChangeText={(t) => {
                setInputText(t);
                setError("");
              }}
            />

            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                marginTop: 6,
                marginBottom: 6,
              }}
            >
              <Text style={{ fontSize: 12, color: charColor }}>
                {charCount} / {MAX_CHARS}
                {isOverLimit ? `  — remove ${charCount - MAX_CHARS} chars` : ""}
              </Text>
            </View>

            {/* Progress bar */}
            <View
              style={{
                height: 2,
                backgroundColor: C.border,
                borderRadius: 1,
                marginBottom: 28,
              }}
            >
              <View
                style={{
                  height: 2,
                  borderRadius: 1,
                  width: `${Math.min((charCount / MAX_CHARS) * 100, 100)}%`,
                  backgroundColor: isOverLimit ? C.red : C.accent,
                }}
              />
            </View>

            {/* Language selector */}
            <Text
              style={{
                fontSize: 11,
                fontWeight: "600",
                color: C.textMuted,
                marginBottom: 8,
                letterSpacing: 0.8,
                textTransform: "uppercase",
              }}
            >
              Target language
            </Text>
            <TouchableOpacity
              onPress={() => setShowLangDrop(!showLangDrop)}
              style={{
                backgroundColor: C.surface,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: showLangDrop ? C.accent : C.borderHi,
                paddingHorizontal: 16,
                paddingVertical: 13,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: showLangDrop ? 0 : 24,
              }}
            >
              <Text style={{ color: C.textPrimary, fontSize: 15, fontWeight: "500" }}>
                {selectedLang.name}
              </Text>
              <Ionicons
                name={showLangDrop ? "chevron-up" : "chevron-down"}
                size={18}
                color={C.textSecondary}
              />
            </TouchableOpacity>

            {showLangDrop && (
              <View
                style={{
                  backgroundColor: C.surface,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: C.accent,
                  marginBottom: 24,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    borderBottomWidth: 1,
                    borderBottomColor: C.border,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    gap: 8,
                  }}
                >
                  <Ionicons name="search-outline" size={15} color={C.textMuted} />
                  <TextInput
                    style={{ flex: 1, color: C.textPrimary, fontSize: 14 }}
                    placeholder="Search…"
                    placeholderTextColor={C.textMuted}
                    value={langSearch}
                    onChangeText={setLangSearch}
                  />
                </View>
                <ScrollView style={{ maxHeight: 240 }} nestedScrollEnabled>
                  {filteredLangs.map((lang, index) => {
                    const isSel = lang.code === selectedLang.code;
                    return (
                      <TouchableOpacity
                        key={lang.code}
                        onPress={() => {
                          setSelectedLang(lang);
                          setShowLangDrop(false);
                          setLangSearch("");
                        }}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          backgroundColor: isSel ? C.accentDim : "transparent",
                          borderBottomWidth: index < filteredLangs.length - 1 ? 1 : 0,
                          borderBottomColor: C.border,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: isSel ? "600" : "400",
                            color: isSel ? C.accent : C.textPrimary,
                          }}
                        >
                          {lang.name}
                        </Text>
                        {isSel && (
                          <Ionicons name="checkmark" size={15} color={C.accent} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Error */}
            {!!error && (
              <View
                style={{
                  backgroundColor: isDark ? "#1a0a0a" : "#fef2f2",
                  borderWidth: 1,
                  borderColor: isDark ? "#3f1515" : "#fca5a5",
                  borderRadius: 8,
                  padding: 13,
                  marginTop: 4,
                  flexDirection: "row",
                  gap: 10,
                }}
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={16}
                  color={C.red}
                  style={{ marginTop: 1 }}
                />
                <Text
                  style={{
                    color: isDark ? "#fca5a5" : "#b91c1c",
                    fontSize: 13,
                    lineHeight: 19,
                    flex: 1,
                  }}
                >
                  {error}
                </Text>
              </View>
            )}
          </ScrollView>
        )}

        {/* ── Translate button ── */}
        {!translated && (
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              paddingHorizontal: 20,
              paddingBottom: Platform.OS === "ios" ? 34 : 20,
              paddingTop: 12,
              backgroundColor: C.bg,
              borderTopWidth: 1,
              borderTopColor: C.border,
            }}
          >
            <TouchableOpacity
              onPress={handleTranslate}
              disabled={!canTranslate}
              style={{
                backgroundColor: canTranslate ? C.accent : C.surface,
                borderRadius: 10,
                paddingVertical: 15,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 8,
                borderWidth: canTranslate ? 0 : 1,
                borderColor: C.border,
              }}
            >
              {loading ? (
                <>
                  <ActivityIndicator color={C.accent} size="small" />
                  <Text style={{ color: C.accent, fontWeight: "600", fontSize: 15 }}>
                    Translating…
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons
                    name="language"
                    size={16}
                    color={canTranslate ? "#000" : C.textMuted}
                  />
                  <Text
                    style={{
                      fontWeight: "600",
                      fontSize: 15,
                      color: canTranslate ? "#000" : C.textMuted,
                      letterSpacing: -0.2,
                    }}
                  >
                    {isOverLimit
                      ? `Remove ${charCount - MAX_CHARS} characters`
                      : `Translate to ${selectedLang.name}`}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}
