import { Tabs } from 'expo-router';
import { RoleGuard } from '../../components/RoleGuard';

export default function CounselorLayout() {
  return (
    <RoleGuard allowedRole="counselor">
      <Tabs>
        <Tabs.Screen name="index" options={{ title: '看板' }} />
      </Tabs>
    </RoleGuard>
  );
}
