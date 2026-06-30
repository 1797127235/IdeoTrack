import { getMeStats, Badge } from '../../../services/authApi';
import {
  getClassLeaderboard,
  getCollegeLeaderboard,
  getSchoolLeaderboard,
  LeaderboardResult,
} from '../../../services/leaderboardApi';
import { getStudyRecords, StudyRecordItem } from '../../../services/studyApi';

function formatRecordTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  return isToday ? `今天 ${hour}:${minute}` : `${month}-${day} ${hour}:${minute}`;
}

function computeBeatPercent(rank: number | null, totalCount: number): number {
  if (!rank || totalCount <= 1) return 0;
  return Math.round(((totalCount - rank) / (totalCount - 1)) * 100);
}

function pickIcon(status: string): string {
  if (status.includes('approved')) return 'book';
  if (status.includes('rejected') || status.includes('modification')) return 'flag';
  return 'article';
}

Page({
  data: {
    level: 'Lv.1',
    title: '新手学员',
    growthValue: 0,
    nextLevelValue: 100,
    remainingValue: 100,
    stats: [
      { key: 'streak', label: '连续打卡', value: '0', unit: '天', icon: 'calendar' },
      { key: 'completed', label: '累计完成', value: '0', unit: '项', icon: 'clipboard' },
      { key: 'month', label: '本月成长', value: '+0', unit: '', icon: 'trend' },
    ],
    rankingTabs: [
      { key: 'class', label: '班级', active: true },
      { key: 'college', label: '学院', active: false },
      { key: 'school', label: '全校', active: false },
    ],
    rankInfo: {
      rank: 1,
      percent: 0,
    },
    rankingData: {
      class: { rank: 1, percent: 0 },
      college: { rank: 1, percent: 0 },
      school: { rank: 1, percent: 0 },
    },
    records: [] as Array<{ icon: string; title: string; time: string; points: string }>,
    achievements: [] as Array<{ title: string; status: string; unlocked: boolean }>,
    tabs: [
      { key: 'home', label: '首页', icon: 'home', active: false },
      { key: 'task', label: '任务', icon: 'clipboard', active: false },
      { key: 'growth', label: '成长', icon: 'star', active: true },
      { key: 'mine', label: '我的', icon: 'user', active: false },
    ],
  },

  async onLoad() {
    await this.loadGrowthData();
  },

  async loadGrowthData() {
    try {
      const [stats, classBoard, collegeBoard, schoolBoard, records] = await Promise.all([
        getMeStats(),
        getClassLeaderboard().catch(() => null as LeaderboardResult | null),
        getCollegeLeaderboard().catch(() => null as LeaderboardResult | null),
        getSchoolLeaderboard().catch(() => null as LeaderboardResult | null),
        getStudyRecords().catch(() => null as { items: StudyRecordItem[] } | null),
      ]);

      const nextLevelValue = stats.level.maxPoints ?? stats.points;
      const rankingData = {
        class: { rank: classBoard?.myRank ?? 1, percent: computeBeatPercent(classBoard?.myRank ?? null, classBoard?.totalCount ?? 1) },
        college: { rank: collegeBoard?.myRank ?? 1, percent: computeBeatPercent(collegeBoard?.myRank ?? null, collegeBoard?.totalCount ?? 1) },
        school: { rank: schoolBoard?.myRank ?? 1, percent: computeBeatPercent(schoolBoard?.myRank ?? null, schoolBoard?.totalCount ?? 1) },
      };

      this.setData({
        level: `Lv.${stats.level.level}`,
        title: stats.level.title,
        growthValue: stats.points,
        nextLevelValue,
        remainingValue: Math.max(0, nextLevelValue - stats.points),
        stats: [
          { key: 'streak', label: '连续打卡', value: String(stats.currentStreak), unit: '天', icon: 'calendar' },
          { key: 'completed', label: '累计完成', value: String(stats.totalApproved), unit: '项', icon: 'clipboard' },
          { key: 'month', label: '本月成长', value: `+${stats.monthly.points}`, unit: '', icon: 'trend' },
        ],
        rankingData,
        rankInfo: rankingData.class,
        records:
          records?.items.slice(0, 4).map((item: StudyRecordItem) => ({
            icon: pickIcon(item.status),
            title: item.taskTitle,
            time: formatRecordTime(item.checkedInAt),
            points: `+${item.points}`,
          })) || [],
        achievements: stats.badges.map((badge: Badge) => ({
          title: badge.name,
          status: badge.earned ? '已解锁' : '未解锁',
          unlocked: badge.earned,
        })),
      });
    } catch (err) {
      wx.showToast({
        title: err instanceof Error ? err.message : '成长数据加载失败',
        icon: 'none',
      });
    }
  },

  onHelpTap() {
    wx.showToast({ title: '成长说明开发中', icon: 'none' });
  },

  onViewAllRecords() {
    wx.navigateTo({ url: '/pages/student/records/index' });
  },

  onRankTabTap(e: WechatMiniprogram.TouchEvent) {
    const { key } = e.currentTarget.dataset;
    const rankingData = this.data.rankingData as Record<string, { rank: number; percent: number }>;
    const rankInfo = rankingData[key];

    if (!rankInfo) {
      return;
    }

    this.setData({
      rankingTabs: this.data.rankingTabs.map((item) => ({
        ...item,
        active: item.key === key,
      })),
      rankInfo,
    });
  },

  onRankingTap() {
    wx.showToast({ title: '排行榜开发中', icon: 'none' });
  },

  onCompleteTask() {
    wx.redirectTo({ url: '/pages/student/home/index' });
  },

  onTabTap(e: WechatMiniprogram.TouchEvent) {
    const { key } = e.currentTarget.dataset;

    if (key === 'growth') {
      return;
    }

    if (key === 'home') {
      wx.redirectTo({ url: '/pages/student/home/index' });
      return;
    }

    if (key === 'task') {
      wx.redirectTo({ url: '/pages/student/task/index' });
      return;
    }

    if (key === 'mine') {
      wx.redirectTo({ url: '/pages/student/mine/index' });
      return;
    }

    wx.showToast({ title: '页面开发中', icon: 'none' });
  },
});
