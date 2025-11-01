import { Tabs } from 'expo-router/tabs';
import "../../global.css";
import { useUserRole } from '../hooks/useUserRole';

export default function TabLayout() {
  const { role, loading } = useUserRole();

  if (loading) {
    return null;
  }

  const isAdmin = role === 'admin';

  return (
    <Tabs screenOptions={{ 
      headerShown: true,
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarLabel: 'Home'
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarLabel: 'Explore'
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Dashboard'
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin Hub',
          tabBarLabel: 'Admin',
          href: isAdmin ? '/(tabs)/admin' : null,  
        }}
      />
    </Tabs>
  );
}