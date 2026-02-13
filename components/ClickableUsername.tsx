import { Text, TouchableOpacity } from "react-native";

/**
 * CLICKABLE USERNAME - PHASE 3
 *
 * Makes usernames clickable to open profile modals
 * Use this anywhere you display a teacher's name
 *
 * Example:
 * <ClickableUsername
 *   userId="uuid-here"
 *   firstName="John"
 *   lastName="Smith"
 *   onPress={handleOpenProfile}
 * />
 */

interface ClickableUsernameProps {
  userId: string;
  firstName: string;
  lastName?: string;
  onPress: (userId: string) => void;
  className?: string;
  showFullName?: boolean;
}

export default function ClickableUsername({
  userId,
  firstName,
  lastName,
  onPress,
  className = "text-cyan-400 font-semibold",
  showFullName = true,
}: ClickableUsernameProps) {
  const displayName =
    showFullName && lastName ? `${firstName} ${lastName}` : firstName;

  return (
    <TouchableOpacity onPress={() => onPress(userId)} activeOpacity={0.7}>
      <Text className={className}>{displayName}</Text>
    </TouchableOpacity>
  );
}
