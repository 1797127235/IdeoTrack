import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { theme } from '../../theme';
import {
  listQuotes,
  createQuote,
  updateQuote,
  deleteQuote,
} from '../../services/quotesAdminApi';
import type { Quote, CreateQuoteInput } from '../../services/quotesAdminApi';

interface FormData {
  content: string;
  author: string;
  source: string;
  is_enabled: boolean;
}

const EMPTY_FORM: FormData = {
  content: '',
  author: '',
  source: '',
  is_enabled: true,
};

export default function QuotesManagement() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadQuotes();
  }, []);

  async function loadQuotes() {
    try {
      setLoading(true);
      const data = await listQuotes();
      setQuotes(data);
    } catch (error) {
      Alert.alert('错误', error instanceof Error ? error.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }

  function startEdit(quote: Quote) {
    setEditingId(quote.id);
    setForm({
      content: quote.content,
      author: quote.author || '',
      source: quote.source || '',
      is_enabled: quote.is_enabled,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit() {
    if (!form.content.trim()) {
      Alert.alert('提示', '名言内容不能为空');
      return;
    }

    if (form.content.length > 200) {
      Alert.alert('提示', '名言内容不能超过 200 字');
      return;
    }

    try {
      setSubmitting(true);
      const input: CreateQuoteInput = {
        content: form.content.trim(),
        author: form.author.trim() || null,
        source: form.source.trim() || null,
        is_enabled: form.is_enabled,
      };

      if (editingId) {
        await updateQuote(editingId, input);
      } else {
        await createQuote(input);
      }

      resetForm();
      await loadQuotes();
    } catch (error) {
      Alert.alert('错误', error instanceof Error ? error.message : '保存失败');
    } finally {
      setSubmitting(false);
    }
  }

  function confirmDelete(quote: Quote) {
    Alert.alert('确认删除', `确定要删除这条名言吗？\n\n${quote.content.slice(0, 40)}...`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteQuote(quote.id);
            await loadQuotes();
          } catch (error) {
            Alert.alert('错误', error instanceof Error ? error.message : '删除失败');
          }
        },
      },
    ]);
  }

  function toggleEnabled(quote: Quote) {
    updateQuote(quote.id, { is_enabled: !quote.is_enabled })
      .then(() => loadQuotes())
      .catch((error) => Alert.alert('错误', error instanceof Error ? error.message : '更新失败'));
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>名言库管理</Text>

      <View style={styles.formCard}>
        <Text style={styles.formTitle}>{editingId ? '编辑名言' : '添加名言'}</Text>

        <Text style={styles.label}>名言内容</Text>
        <TextInput
          style={styles.textarea}
          multiline
          numberOfLines={3}
          placeholder="请输入名言内容"
          placeholderTextColor={theme.colors.textLight}
          value={form.content}
          onChangeText={(text) => setForm((f) => ({ ...f, content: text }))}
          maxLength={200}
        />
        <Text style={styles.counter}>{form.content.length}/200</Text>

        <Text style={styles.label}>作者</Text>
        <TextInput
          style={styles.input}
          placeholder="可选"
          placeholderTextColor={theme.colors.textLight}
          value={form.author}
          onChangeText={(text) => setForm((f) => ({ ...f, author: text }))}
        />

        <Text style={styles.label}>出处</Text>
        <TextInput
          style={styles.input}
          placeholder="可选"
          placeholderTextColor={theme.colors.textLight}
          value={form.source}
          onChangeText={(text) => setForm((f) => ({ ...f, source: text }))}
        />

        <View style={styles.switchRow}>
          <Text style={styles.label}>启用</Text>
          <Switch
            value={form.is_enabled}
            onValueChange={(value) => setForm((f) => ({ ...f, is_enabled: value }))}
            trackColor={{ false: '#E2E8F0', true: theme.colors.primaryLight }}
            thumbColor={form.is_enabled ? theme.colors.primary : '#94A3B8'}
          />
        </View>

        <View style={styles.formActions}>
          {editingId && (
            <TouchableOpacity style={styles.cancelButton} onPress={resetForm}>
              <Text style={styles.cancelButtonText}>取消</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.submitButtonText}>{submitting ? '保存中...' : '保存'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.sectionTitle}>名言列表</Text>

      {quotes.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>还没有名言，添加一条吧～</Text>
        </View>
      ) : (
        quotes.map((quote) => (
          <View key={quote.id} style={styles.quoteCard}>
            <View style={styles.quoteHeader}>
              <Switch
                value={quote.is_enabled}
                onValueChange={() => toggleEnabled(quote)}
                trackColor={{ false: '#E2E8F0', true: theme.colors.primaryLight }}
                thumbColor={quote.is_enabled ? theme.colors.primary : '#94A3B8'}
              />
              <View style={styles.quoteActions}>
                <TouchableOpacity style={styles.actionButton} onPress={() => startEdit(quote)}>
                  <Text style={styles.actionButtonText}>编辑</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={() => confirmDelete(quote)}>
                  <Text style={[styles.actionButtonText, styles.deleteText]}>删除</Text>
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.quoteContent}>{quote.content}</Text>
            {(quote.author || quote.source) && (
              <Text style={styles.quoteMeta}>
                {quote.author && `—— ${quote.author}`}
                {quote.source && ` ${quote.source}`}
              </Text>
            )}
          </View>
        ))
      )}
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  title: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700',
    color: theme.colors.text,
    fontFamily: theme.fonts.bold,
    marginBottom: theme.spacing.md,
  },
  formCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    fontFamily: theme.fonts.bold,
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: 14,
    color: theme.colors.text,
    fontFamily: theme.fonts.medium,
    marginBottom: theme.spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 14,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular,
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.md,
  },
  textarea: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular,
    backgroundColor: theme.colors.surface,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  counter: {
    fontSize: 12,
    color: theme.colors.textLight,
    textAlign: 'right',
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
  },
  cancelButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
  },
  cancelButtonText: {
    fontSize: 14,
    color: theme.colors.text,
    fontFamily: theme.fonts.medium,
  },
  submitButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: theme.fonts.medium,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    fontFamily: theme.fonts.bold,
    marginBottom: theme.spacing.sm,
  },
  emptyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textLight,
    fontFamily: theme.fonts.regular,
  },
  quoteCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  quoteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  quoteActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  actionButton: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  actionButtonText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontFamily: theme.fonts.medium,
  },
  deleteText: {
    color: theme.colors.error,
  },
  quoteContent: {
    fontSize: 15,
    lineHeight: 24,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular,
    marginBottom: theme.spacing.sm,
  },
  quoteMeta: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textLight,
    fontFamily: theme.fonts.regular,
  },
});
