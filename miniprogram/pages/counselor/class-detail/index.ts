import {
  getClassStudentList,
  sendReminders,
  type ClassStudentItem,
  type StudentFilterStatus,
} from '../../../services/counselorApi';
import { formatDateTime } from '../../../utils/format';

interface StudentViewItem extends ClassStudentItem {
  checkInTimeText: string;
}

const STATUS_OPTIONS: { value: StudentFilterStatus; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'checked_in', label: '已打卡' },
  { value: 'absent', label: '未打卡' },
];

function buildToastMessage(summary: {
  total: number;
  sent: number;
  skipped_no_openid: number;
  already_reminded: number;
  failed: number;
}): string {
  const parts: string[] = [];
  if (summary.sent > 0) parts.push(`成功 ${summary.sent} 人`);
  if (summary.skipped_no_openid > 0) parts.push(`未绑定微信 ${summary.skipped_no_openid} 人`);
  if (summary.already_reminded > 0) parts.push(`已提醒过 ${summary.already_reminded} 人`);
  if (summary.failed > 0) parts.push(`发送失败 ${summary.failed} 人`);
  return parts.length > 0 ? parts.join('，') : '未发送提醒';
}

Page({
  data: {
    classId: '',
    className: '班级详情',
    taskId: '',
    status: 'all' as StudentFilterStatus,
    statusOptions: STATUS_OPTIONS,
    students: [] as StudentViewItem[],
    selectedStudentIds: [] as string[],
    total: 0,
    checkedCount: 0,
    absentCount: 0,
    loading: true,
    sending: false,
    errorMsg: '',
  },

  onLoad(options: { classId?: string; className?: string; taskId?: string }) {
    const classId = options.classId || '';
    const className = options.className ? decodeURIComponent(options.className) : '班级详情';
    const taskId = options.taskId || '';
    this.setData({ classId, className, taskId });
    if (classId && taskId) {
      this.loadStudents();
    } else {
      this.setData({ errorMsg: '班级或任务 ID 无效', loading: false });
    }
  },

  onPullDownRefresh() {
    this.setData({ selectedStudentIds: [] });
    this.loadStudents().finally(() => wx.stopPullDownRefresh());
  },

  async loadStudents() {
    this.setData({ loading: true, errorMsg: '' });
    try {
      const data = await getClassStudentList(
        this.data.classId,
        this.data.taskId,
        this.data.status
      );
      const students = data.students.map<StudentViewItem>((s) => ({
        ...s,
        checkInTimeText: s.checked_in_at ? formatDateTime(s.checked_in_at) : '',
      }));
      const total = students.length;
      const checkedCount = students.filter((s) => s.checked_in).length;
      this.setData({
        students,
        total,
        checkedCount,
        absentCount: total - checkedCount,
      });
    } catch (err) {
      this.setData({
        errorMsg: err instanceof Error ? err.message : '加载失败',
        students: [],
        total: 0,
        checkedCount: 0,
        absentCount: 0,
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  onStatusChange(e: WechatMiniprogram.BaseEvent) {
    const status = e.currentTarget.dataset.value as StudentFilterStatus;
    if (!status || status === this.data.status) return;
    this.setData({ status, selectedStudentIds: [] }, () => this.loadStudents());
  },

  onToggleSelect(e: WechatMiniprogram.BaseEvent) {
    if (this.data.status !== 'absent') return;
    const studentId = e.currentTarget.dataset.studentId as string;
    if (!studentId) return;
    const student = this.data.students.find((s) => s.student_id === studentId);
    if (!student || student.checked_in) return;
    this.toggleSelection(studentId);
  },

  onCheckboxChange(e: WechatMiniprogram.CheckboxGroupChange) {
    const studentId = e.currentTarget.dataset.studentId as string;
    const values = e.detail.value ?? [];
    const checked = values.length > 0;
    const isSelected = this.data.selectedStudentIds.includes(studentId);
    if (checked && !isSelected) {
      this.setData({ selectedStudentIds: [...this.data.selectedStudentIds, studentId] });
    } else if (!checked && isSelected) {
      this.setData({
        selectedStudentIds: this.data.selectedStudentIds.filter((id) => id !== studentId),
      });
    }
  },

  onCheckboxTapStop() {
    // 阻止 checkbox 点击冒泡到行，避免行 tap 与 checkbox 重复切换
  },

  toggleSelection(studentId: string) {
    const selected = new Set(this.data.selectedStudentIds);
    if (selected.has(studentId)) {
      selected.delete(studentId);
    } else {
      selected.add(studentId);
    }
    this.setData({ selectedStudentIds: [...selected] });
  },

  onSelectAll() {
    if (this.data.status !== 'absent') return;
    const absentIds = this.data.students
      .filter((s) => !s.checked_in)
      .map((s) => s.student_id);
    this.setData({ selectedStudentIds: absentIds });
  },

  onClearSelection() {
    this.setData({ selectedStudentIds: [] });
  },

  onSendReminder() {
    if (this.data.status !== 'absent' || this.data.selectedStudentIds.length === 0) return;

    const absentSelectedIds = this.data.students
      .filter((s) => !s.checked_in && this.data.selectedStudentIds.includes(s.student_id))
      .map((s) => s.student_id);

    if (absentSelectedIds.length === 0) {
      wx.showToast({ title: '请选择未打卡学生', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '确认发送提醒',
      content: `将向 ${absentSelectedIds.length} 位未打卡学生发送打卡提醒`,
      confirmText: '发送',
      success: (res) => {
        if (res.confirm) {
          this.doSendReminders(absentSelectedIds);
        }
      },
    });
  },

  async doSendReminders(studentIds: string[]) {
    this.setData({ sending: true });
    try {
      const summary = await sendReminders(
        this.data.classId,
        this.data.taskId,
        studentIds
      );
      wx.showToast({
        title: buildToastMessage(summary),
        icon: 'none',
        duration: 2500,
      });
      this.setData({ selectedStudentIds: [] }, () => this.loadStudents());
    } catch (err) {
      wx.showToast({
        title: err instanceof Error ? err.message : '发送失败',
        icon: 'none',
      });
    } finally {
      this.setData({ sending: false });
    }
  },
});
