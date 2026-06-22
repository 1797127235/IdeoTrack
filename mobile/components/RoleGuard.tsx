import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { theme } from '../theme';
import { decodeJwtPayload } from '../utils/jwt';

type UserRole = 'student' | 'counselor' | 'admin';

interface RoleGuardProps {
  allowedRole: UserRole;
  children: React.ReactNode;
}

function isValidRole(role: string | undefined): role is UserRole {
  return role === 'student' || role === 'counselor' || role === 'admin';
}

export function RoleGuard({ allowedRole, children }: RoleGuardProps) {
  const [status, setStatus] = useState<'loading' | 'authorized' | 'unauthorized'>('loading');

  useEffect(() => {
    SecureStore.getItemAsync('auth_token')
      .then(async (token) => {
        if (!token) {
          setStatus('unauthorized');
          return;
        }

        const payload = decodeJwtPayload(token);
        const isExpired = payload?.exp ? payload.exp * 1000 < Date.now() : false;
        const isAuthorized = isValidRole(payload?.role) && payload.role === allowedRole && !isExpired;

        if (!isAuthorized) {
          await SecureStore.deleteItemAsync('auth_token').catch(() => undefined);
          setStatus('unauthorized');
          return;
        }

        setStatus('authorized');
      })
      .catch(async () => {
        await SecureStore.deleteItemAsync('auth_token').catch(() => undefined);
        setStatus('unauthorized');
      });
  }, [allowedRole]);

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (status === 'unauthorized') {
    return <Redirect href="/(auth)/login" />;
  }

  return <>{children}</>;
}
