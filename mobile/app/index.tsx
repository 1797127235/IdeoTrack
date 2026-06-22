import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { theme } from '../theme';

type UserRole = 'student' | 'counselor' | 'admin';

export default function Index() {
  const [role, setRole] = useState<UserRole | null | 'loading'>('loading');

  useEffect(() => {
    // In a real app, decode the JWT to get the role.
    // For Story 1.1, we redirect to login until a valid token + role is available.
    SecureStore.getItemAsync('auth_token').then((token) => {
      if (!token) {
        setRole(null);
        return;
      }
      // TODO: decode JWT and set role
      setRole(null);
    });
  }, []);

  if (role === 'loading') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!role) {
    return <Redirect href="/(auth)/login" />;
  }

  if (role === 'student') return <Redirect href="/(student)" />;
  if (role === 'counselor') return <Redirect href="/(counselor)" />;
  if (role === 'admin') return <Redirect href="/(admin)" />;

  return <Redirect href="/(auth)/login" />;
}
