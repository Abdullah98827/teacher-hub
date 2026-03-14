import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { useAppTheme } from "../hooks/useAppTheme";
import { supabase } from "../supabase";

export default function CheckoutScreen() {
  const router = useRouter();
  const {
    bgCard,
    bgInput,
    border,
    textPrimary,
    textSecondary,
    placeholderColor,
  } = useAppTheme();
  const [loading, setLoading] = useState(false);
  const [tier, setTier] = useState<string | null>(null);
  const [subjectNames, setSubjectNames] = useState<string[]>([]);

  // Cardholders details
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // Card information
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");

  // Billing address
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");

  // Loads membership details when page opens
  useEffect(() => {
    const fetchMembership = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: membership } = await supabase
        .from("memberships")
        .select("tier, subject_ids")
        .eq("id", user.id)
        .single();

      if (!membership) return;

      setTier(membership.tier);

      // Get the names of selected subjects
      const { data: subjects } = await supabase
        .from("subjects")
        .select("id, name")
        .in("id", membership.subject_ids);

      if (subjects) {
        setSubjectNames(subjects.map((s) => s.name));
      }
    };

    fetchMembership();
  }, []);

  const showToast = (type: "success" | "error", title: string, msg: string) =>
    Toast.show({ type, text1: title, text2: msg });

  const handleSimulatedPayment = async () => {
    // Makes sure all payment fields are filled
    if (
      !firstName ||
      !lastName ||
      !cardNumber ||
      !expiry ||
      !cvv ||
      !address ||
      !city ||
      !postcode
    ) {
      return showToast(
        "error",
        "Missing Info",
        "Please fill in all required fields"
      );
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Activates the membership after "payment" (this is simulated so therefore no real payment processing)
    await supabase
      .from("memberships")
      .update({ active: true })
      .eq("id", user.id);

    setLoading(false);
    showToast("success", "Payment Successful", "Membership activated!");

    // Redirects to main app after successful payment
    setTimeout(() => {
      router.replace("/(tabs)");
    }, 2500);
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-black px-6 pt-16"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text className={`${textPrimary} text-2xl font-bold mb-4`}>
          Confirm Your Membership
        </Text>
        <Text className={`${textSecondary} text-sm mb-4`}>
          🔒 Secure Stripe-style Checkout
        </Text>

        <View className={`${bgCard} p-4 rounded-xl mb-6 ${border} border`}>
          <Text className="text-cyan-400 text-lg font-semibold mb-2">
            Tier:{" "}
            {tier === "single"
              ? "Single Subject (£9.99)"
              : "Multi Subject (£16.99)"}
          </Text>
          <Text className={`${textPrimary} font-semibold mb-1`}>Subjects:</Text>
          {subjectNames.map((name) => (
            <Text key={name} className={`${textSecondary} ml-2 mb-1`}>
              • {name}
            </Text>
          ))}
          <Text className={`${textPrimary} mt-4 font-semibold`}>
            Total: {tier === "single" ? "£9.99" : "£16.99"}
          </Text>
        </View>

        <Text className={`${textPrimary} text-lg font-semibold mb-2`}>
          Cardholder Name
        </Text>
        <TextInput
          placeholder="First Name"
          placeholderTextColor={placeholderColor}
          value={firstName}
          onChangeText={setFirstName}
          className={`${bgInput} ${textPrimary} p-3 rounded-xl mb-3`}
        />
        <TextInput
          placeholder="Last Name"
          placeholderTextColor={placeholderColor}
          value={lastName}
          onChangeText={setLastName}
          className={`${bgInput} ${textPrimary} p-3 rounded-xl mb-3`}
        />

        <Text className={`${textPrimary} text-lg font-semibold mb-2`}>
          Card Details
        </Text>
        <TextInput
          placeholder="Card Number"
          placeholderTextColor={placeholderColor}
          value={cardNumber}
          keyboardType="numeric"
          onChangeText={(text) => {
            const cleaned = text.replace(/\D/g, "").slice(0, 16);
            setCardNumber(cleaned);
          }}
          className={`${bgInput} ${textPrimary} p-3 rounded-xl mb-3`}
        />
        <View className="flex-row gap-4">
          <TextInput
            placeholder="MM/YY"
            placeholderTextColor={placeholderColor}
            value={expiry}
            onChangeText={setExpiry}
            keyboardType="numeric"
            className={`flex-1 ${bgInput} ${textPrimary} p-3 rounded-xl mb-3`}
          />
          <TextInput
            placeholder="CVV"
            placeholderTextColor={placeholderColor}
            value={cvv}
            onChangeText={setCvv}
            keyboardType="numeric"
            secureTextEntry
            className={`flex-1 ${bgInput} ${textPrimary} p-3 rounded-xl mb-3`}
          />
        </View>

        <Text className={`${textPrimary} text-lg font-semibold mb-2`}>
          Billing Address
        </Text>
        <TextInput
          placeholder="Address"
          placeholderTextColor={placeholderColor}
          value={address}
          onChangeText={setAddress}
          className={`${bgInput} ${textPrimary} p-3 rounded-xl mb-3`}
        />
        <TextInput
          placeholder="City"
          placeholderTextColor={placeholderColor}
          value={city}
          onChangeText={setCity}
          className={`${bgInput} ${textPrimary} p-3 rounded-xl mb-3`}
        />
        <TextInput
          placeholder="Postcode"
          placeholderTextColor={placeholderColor}
          value={postcode}
          onChangeText={setPostcode}
          className={`${bgInput} ${textPrimary} p-3 rounded-xl mb-3`}
        />

        <TouchableOpacity
          className={`mt-4 p-4 rounded-xl ${loading ? "bg-gray-400" : "bg-cyan-600"}`}
          onPress={handleSimulatedPayment}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text className="text-white text-center font-bold">
              Simulate Payment
            </Text>
          )}
        </TouchableOpacity>

        <View className="flex-row justify-between mt-6">
          <TouchableOpacity
            className={`flex-1 ${bgInput} p-3 rounded-xl mr-2 active:scale-95`}
            onPress={() => router.push("/contact")}
          >
            <Text className="text-center text-cyan-400 font-medium">
              Contact Admin
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-1 ${bgCard} p-3 rounded-xl ml-2 active:scale-95`}
            onPress={() => router.back()}
          >
            <Text className={`text-center ${textPrimary} font-medium`}>
              Back
            </Text>
          </TouchableOpacity>
        </View>

        <Text className={`text-center ${textSecondary} text-xs mt-6`}>
          Powered by Teacher Hub
        </Text>
      </ScrollView>
      <Toast />
    </KeyboardAvoidingView>
  );
}
