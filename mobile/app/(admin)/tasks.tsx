import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { theme } from '../../theme';
import {
  listTasks,
  createTask,
  updateTask,
  delistTask,
  type Task,
  type TaskScopeType,
} from '../../services/tasksAdminApi';

interface FormData {
  title: string;
  content: string;
  scope_type: TaskScopeType;
  target_college_id: string;
  target_class_id: string;
  published_at: string;
  deadline_at: string;
}

const EMPTY_FORM: FormData = {
  title: '',
  content: '',
  scope_type: 'school',
  target_college_id: '',
  target_class_id: '',
  published_at: new Date().toISOString(),
  deadline_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

const SCOPE_OPTIONS: { value: TaskScopeType; label: string }[] = [
  { value: 'school', label: '全校' },
  { value: 'college', label: '学院' },
  { value: 'class', label: '班级' },
];

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('zh-CN');
  } catch {
    return iso;
  }
}

export default function TaskManagement() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    try {
      setLoading(true);
      const result = await listTasks();
      setTasks(result.items);
    } catch (error) {
      Alert.alert('错误', error instanceof Error ? error.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }

  function startEdit(task: Task) {
    setEditingId(task.id);
    setForm({
      title: task.title,
      content: task.content,
      scope_type: task.scope_type,
      target_college_id: task.target_college_id || '',
      target_class_id: task.target_class_id || '',
      published_at: task.published_at,
      deadline_at: task.deadline_at,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function validateForm(): boolean {
    if (!form.title.trim()) {
      Alert.alert('提示', '任务标题不能为空');
      return false;
    }
    if (!form.content.trim()) {
      Alert.alert('提示', '任务内容不能为空');
      return false;
    }
    if (form.scope_type === 'college' && !form.target_college_id.trim()) {
      Alert.alert('提示', '学院任务需要填写学院 ID');
      return false;
    }
    if (form.scope_type === 'class' && !form.target_class_id.trim()) {
      Alert.alert('提示', '班级任务需要填写班级 ID');
      return false;
    }
    if (new Date(form.deadline_at) <= new Date(form.published_at)) {
      Alert.alert('提示', '截止时间必须晚于发布时间');
      return false;
    }
    return true;
  }

  async function handleSubmit() {
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      const input = {
        title: form.title.trim(),
        content: form.content.trim(),
        scope_type: form.scope_type,
        published_at: form.published_at,
        deadline_at: form.deadline_at,
        ...(form.scope_type === 'college' ? { target_college_id: form.target_college_id.trim() } : {}),
        ...(form.scope_type === 'class' ? { target_class_id: form.target_class_id.trim() } : {}),
      };

      if (editingId) {
        await updateTask(editingId, input);
      } else {
        await createTask(input);
      }

      resetForm();
      await loadTasks();
    } catch (error) {
      Alert.alert('错误', error instanceof Error ? error.message : '保存失败');
    } finally {
      setSubmitting(false);
    }
  }

  function confirmDelist(task: Task) {
    Alert.alert('确认下架', `确定要下架「${task.title}」吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '下架',
        style: 'destructive',
        onPress: async () => {
          try {
            await delistTask(task.id);
            await loadTasks();
          } catch (error) {
            Alert.alert('错误', error instanceof Error ? error.message : '下架失败');
          }
        },
      },
    ]);
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
      <Text style={styles.title}>任务管理</Text>

      <View style={styles.formCard}>
        <Text style={styles.formTitle}>{editingId ? '编辑任务' : '发布任务'}</Text>

        <Text style={styles.label}>任务标题</Text>
        <TextInput
          style={styles.input}
          placeholder="请输入任务标题"
          placeholderTextColor={theme.colors.textLight}
          value={form.title}
          onChangeText={(text) => setForm((f) => ({ ...f, title: text }))}
          maxLength={100}
        />

        <Text style={styles.label}>任务内容</Text>
        <TextInput
          style={styles.textarea}
          multiline
          numberOfLines={4}
          placeholder="请输入任务内容"
          placeholderTextColor={theme.colors.textLight}
          value={form.content}
          onChangeText={(text) => setForm((f) => ({ ...f, content: text }))}
        />

        <Text style={styles.label}>发布范围</Text>
        <View style={styles.scopeRow}>
          {SCOPE_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.scopeButton, form.scope_type === option.value && styles.scopeButtonActive]}
              onPress={() => setForm((f) => ({ ...f, scope_type: option.value }))}
            >
              <Text
                style={[
                  styles.scopeButtonText,
                  form.scope_type === option.value && styles.scopeButtonTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {form.scope_type === 'college' && (
          <>
            <Text style={styles.label}>学院 ID</Text>
            <TextInput
              style={styles.input}
              placeholder="请输入学院 UUID"
              placeholderTextColor={theme.colors.textLight}
              value={form.target_college_id}
              onChangeText={(text) => setForm((f) => ({ ...f, target_college_id: text }))}
            />
          </>
        )}

        {form.scope_type === 'class' && (
          <>
            <Text style={styles.label}>班级 ID</Text>
            <TextInput
              style={styles.input}
              placeholder="请输入班级 UUID"
              placeholderTextColor={theme.colors.textLight}
              value={form.target_class_id}
              onChangeText={(text) => setForm((f) => ({ ...f, target_class_id: text }))}
            />
          </>
        )}

        <Text style={styles.label}>发布时间（ISO 8601）</Text>
        <TextInput
          style={styles.input}
          placeholder="2024-01-01T00:00:00.000Z"
          placeholderTextColor={theme.colors.textLight}
          value={form.published_at}
          onChangeText={(text) => setForm((f) => ({ ...f, published_at: text }))}
        />

        <Text style={styles.label}>截止时间（ISO 8601）</Text>
        <TextInput
          style={styles.input}
          placeholder="2024-01-02T00:00:00.000Z"
          placeholderTextColor={theme.colors.textLight}
          value={form.deadline_at}
          onChangeText={(text) => setForm((f) => ({ ...f, deadline_at: text }))}
        />

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

      <Text style={styles.sectionTitle}>任务列表</Text>

      {tasks.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>还没有发布任务，添加一个吧～</Text>
        </View>
      ) : (
        tasks.map((task) => (
          <View key={task.id} style={styles.taskCard}>
            <View style={styles.taskHeader}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{task.scope_label}</Text>
              </View>
              <Text
                style={[
                  styles.statusText,
                  task.status === 'published' ? styles.published : styles.delisted,
                ]}
              >
                {task.status === 'published' ? '已发布' : '已下架'}
              </Text>
            </View>
            <Text style={styles.taskTitle}>{task.title}</Text>
            <Text style={styles.taskMeta}>截止：{formatDateTime(task.deadline_at)}</Text>
            <Text style={styles.taskMeta}>
              完成率：{task.completion_rate}%（{task.completed_count}/{task.total_assignees}）
            </Text>
            <View style={styles.taskActions}>
              {task.status === 'published' && new Date(task.deadline_at) > new Date() && (
                <TouchableOpacity style={styles.actionButton} onPress={() => startEdit(task)}>
                  <Text style={styles.actionButtonText}>编辑</Text>
                </TouchableOpacity>
              )}
              {task.status === 'published' && (
                <TouchableOpacity style={styles.actionButton} onPress={() => confirmDelist(task)}>
                  <Text style={[styles.actionButtonText, styles.deleteText]}>下架</Text>
                </TouchableOpacity>
              )}
            </View>
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
    fontFamily: theme.fonts.bold,
    color: theme.colors.text,
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
    fontFamily: theme.fonts.bold,
    color: theme.colors.text,
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
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: theme.spacing.md,
  },
  scopeRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  scopeButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  scopeButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  scopeButtonText: {
    fontSize: 14,
    color: theme.colors.text,
    fontFamily: theme.fonts.medium,
  },
  scopeButtonTextActive: {
    color: '#FFFFFF',
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
    fontFamily: theme.fonts.bold,
    color: theme.colors.text,
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
  taskCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  badge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
    backgroundColor: `${theme.colors.primaryLight}20`,
  },
  badgeText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontFamily: theme.fonts.medium,
  },
  statusText: {
    fontSize: 12,
    fontFamily: theme.fonts.medium,
  },
  published: {
    color: theme.colors.cta,
  },
  delisted: {
    color: theme.colors.textLight,
  },
  taskTitle: {
    fontSize: 15,
    lineHeight: 24,
    color: theme.colors.text,
    fontFamily: theme.fonts.medium,
    marginBottom: theme.spacing.xs,
  },
  taskMeta: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textLight,
    fontFamily: theme.fonts.regular,
    marginBottom: theme.spacing.xs,
  },
  taskActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
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
});
