import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { theme } from '../../theme';
import { DailyQuote } from '../../components/DailyQuote';

export default function StudentHome() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>早上好，同学</Text>
      <Text style={styles.subtitle}>每日学习，积累成长</Text>
      <DailyQuote />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingBottom: theme.spacing.xl,
  },
  greeting: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: theme.fonts.bold,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.xl,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.textLight,
    fontFamily: theme.fonts.regular,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
});
