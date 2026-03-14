import { Text, TouchableOpacity } from "react-native";

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
      <Text className={className}>{displayName}</Text>
    </TouchableOpacity>
  );
}
