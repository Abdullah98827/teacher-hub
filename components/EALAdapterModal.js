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
    TouchableOpacity,
    View,
} from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";
import { supabase } from "../supabase";
import { ThemedTextInput } from './themed-textinput';

const MAX_WORDS = 600;

const LANGUAGES = [
  { code: "ur", name: "Urdu", rtl: true },
  { code: "ar", name: "Arabic", rtl: true },
  { code: "fa", name: "Persian (Farsi)", rtl: true },
  { code: "hi", name: "Hindi", rtl: false },
  { code: "bn", name: "Bengali", rtl: false },
  { code: "pa", name: "Punjabi", rtl: false },
  { code: "gu", name: "Gujarati", rtl: false },
  { code: "ta", name: "Tamil", rtl: false },
  { code: "so", name: "Somali", rtl: false },
  { code: "sw", name: "Swahili", rtl: false },
  { code: "pl", name: "Polish", rtl: false },
  { code: "ro", name: "Romanian", rtl: false },
  { code: "uk", name: "Ukrainian", rtl: false },
  { code: "ru", name: "Russian", rtl: false },
  { code: "tr", name: "Turkish", rtl: false },
  { code: "es", name: "Spanish", rtl: false },
  { code: "fr", name: "French", rtl: false },
  { code: "de", name: "German", rtl: false },
  { code: "pt", name: "Portuguese", rtl: false },
  { code: "zh", name: "Chinese", rtl: false },
  { code: "ja", name: "Japanese", rtl: false },
  { code: "ko", name: "Korean", rtl: false },
  { code: "vi", name: "Vietnamese", rtl: false },
  { code: "id", name: "Indonesian", rtl: false },
];

const SUBJECTS = [
  "General",
  "English",
  "Maths",
  "Science",
  "History",
  "Geography",
  "Art",
  "Music",
  "PE",
  "PSHE",
  "Computing",
  "RE",
];

const YEAR_GROUPS = [
  "Any",
  "KS1 (Y1-2)",
  "KS2 (Y3-6)",
  "KS3 (Y7-9)",
  "KS4 (Y10-11)",
  "KS5 (Y12-13)",
];

const TABS = [
  { id: "simplified", label: "Simplified", icon: "document-text-outline" },
  { id: "vocabulary", label: "Vocabulary", icon: "book-outline" },
  { id: "tips", label: "Tips", icon: "bulb-outline" },
  { id: "glossary", label: "Glossary", icon: "language-outline" },
];

