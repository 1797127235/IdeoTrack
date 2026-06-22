import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../../theme';

export default function AdminHome() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>管理员控制台</Text>
      <Text style={styles.subtitle}>管理组织、用户、任务与内容</Text>

      <View style={styles.grid}>
        <TouchableOpacity style={styles.card} onPress={() => router.push('./quotes')}>
          <Text style={styles.cardIcon}>"</Text>
          <Text style={styles.cardTitle}>名言库</Text>
          <Text style={styles.cardDesc}>管理每日展示的名言内容</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  greeting: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: theme.fonts.bold,
    marginTop: theme.spacing.xl,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.textLight,
    fontFamily: theme.fonts.regular,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    width: '47%',
    minHeight: 120,
  },
  cardIcon: {
    fontSize: 28,
    color: theme.colors.primary,
    fontFamily: theme.fonts.bold,
    marginBottom: theme.spacing.sm,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    fontFamily: theme.fonts.bold,
    marginBottom: theme.spacing.xs,
  },
  cardDesc: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textLight,
    fontFamily: theme.fonts.regular,
  },
});
