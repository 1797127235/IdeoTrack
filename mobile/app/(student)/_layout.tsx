import { Tabs } from 'expo-router';

export default function StudentLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: '首页' }} />
    </Tabs>
  );
}
