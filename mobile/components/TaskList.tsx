import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { theme } from '../theme';
import { getMyTasks, type StudentTask, type StudentTaskStatus } from '../services/tasksApi';
import { TaskDetailModal } from './TaskDetailModal';

function formatDeadline(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const deadlineDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((deadlineDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  let dayLabel = '';
  if (diffDays === 0) dayLabel = '今天';
  else if (diffDays === 1) dayLabel = '明天';
  else if (diffDays === -1) dayLabel = '昨天';
  else if (diffDays > 1) dayLabel = `${diffDays}天后`;
  else dayLabel = `${Math.abs(diffDays)}天前`;

  const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  return `${dayLabel} ${timeStr}截止`;
}

function statusLabel(status: StudentTaskStatus): string {
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

function statusColor(status: StudentTaskStatus) {
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

export function TaskList() {
  const [tasks, setTasks] = useState<StudentTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTask, setSelectedTask] = useState<StudentTask | null>(null);

  const loadTasks = useCallback(async () => {
    try {
      const data = await getMyTasks(1, 20);
      setTasks(data);
    } catch (error) {
      // 静默失败，保持已有数据
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getMyTasks(1, 20)
      .then((data) => {
        if (mounted) setTasks(data);
      })
      .catch(() => undefined)
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        nestedScrollEnabled
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
      >
        <Text style={styles.sectionTitle}>学习任务</Text>

        {tasks.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>暂无学习任务，放松一下～</Text>
          </View>
        ) : (
          tasks.map((task) => (
            <TouchableOpacity
              key={task.id}
              style={styles.taskCard}
              onPress={() => setSelectedTask(task)}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.title} numberOfLines={1}>
                  {task.title}
                </Text>
                <View style={[styles.badge, { backgroundColor: `${statusColor(task.status)}20` }]}>
                  <Text style={[styles.badgeText, { color: statusColor(task.status) }]}>
                    {statusLabel(task.status)}
                  </Text>
                </View>
              </View>
              <Text style={styles.deadline}>{formatDeadline(task.deadline_at)}</Text>
              {task.completed_at && (
                <Text style={styles.completedAt}>完成于 {new Date(task.completed_at).toLocaleString('zh-CN')}</Text>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  loadingContainer: {
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 24,
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
    lineHeight: 22,
    color: theme.colors.textLight,
    fontFamily: theme.fonts.regular,
  },
  taskCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  title: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: theme.fonts.medium,
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
  deadline: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textLight,
    fontFamily: theme.fonts.regular,
  },
  completedAt: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.cta,
    fontFamily: theme.fonts.regular,
    marginTop: theme.spacing.xs,
  },
});
