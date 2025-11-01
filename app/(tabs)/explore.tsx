import { ScrollView, Text, View } from 'react-native';
import LogoHeader from '../../components/logoHeader';

export default function ExploreScreen() {
  return (
    <ScrollView className="flex-1 bg-neutral-950 px-5">
      {/* LogoHeader at top left */}
      <LogoHeader position="left" />

      <View className="py-4">
        <Text className="text-3xl font-bold text-cyan-400 mb-6 text-center">
          Explore Teacher Resources
        </Text>

        <View className="bg-white p-5 rounded-xl mb-4 shadow-lg">
          <Text className="text-lg font-semibold mb-2 text-gray-800">Lesson Plans</Text>
          <Text className="text-base text-gray-600">
            Interactive lesson ideas for maths and science.
          </Text>
        </View>

        <View className="bg-white p-5 rounded-xl shadow-lg">
          <Text className="text-lg font-semibold mb-2 text-gray-800">Student Tools</Text>
          <Text className="text-base text-gray-600">
            Quizzes and trackers for classroom use.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
