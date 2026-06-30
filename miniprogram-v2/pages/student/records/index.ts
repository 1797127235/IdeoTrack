import { getStudyRecords, StudyRecordItem } from '../../../services/studyApi';

function formatRecordTime(iso: string): string {
  const d = new Date(iso);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hour}:${minute}`;
}

function pickIcon(status: string): string {
  if (status.includes('approved')) return 'book';
  if (status.includes('rejected') || status.includes('modification')) return 'flag';
  return 'article';
}

Page({
  data: {
    records: [] as Array<{ id: string; icon: string; title: string; time: string; points: string }>,
  },

  async onLoad() {
    await this.loadRecords();
  },

  async loadRecords() {
    try {
      const result = await getStudyRecords();
      const records = result.items.map((item: StudyRecordItem) => ({
        id: item.id,
        icon: pickIcon(item.status),
        title: item.taskTitle,
        time: formatRecordTime(item.checkedInAt),
        points: `+${item.points}`,
      }));
      this.setData({ records });
    } catch (err) {
      wx.showToast({
        title: err instanceof Error ? err.message : '成长记录加载失败',
        icon: 'none',
      });
    }
  },

  onBackTap() {
    wx.redirectTo({ url: '/pages/student/growth/index' });
  },
});
