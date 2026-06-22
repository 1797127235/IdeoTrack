import { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { theme } from '../theme';
import { getMyTaskDetail, type StudentTask, type TaskDetail } from '../services/tasksApi';

interface Props {
  task: StudentTask | null;
  onClose: () => void;
}

function statusLabel(status: string): string {
  switch (status) {
    case 'in_progress':
      return '进行中';
    case 'overdue':
      return '已逾期';
    case 'completed':
      return '已完成';
    case 'reviewing':
      return '审核中';
    default:
      return '进行中';
  }
}

function statusColor(status: string) {
  switch (status) {
    case 'in_progress':
      return theme.colors.primary;
    case 'overdue':
      return theme.colors.error;
    case 'completed':
      return theme.colors.cta;
    case 'reviewing':
      return '#F59E0B';
    default:
      return theme.colors.textLight;
  }
}

export function TaskDetailModal({ task, onClose }: Props) {
  const [detail, setDetail] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!task) {
      setDetail(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    // P6: 失败时显式展示错误，不再静默回退到列表卡片数据
    getMyTaskDetail(task.id)
      .then((data) => setDetail(data))
      .catch(() => setError('加载任务详情失败，请稍后重试'))
      .finally(() => setLoading(false));
  }, [task]);

  if (!task) return null;

  const canCheckIn = task.status === 'in_progress';

  return (
    <Modal visible={!!task} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {loading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.header}>
                <Text style={styles.title}>{detail?.title || task.title}</Text>
                <View style={[styles.badge, { backgroundColor: `${statusColor(task.status)}20` }]}>
                  <Text style={[styles.badgeText, { color: statusColor(task.status) }]}>
                    {statusLabel(task.status)}
                  </Text>
                </View>
              </View>

              <Text style={styles.label}>截止时间</Text>
              <Text style={styles.meta}>
                {new Date(detail?.deadline_at || task.deadline_at).toLocaleString('zh-CN')}
              </Text>

              <Text style={styles.label}>任务内容</Text>
              <Text style={styles.content}>{detail?.content || task.content}</Text>

              {task.status === 'completed' && task.completed_at && (
                <>
                  <Text style={styles.label}>完成时间</Text>
                  <Text style={styles.meta}>{new Date(task.completed_at).toLocaleString('zh-CN')}</Text>
                </>
              )}

              {task.status === 'overdue' && (
                <Text style={styles.hint}>该任务已截止，无法打卡。</Text>
              )}
            </ScrollView>
          )}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.closeButtonText}>关闭</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.checkInButton, !canCheckIn && styles.checkInButtonDisabled]}
              disabled={!canCheckIn}
              activeOpacity={0.8}
              onPress={() => {
                // Epic 4 实现打卡逻辑
              }}
            >
              <Text style={styles.checkInButtonText}>
                {task.status === 'completed' ? '已完成' : '去打卡'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  title: {
    flex: 1,
    fontSize: 18,
    lineHeight: 26,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text,
    marginRight: theme.spacing.sm,
  },
  badge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  badgeText: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: theme.fonts.medium,
  },
  label: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textLight,
    fontFamily: theme.fonts.medium,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  meta: {
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular,
  },
  content: {
    fontSize: 15,
    lineHeight: 24,
    color: theme.colors.text,
    fontFamily: theme.fonts.regular,
  },
  hint: {
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.error,
    fontFamily: theme.fonts.regular,
    marginTop: theme.spacing.md,
  },
  errorBox: {
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.error,
    fontFamily: theme.fonts.regular,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  closeButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
  },
  closeButtonText: {
    fontSize: 14,
    color: theme.colors.text,
    fontFamily: theme.fonts.medium,
  },
  checkInButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
  },
  checkInButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  checkInButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: theme.fonts.medium,
  },
});
