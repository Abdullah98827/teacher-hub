import { useEffect, useState } from "react";
import { Image, Text, View } from "react-native";

export default function ProfilePicture({
  imageUrl,
  firstName = "",
  lastName = "",
  size = "md",
  customSize,
}) {
  const [imageLoadError, setImageLoadError] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState(imageUrl);

  useEffect(() => {
    if (imageUrl !== currentImageUrl) {
      setImageLoadError(false);
      setCurrentImageUrl(imageUrl);
    }
  }, [imageUrl]);

  const getInitials = () => {
    const firstInitial = firstName?.charAt(0)?.toUpperCase() || "";
    const lastInitial = lastName?.charAt(0)?.toUpperCase() || "";

    if (firstInitial && lastInitial) {
      return firstInitial + lastInitial;
    }

    if (firstInitial) {
      return firstInitial;
    }

    return "?";
  };

  const getSizeInPixels = () => {
    if (customSize) {
      return customSize;
    }

    switch (size) {
      case "sm":
        return 32;
      case "md":
        return 40;
      case "lg":
        return 64;
      case "xl":
        return 96;
      default:
        return 40;
    }
  };

  const getFontSize = () => {
    const pixels = getSizeInPixels();
    return Math.floor(pixels * 0.4);
  };

  const sizeInPixels = getSizeInPixels();
  const fontSize = getFontSize();
  const shouldShowImage = imageUrl && !imageLoadError;

  return (
    <View
      style={{
        width: sizeInPixels,
        height: sizeInPixels,
        borderRadius: sizeInPixels / 2,
        backgroundColor: "#0891b2",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {shouldShowImage ? (
        <Image
          source={{ uri: imageUrl }}
          style={{
            width: sizeInPixels,
            height: sizeInPixels,
          }}
          onError={(error) => {
            setImageLoadError(true);
          }}
          onLoad={() => {
            // Image loaded successfully
          }}
          resizeMode="cover"
        />
      ) : (
        <Text
          style={{
            color: "#ffffff",
            fontWeight: "bold",
            fontSize: fontSize,
          }}
        >
          {getInitials()}
        </Text>
      )}
    </View>
  );
}
