import { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Animated,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { changePassword } from '../../services/api';
import { theme } from '../../theme';

const MIN_PASSWORD_LENGTH = 6;
const PASSWORD_MAX_LENGTH = 64;

type UserRole = 'student' | 'counselor' | 'admin';

function isValidRole(role: string | undefined): role is UserRole {
  return role === 'student' || role === 'counselor' || role === 'admin';
}

export default function ChangePasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const scaleAnim = useRef(new Animated.Value(1)).current;

  function handlePressIn() {
    Animated.timing(scaleAnim, {
      toValue: 0.98,
      duration: 100,
      useNativeDriver: true,
    }).start();
  }

  function handlePressOut() {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
  }

  const params = useLocalSearchParams<{ role?: string }>();

  async function handleSubmit() {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setError('请填写所有密码字段');
      return;
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`新密码长度不能少于 ${MIN_PASSWORD_LENGTH} 位`);
      return;
    }

    if (newPassword === currentPassword) {
      setError('新密码不能与当前密码相同');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('两次输入的新密码不一致');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await changePassword(currentPassword.trim(), newPassword.trim());

      const role = isValidRole(params.role) ? params.role : null;
      if (role === 'student') {
        router.replace('/(student)');
      } else if (role === 'counselor') {
        router.replace('/(counselor)');
      } else if (role === 'admin') {
        router.replace('/(admin)');
      } else {
        router.replace('/(auth)/login');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '修改密码失败，请重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.header}>
          <Text style={styles.title}>首次登录</Text>
          <Text style={styles.subtitle}>为了账号安全，请先修改初始密码</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>当前密码</Text>
          <TextInput
            style={styles.input}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="请输入当前（初始）密码"
            placeholderTextColor={theme.colors.textLight}
            secureTextEntry
            maxLength={PASSWORD_MAX_LENGTH}
            accessibilityLabel="当前密码输入框"
          />

          <Text style={styles.label}>新密码</Text>
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="请输入新密码（至少 6 位）"
            placeholderTextColor={theme.colors.textLight}
            secureTextEntry
            maxLength={PASSWORD_MAX_LENGTH}
            accessibilityLabel="新密码输入框"
          />

          <Text style={styles.label}>确认新密码</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="请再次输入新密码"
            placeholderTextColor={theme.colors.textLight}
            secureTextEntry
            maxLength={PASSWORD_MAX_LENGTH}
            accessibilityLabel="确认新密码输入框"
          />

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorIcon} aria-hidden>
                ⚠️
              </Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Pressable
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>确认修改</Text>
              )}
            </Pressable>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textLight,
  },
  form: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  label: {
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    minHeight: 48,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  errorIcon: {
    fontSize: 16,
    marginRight: theme.spacing.sm,
  },
  errorText: {
    flex: 1,
    color: theme.colors.error,
    fontSize: 14,
  },
  button: {
    backgroundColor: theme.colors.cta,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
