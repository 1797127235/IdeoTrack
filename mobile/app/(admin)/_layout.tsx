import { Tabs } from 'expo-router';

export default function AdminLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: '概览' }} />
    </Tabs>
  );
}
