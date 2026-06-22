import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { theme } from '../theme';
import { decodeJwtPayload } from '../utils/jwt';

type UserRole = 'student' | 'counselor' | 'admin';

function isValidRole(role: string | undefined): role is UserRole {
  return role === 'student' || role === 'counselor' || role === 'admin';
}

export default function Index() {
  const [role, setRole] = useState<UserRole | null | 'loading'>('loading');

  useEffect(() => {
    SecureStore.getItemAsync('auth_token')
      .then((token) => {
        if (!token) {
          setRole(null);
          return;
        }

        const payload = decodeJwtPayload(token);
        if (payload?.exp && payload.exp * 1000 < Date.now()) {
          // Token expired
          SecureStore.deleteItemAsync('auth_token').catch(() => undefined);
          setRole(null);
          return;
        }

        if (isValidRole(payload?.role)) {
          setRole(payload.role);
        } else {
          setRole(null);
        }
      })
      .catch(() => {
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
