/**
 * Comment Report Reasons
 * Structured reasons for reporting comments - same pattern as user reports
 */

export const COMMENT_REPORT_REASONS = [
  { 
    label: "Inappropriate language or offensive content",
    icon: "alert-circle-outline",
    value: "inappropriate_language"
  },
  { 
    label: "Harassment or bullying",
    icon: "hand-left-outline",
    value: "harassment"
  },
  { 
    label: "Spam or promotional content",
    icon: "megaphone-outline",
    value: "spam"
  },
  { 
    label: "Misinformation or false information",
    icon: "warning-outline",
    value: "misinformation"
  },
  { 
    label: "Hate speech or discrimination",
    icon: "alert-outline",
    value: "hate_speech"
  },
  { 
    label: "Sexual or adult content",
    icon: "eye-off-outline",
    value: "adult_content"
  },
  { 
    label: "Copyright or intellectual property violation",
    icon: "document-outline",
    value: "copyright"
  },
  { 
    label: "Threatening or violent content",
    icon: "shield-outline",
    value: "threatening"
  },
  { 
    label: "Personal information sharing",
    icon: "lock-open-outline",
    value: "personal_info"
  },
  { 
    label: "Other",
    icon: "create-outline",
    value: "other"
  },
];

export const GROUP_MESSAGE_REPORT_REASONS = [
  { 
    label: "Inappropriate language or offensive content",
    icon: "alert-circle-outline",
    value: "inappropriate_language"
  },
  { 
    label: "Harassment or bullying",
    icon: "hand-left-outline",
    value: "harassment"
  },
  { 
    label: "Spam or promotional content",
    icon: "megaphone-outline",
    value: "spam"
  },
  { 
    label: "Threatening or violent content",
    icon: "shield-outline",
    value: "threatening"
  },
  { 
    label: "Sexual or adult content",
    icon: "eye-off-outline",
    value: "adult_content"
  },
  { 
    label: "Off-topic or disruption",
    icon: "information-outline",
    value: "off_topic"
  },
  { 
    label: "Other",
    icon: "create-outline",
    value: "other"
  },
];

/**
 * Get icon for a report reason
 */
export const getReportReasonIcon = (reasonValue, reasons = COMMENT_REPORT_REASONS) => {
  const reason = reasons.find(r => r.value === reasonValue);
  return reason?.icon || "create-outline";
};

/**
 * Get label for a report reason
 */
export const getReportReasonLabel = (reasonValue, reasons = COMMENT_REPORT_REASONS) => {
  const reason = reasons.find(r => r.value === reasonValue);
  return reason?.label || reasonValue;
};

/**
 * Get color based on report reason severity
 */
export const getReportReasonColor = (reasonValue) => {
  const severityMap = {
    inappropriate_language: "#F59E0B", // Amber
    harassment: "#EF4444", // Red
    spam: "#F97316", // Orange
    misinformation: "#F59E0B", // Amber
    hate_speech: "#DC2626", // Dark Red
    adult_content: "#6366F1", // Indigo
    copyright: "#3B82F6", // Blue
    threatening: "#DC2626", // Dark Red
    personal_info: "#EC4899", // Pink
    off_topic: "#8B5CF6", // Purple
    other: "#6B7280", // Gray
  };
  
  return severityMap[reasonValue] || "#6B7280";
};
