import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { theme } from '../theme';
import { getDailyQuote } from '../services/quotesApi';
import type { Quote } from '../services/quotesApi';

const FALLBACK_QUOTE: Quote = {
  id: 'fallback',
  content: '路虽远，行则将至；事虽难，做则必成。',
  author: '荀子',
  source: '《荀子·修身》',
};

export function DailyQuote() {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDailyQuote()
      .then(setQuote)
      .catch(() => setQuote(FALLBACK_QUOTE))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }

  const displayQuote = quote || FALLBACK_QUOTE;

  return (
    <View style={styles.container}>
      <Text style={styles.quoteIcon}>"</Text>
      <Text style={styles.content}>{displayQuote.content}</Text>
      {(displayQuote.author || displayQuote.source) && (
        <Text style={styles.meta}>
          {displayQuote.author && `—— ${displayQuote.author}`}
          {displayQuote.source && ` ${displayQuote.source}`}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  quoteIcon: {
    fontSize: 32,
    lineHeight: 32,
    color: theme.colors.primaryLight,
    fontFamily: theme.fonts.bold,
    marginBottom: theme.spacing.xs,
  },
  content: {
    fontSize: 16,
    lineHeight: 26,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular,
    marginBottom: theme.spacing.md,
  },
  meta: {
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.textLight,
    fontFamily: theme.fonts.regular,
    textAlign: 'right',
  },
});
