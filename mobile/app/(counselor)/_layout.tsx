import { Tabs } from 'expo-router';

export default function CounselorLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: '看板' }} />
    </Tabs>
  );
}