export default function EALAdapterModal({ visible, onClose, resourceId }) {
  const { isDark } = useAppTheme();
  const C = {
    bg:           isDark ? "#0d0d0d"  : "#ffffff",
    surface:      isDark ? "#161616"  : "#f9fafb",
    surfaceHi:    isDark ? "#1e1e1e"  : "#f3f4f6",
    border:       isDark ? "#252525"  : "#e5e7eb",
    borderHi:     isDark ? "#2e2e2e"  : "#d1d5db",
    accent:       "#22d3ee",
    accentDim:    "#22d3ee18",
    textPrimary:  isDark ? "#f0f0f0"  : "#111827",
    textSecondary:isDark ? "#888888"  : "#6b7280",
    textMuted:    isDark ? "#555555"  : "#9ca3af",
    green:        "#34d399",
    red:          "#f87171",
    amber:        "#fbbf24",
  };
  const [inputText, setInputText] = useState("");
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [selectedSubject, setSelectedSubject] = useState("General");
  const [selectedYear, setSelectedYear] = useState("Any");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState("simplified");
  const [showLangDrop, setShowLangDrop] = useState(false);
  const [langSearch, setLangSearch] = useState("");
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const wordCount =
    inputText.trim() === ""
      ? 0
      : inputText.trim().split(/\s+/).filter(Boolean).length;
  const isOverLimit = wordCount > MAX_WORDS;
  const isNearLimit = wordCount >= 500 && !isOverLimit;
  const wordColor = isOverLimit ? C.red : isNearLimit ? C.amber : C.textMuted;
  const filteredLangs = LANGUAGES.filter((l) =>
    l.name.toLowerCase().includes(langSearch.toLowerCase())
  );
  const isRtl = selectedLang.rtl;

  function handleClose() {
    setInputText("");
    setError("");
    setResult(null);
    setShowLangDrop(false);
    setLangSearch("");
    setShowOptions(false);
    onClose();
  }

  async function handleAdapt() {
    if (!inputText.trim()) {
      setError("Please paste or type some text first.");
      return;
    }
    if (isOverLimit) {
      setError(`Please reduce text to under ${MAX_WORDS} words.`);
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in.");
      const { data, error: fnError } = await supabase.functions.invoke(
        "eal-adapter",
        {
          body: {
            text: inputText.trim(),
            language: selectedLang.name,
            languageCode: selectedLang.code,
            subject: selectedSubject.toLowerCase(),
            yearGroup: selectedYear,
            resourceId,
            userId: user.id,
          },
        }
      );
      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error ?? "Adaptation failed.");
      setResult(data);
      setActiveTab("simplified");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!result) return;
    const content =
      activeTab === "simplified"
        ? result.simplified
        : activeTab === "vocabulary"
          ? result.vocabulary
              .map((v) => `${v.word}: ${v.definition}`)
              .join("\n")
          : activeTab === "tips"
            ? result.teachingTips.map((t, i) => `${i + 1}. ${t}`).join("\n")
            : result.bilingualGlossary
                .map((g) => `${g.term} — ${g.translation}`)
                .join("\n");
    Clipboard.setString(content);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  }

  async function handleShare() {
    if (!result) return;
    try {
      await Share.share({
        message: `EAL Adaptation (${result.language})\n\nSIMPLIFIED:\n${result.simplified}\n\nVOCABULARY:\n${result.vocabulary.map((v) => `• ${v.word}: ${v.definition}`).join("\n")}\n\nTEACHING TIPS:\n${result.teachingTips.map((t, i) => `${i + 1}. ${t}`).join("\n")}`,
        title: `EAL Adaptation — ${result.language}`,
      });
    } catch (_) {}
  }

  const canAdapt = !loading && !!inputText.trim() && !isOverLimit;

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
            <Ionicons name="sparkles-outline" size={17} color={C.accent} />
            <Text
              style={{
                color: C.textPrimary,
                fontWeight: "600",
                fontSize: 16,
                letterSpacing: -0.3,
              }}
            >
              EAL Adapter
            </Text>
          </View>
          <View style={{ minWidth: 60 }} />
        </View>

        {result ? (
          <View style={{ flex: 1 }}>
            <View
              style={{
                backgroundColor: C.surface,
                paddingHorizontal: 20,
                paddingTop: 14,
                paddingBottom: 0,
                borderBottomWidth: 1,
                borderBottomColor: C.border,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  marginBottom: 14,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: C.textPrimary,
                      fontSize: 15,
                      fontWeight: "600",
                      letterSpacing: -0.2,
                    }}
                  >
                    Adapted for{" "}
                    <Text style={{ color: C.accent }}>{result.language}</Text>{" "}
                    speakers
                  </Text>
                  {(selectedSubject !== "General" ||
                    selectedYear !== "Any") && (
                    <Text
                      style={{ color: C.textMuted, fontSize: 12, marginTop: 3 }}
                    >
                      {[
                        selectedSubject !== "General" ? selectedSubject : null,
                        selectedYear !== "Any" ? selectedYear : null,
                      ]
                        .filter(Boolean)
                        .join("  ·  ")}
                    </Text>
                  )}
                </View>
                <View style={{ flexDirection: "row", gap: 16, paddingTop: 2 }}>
                  <TouchableOpacity
                    onPress={handleCopy}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={copyFeedback ? "checkmark" : "copy-outline"}
                      size={19}
                      color={copyFeedback ? C.green : C.textSecondary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleShare}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name="share-outline"
                      size={19}
                      color={C.textSecondary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setResult(null)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name="arrow-back-outline"
                      size={19}
                      color={C.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 0 }}
              >
                {TABS.map((tab) => {
                  const active = activeTab === tab.id;
                  return (
                    <TouchableOpacity
                      key={tab.id}
                      onPress={() => setActiveTab(tab.id)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        paddingHorizontal: 4,
                        paddingVertical: 10,
                        marginRight: 24,
                        borderBottomWidth: 2,
                        borderBottomColor: active ? C.accent : "transparent",
                      }}
                    >
                      <Ionicons
                        name={tab.icon}
                        size={14}
                        color={active ? C.accent : C.textMuted}
                      />
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: active ? "600" : "400",
                          color: active ? C.textPrimary : C.textMuted,
                          letterSpacing: -0.1,
                        }}
                      >
                        {tab.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
              showsVerticalScrollIndicator={false}
            >
              {activeTab === "simplified" && (
                <View>
                  <Text
                    style={{
                      color: C.textMuted,
                      fontSize: 11,
                      fontWeight: "600",
                      letterSpacing: 1,
                      marginBottom: 14,
                      textTransform: "uppercase",
                    }}
                  >
                    Simplified version
                  </Text>
                  <View
                    style={{
                      backgroundColor: C.surface,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: C.border,
                      padding: 18,
                    }}
                  >
                    <Text
                      style={{
                        color: C.textPrimary,
                        fontSize: 15,
                        lineHeight: 26,
                        letterSpacing: -0.1,
                      }}
                    >
                      {result.simplified}
                    </Text>
                  </View>
                </View>
              )}

              {activeTab === "vocabulary" && (
                <View>
                  <Text
                    style={{
                      color: C.textMuted,
                      fontSize: 11,
                      fontWeight: "600",
                      letterSpacing: 1,
                      marginBottom: 14,
                      textTransform: "uppercase",
                    }}
                  >
                    Key vocabulary
                  </Text>
                  <View style={{ gap: 10 }}>
                    {result.vocabulary.map((v, i) => (
                      <View
                        key={i}
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
                          <View style={{ flex: 1, padding: 14 }}>
                            <Text
                              style={{
                                color: C.textPrimary,
                                fontSize: 15,
                                fontWeight: "600",
                                marginBottom: 4,
                                letterSpacing: -0.2,
                              }}
                            >
                              {v.word}
                            </Text>
                            <Text
                              style={{
                                color: C.textSecondary,
                                fontSize: 13,
                                lineHeight: 19,
                                marginBottom: v.example ? 10 : 0,
                              }}
                            >
                              {v.definition}
                            </Text>
                            {!!v.example && (
                              <Text
                                style={{
                                  color: C.textMuted,
                                  fontSize: 12,
                                  fontStyle: "italic",
                                  lineHeight: 17,
                                }}
                              >
                                e.g. "{v.example}"
                              </Text>
                            )}
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {activeTab === "tips" && (
                <View>
                  <Text
                    style={{
                      color: C.textMuted,
                      fontSize: 11,
                      fontWeight: "600",
                      letterSpacing: 1,
                      marginBottom: 14,
                      textTransform: "uppercase",
                    }}
                  >
                    Teaching tips for EAL learners
                  </Text>
                  <View style={{ gap: 8 }}>
                    {result.teachingTips.map((tip, i) => (
                      <View
                        key={i}
                        style={{
                          backgroundColor: C.surface,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: C.border,
                          flexDirection: "row",
                          padding: 14,
                          gap: 12,
                          alignItems: "flex-start",
                        }}
                      >
                        <Text
                          style={{
                            color: C.accent,
                            fontSize: 13,
                            fontWeight: "700",
                            minWidth: 18,
                            marginTop: 1,
                          }}
                        >
                          {i + 1}.
                        </Text>
                        <Text
                          style={{
                            color: C.textPrimary,
                            fontSize: 14,
                            lineHeight: 21,
                            flex: 1,
                            letterSpacing: -0.1,
                          }}
                        >
                          {tip}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {activeTab === "glossary" && (
                <View>
                  <Text
                    style={{
                      color: C.textMuted,
                      fontSize: 11,
                      fontWeight: "600",
                      letterSpacing: 1,
                      marginBottom: 14,
                      textTransform: "uppercase",
                    }}
                  >
                    Bilingual glossary — English / {result.language}
                  </Text>

                  <View
                    style={{
                      flexDirection: "row",
                      paddingHorizontal: 14,
                      paddingBottom: 8,
                    }}
                  >
                    <Text
                      style={{
                        flex: 1,
                        fontSize: 11,
                        fontWeight: "600",
                        color: C.textMuted,
                        letterSpacing: 0.5,
                      }}
                    >
                      ENGLISH
                    </Text>
                    <Text
                      style={{
                        flex: 1,
                        fontSize: 11,
                        fontWeight: "600",
                        color: C.textMuted,
                        letterSpacing: 0.5,
                        textAlign: isRtl ? "right" : "left",
                      }}
                    >
                      {result.language.toUpperCase()}
                    </Text>
                  </View>

                  <View
                    style={{
                      backgroundColor: C.surface,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: C.border,
                      overflow: "hidden",
                    }}
                  >
                    {result.bilingualGlossary.map((g, i) => (
                      <View
                        key={i}
                        style={{
                          flexDirection: "row",
                          paddingHorizontal: 14,
                          paddingVertical: 13,
                          backgroundColor:
                            i % 2 === 0 ? "transparent" : C.surfaceHi,
                          borderBottomWidth:
                            i < result.bilingualGlossary.length - 1 ? 1 : 0,
                          borderBottomColor: C.border,
                          alignItems: "center",
                        }}
                      >
                        <Text
                          style={{
                            flex: 1,
                            color: C.textPrimary,
                            fontSize: 14,
                            fontWeight: "500",
                          }}
                        >
                          {g.term}
                        </Text>
                        <Text
                          style={{
                            flex: 1,
                            color: C.accent,
                            fontSize: 14,
                            textAlign: isRtl ? "right" : "left",
                            writingDirection: isRtl ? "rtl" : "ltr",
                          }}
                        >
                          {g.translation}
                        </Text>
                      </View>
                    ))}
                    {result.bilingualGlossary.length === 0 && (
                      <View style={{ padding: 24, alignItems: "center" }}>
                        <Text style={{ color: C.textMuted, fontSize: 14 }}>
                          No glossary available
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        ) : (
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
              Lesson or worksheet text
            </Text>
            <ThemedTextInput
              style={{
                backgroundColor: C.surface,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: isOverLimit
                  ? (isDark ? "#7f1d1d" : "#fca5a5")
                  : isNearLimit
                    ? (isDark ? "#78350f" : "#fde68a")
                    : C.border,
                padding: 14,
                color: C.textPrimary,
                fontSize: 15,
                minHeight: 160,
                textAlignVertical: "top",
                lineHeight: 23,
              }}
              placeholder="Paste your worksheet or lesson content here…"
              placeholderTextColor={C.textMuted}
              multiline
              value={inputText}
              onChangeText={setInputText}
            />

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 8,
                marginBottom: 6,
              }}
            >
              <Text style={{ fontSize: 12, color: wordColor }}>
                {wordCount} / {MAX_WORDS} words
                {isOverLimit
                  ? `  — remove ${wordCount - MAX_WORDS}`
                  : isNearLimit
                    ? "  — nearly there"
                    : ""}
              </Text>
            </View>
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
                  width: `${Math.min((wordCount / MAX_WORDS) * 100, 100)}%`,
                  backgroundColor: isOverLimit
                    ? C.red
                    : isNearLimit
                      ? C.amber
                      : C.accent,
                }}
              />
            </View>

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
              Student`s home language
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
              <Text
                style={{
                  color: C.textPrimary,
                  fontSize: 15,
                  fontWeight: "500",
                }}
              >
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
                  <Ionicons
                    name="search-outline"
                    size={15}
                    color={C.textMuted}
                  />
                  <ThemedTextInput
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
                          borderBottomWidth:
                            index < filteredLangs.length - 1 ? 1 : 0,
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
                          <Ionicons
                            name="checkmark"
                            size={15}
                            color={C.accent}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <TouchableOpacity
              onPress={() => setShowOptions(!showOptions)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  color: C.textMuted,
                  letterSpacing: 0.8,
                  textTransform: "uppercase",
                }}
              >
                Subject & Year Group
              </Text>
              <Ionicons
                name={showOptions ? "chevron-up" : "chevron-down"}
                size={15}
                color={C.textMuted}
              />
            </TouchableOpacity>

            {showOptions && (
              <View style={{ gap: 20, marginBottom: 8 }}>
                <View>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "600",
                      color: C.textMuted,
                      marginBottom: 10,
                      letterSpacing: 0.8,
                      textTransform: "uppercase",
                    }}
                  >
                    Subject
                  </Text>
                  <View
                    style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}
                  >
                    {SUBJECTS.map((s) => {
                      const sel = selectedSubject === s;
                      return (
                        <TouchableOpacity
                          key={s}
                          onPress={() => setSelectedSubject(s)}
                          style={{
                            paddingHorizontal: 13,
                            paddingVertical: 7,
                            borderRadius: 7,
                            borderWidth: 1,
                            backgroundColor: sel ? C.accentDim : C.surface,
                            borderColor: sel ? C.accent : C.border,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: sel ? "600" : "400",
                              color: sel ? C.accent : C.textSecondary,
                            }}
                          >
                            {s}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
                <View>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "600",
                      color: C.textMuted,
                      marginBottom: 10,
                      letterSpacing: 0.8,
                      textTransform: "uppercase",
                    }}
                  >
                    Year group
                  </Text>
                  <View
                    style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}
                  >
                    {YEAR_GROUPS.map((y) => {
                      const sel = selectedYear === y;
                      return (
                        <TouchableOpacity
                          key={y}
                          onPress={() => setSelectedYear(y)}
                          style={{
                            paddingHorizontal: 13,
                            paddingVertical: 7,
                            borderRadius: 7,
                            borderWidth: 1,
                            backgroundColor: sel ? C.accentDim : C.surface,
                            borderColor: sel ? C.accent : C.border,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: sel ? "600" : "400",
                              color: sel ? C.accent : C.textSecondary,
                            }}
                          >
                            {y}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            )}

            {!!error && (
              <View
                style={{
                  backgroundColor: isDark ? "#1a0a0a" : "#fef2f2",
                  borderWidth: 1,
                  borderColor: isDark ? "#3f1515" : "#fca5a5",
                  borderRadius: 8,
                  padding: 13,
                  marginTop: 16,
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

        {!result && (
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
              onPress={handleAdapt}
              disabled={!canAdapt}
              style={{
                backgroundColor: canAdapt ? C.accent : C.surface,
                borderRadius: 10,
                paddingVertical: 15,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 8,
                borderWidth: canAdapt ? 0 : 1,
                borderColor: C.border,
              }}
            >
              {loading ? (
                <>
                  <ActivityIndicator color={C.accent} size="small" />
                  <Text
                    style={{ color: C.accent, fontWeight: "600", fontSize: 15 }}
                  >
                    Adapting…
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons
                    name="sparkles"
                    size={16}
                    color={canAdapt ? "#000" : C.textMuted}
                  />
                  <Text
                    style={{
                      fontWeight: "600",
                      fontSize: 15,
                      color: canAdapt ? "#000" : C.textMuted,
                      letterSpacing: -0.2,
                    }}
                  >
                    {isOverLimit
                      ? `Remove ${wordCount - MAX_WORDS} words`
                      : `Adapt for EAL — ${selectedLang.name}`}
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
