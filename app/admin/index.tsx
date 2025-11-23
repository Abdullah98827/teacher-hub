import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import Toast from "react-native-toast-message";

export default function AdminHub() {
  const router = useRouter();

  // Admin navigation links
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
  ] as const;

  return (
    <View className="flex-1 bg-black px-6 pt-16">
      <Text className="text-white text-2xl font-bold mb-6">Admin Hub</Text>

      {links.map(({ label, route }) => (
        <TouchableOpacity
          key={route}
          className="bg-neutral-800 p-4 rounded-xl mb-3"
          onPress={() => router.push(route)}
        >
          <Text className="text-white text-lg font-medium">{label}</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        className="bg-neutral-700 p-4 rounded-xl mt-6 active:scale-95"
        onPress={() => router.replace("/(tabs)")}
      >
        <Text className="text-white text-center font-medium">Back to App</Text>
      </TouchableOpacity>

      <Toast />
    </View>
  );
}
