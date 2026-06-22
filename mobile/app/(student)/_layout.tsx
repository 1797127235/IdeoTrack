import { Tabs } from 'expo-router';
import { RoleGuard } from '../../components/RoleGuard';

export default function StudentLayout() {
  return (
    <RoleGuard allowedRole="student">
      <Tabs>
        <Tabs.Screen name="index" options={{ title: '首页' }} />
      </Tabs>
    </RoleGuard>
  );
}
