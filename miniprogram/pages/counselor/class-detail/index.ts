import {
  getClassStudentList,
  ClassStudentItem,
  StudentFilterStatus,
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

Page({
  data: {
    classId: '',
    className: '班级详情',
    date: '',
    status: 'all' as StudentFilterStatus,
    statusOptions: STATUS_OPTIONS,
    students: [] as StudentViewItem[],
    total: 0,
    checkedCount: 0,
    absentCount: 0,
    loading: true,
    errorMsg: '',
  },

  onLoad(options: { classId?: string; className?: string; date?: string }) {
    const classId = options.classId || '';
    const className = options.className ? decodeURIComponent(options.className) : '班级详情';
    const date = options.date ? decodeURIComponent(options.date) : '';
    this.setData({ classId, className, date });
    if (classId) {
      this.loadStudents();
    } else {
      this.setData({ errorMsg: '班级 ID 无效', loading: false });
    }
  },

  onPullDownRefresh() {
    this.loadStudents().finally(() => wx.stopPullDownRefresh());
  },

  async loadStudents() {
    this.setData({ loading: true, errorMsg: '' });
    try {
      const data = await getClassStudentList(this.data.classId, this.data.status, this.data.date || undefined);
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
    this.setData({ status }, () => this.loadStudents());
  },


});
