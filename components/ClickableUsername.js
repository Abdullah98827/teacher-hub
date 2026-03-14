import { TouchableOpacity } from "react-native";
import { ThemedText } from './themed-text';

export default function ClickableUsername({
  userId,
  firstName,
  lastName,
  onPress,
  className = "text-cyan-400 font-semibold",
  showFullName = true,
}) {
  const displayName =
    showFullName && lastName ? `${firstName} ${lastName}` : firstName;

  return (
    <TouchableOpacity onPress={() => onPress(userId)} activeOpacity={0.7}>
      <ThemedText className={className}>{displayName}</ThemedText>
    </TouchableOpacity>
  );
}
