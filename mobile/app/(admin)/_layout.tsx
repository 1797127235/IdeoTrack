import { Tabs } from 'expo-router';
import { RoleGuard } from '../../components/RoleGuard';

export default function AdminLayout() {
  return (
    <RoleGuard allowedRole="admin">
      <Tabs>
        <Tabs.Screen name="index" options={{ title: '概览' }} />
      </Tabs>
    </RoleGuard>
  );
}
