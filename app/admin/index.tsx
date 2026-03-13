import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import Toast from "react-native-toast-message";
import { useAppTheme } from "../../hooks/useAppTheme";

export default function AdminHub() {
  const router = useRouter();
  const { bg, bgCard, bgCardAlt, border, textPrimary } = useAppTheme();

  // Admins navigation links
  const links = [
    { label: "Verify Teachers", route: "/admin/verify" },
    { label: "Manage Memberships", route: "/admin/manage-memberships" },
    {
      label: "Manage Contact Requests",
      route: "/admin/manage-contact-requests",
    },
    { label: "Manage Resources", route: "/admin/manage-resources" },
    { label: "Manage Reports", route: "/admin/manage-reports" },
    { label: "Manage Comments", route: "/admin/manage-comments" },
    { label: "Manage Subjects", route: "/admin/manage-subjects" },
  ] as const;

  return (
    <View className={`flex-1 ${bg} px-6 pt-16`}>
      <Text className={`${textPrimary} text-2xl font-bold mb-6`}>
        Admin Hub
      </Text>

      {links.map(({ label, route }) => (
        <TouchableOpacity
          key={route}
          className={`${bgCard} border ${border} p-4 rounded-xl mb-3`}
          onPress={() => router.push(route)}
        >
          <Text className={`${textPrimary} text-lg font-medium`}>{label}</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        className={`${bgCardAlt} p-4 rounded-xl mt-6 active:scale-95`}
        onPress={() => router.replace("/(tabs)")}
      >
        <Text className={`${textPrimary} text-center font-medium`}>
          Back to App
        </Text>
      </TouchableOpacity>

      <Toast />
    </View>
  );
}
