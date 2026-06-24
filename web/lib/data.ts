export const tasks = [
  { id: 1, title: "学习党的二十大精神", type: "每日打卡", startDate: "2026-06-01", endDate: "2026-06-30", status: "进行中", participants: 2793, completionRate: 87 },
  { id: 2, title: "红色经典诵读", type: "心得提交", startDate: "2026-06-10", endDate: "2026-06-20", status: "已结束", participants: 1850, completionRate: 92 },
  { id: 3, title: "社会主义核心价值观学习", type: "每日打卡", startDate: "2026-06-15", endDate: "2026-07-15", status: "进行中", participants: 2793, completionRate: 74 },
  { id: 4, title: "党史知识竞赛", type: "活动任务", startDate: "2026-06-20", endDate: "2026-06-25", status: "未开始", participants: 1200, completionRate: 0 },
  { id: 5, title: "暑期社会实践动员", type: "通知任务", startDate: "2026-06-22", endDate: "2026-06-28", status: "进行中", participants: 2600, completionRate: 45 },
];

export const quotes = [
  { id: 1, content: "青年兴则国家兴，青年强则国家强。", author: "习近平", category: "青年担当" },
  { id: 2, content: "不忘初心，方得始终。", author: "习近平", category: "初心使命" },
  { id: 3, content: "道路决定命运，道路就是方向。", author: "习近平", category: "理想信念" },
  { id: 4, content: "幸福都是奋斗出来的。", author: "习近平", category: "奋斗精神" },
];

export const organizations = [
  { id: 1, name: "校党委", level: "校级", users: 5 },
  { id: 2, name: "马克思主义学院", level: "学院", users: 320 },
  { id: 3, name: "外国语学院", level: "学院", users: 280 },
  { id: 4, name: "计算机学院", level: "学院", users: 410 },
  { id: 5, name: "经济管理学院", level: "学院", users: 365 },
];

export const users = [
  { id: 1, name: "张三", role: "学生", college: "计算机学院", status: "正常", lastLogin: "2026-06-24 08:32" },
  { id: 2, name: "李四", role: "辅导员", college: "外国语学院", status: "正常", lastLogin: "2026-06-24 09:15" },
  { id: 3, name: "王五", role: "学生", college: "经济管理学院", status: "禁用", lastLogin: "2026-06-20 14:22" },
  { id: 4, name: "赵六", role: "管理员", college: "校党委", status: "正常", lastLogin: "2026-06-24 10:01" },
];

export const reports = [
  { id: 1, name: "每日打卡汇总报表", type: "日报", generatedAt: "2026-06-24 00:00", size: "128 KB" },
  { id: 2, name: "学院打卡率排名", type: "月报", generatedAt: "2026-06-23 23:00", size: "256 KB" },
  { id: 3, name: "未打卡学生清单", type: "即时", generatedAt: "2026-06-24 09:30", size: "64 KB" },
];

export const operations = [
  { id: 1, time: "2026-06-24 10:23", user: "赵六", action: "创建任务", target: "党史知识竞赛" },
  { id: 2, time: "2026-06-24 09:45", user: "赵六", action: "导出报表", target: "每日打卡汇总报表" },
  { id: 3, time: "2026-06-23 16:12", user: "李四", action: "禁用账号", target: "王五" },
  { id: 4, time: "2026-06-23 14:08", user: "赵六", action: "修改名言", target: "初心使命" },
];
