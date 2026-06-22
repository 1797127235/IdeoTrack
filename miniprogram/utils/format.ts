/**
 * 日期/时间格式化工具（镜像 mobile 端 formatDeadline 风格）
 */

/** 补零 */
function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** ISO 时间 → 本地化字符串，如「2026/6/23 下午4:00」 */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('zh-CN');
}

/** ISO 时间 → 简短日期，如「6/23」 */
export function formatDateShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** 截止时间 → 友好标签，如「今天 16:00 截止」「明天 截止」「3 天后 截止」 */
export function formatDeadline(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  let dayLabel: string;
  if (diffDays === 0) dayLabel = '今天';
  else if (diffDays === 1) dayLabel = '明天';
  else if (diffDays === -1) dayLabel = '昨天';
  else if (diffDays > 1) dayLabel = `${diffDays} 天后`;
  else dayLabel = `${Math.abs(diffDays)} 天前`;

  const timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return `${dayLabel} ${timeStr} 截止`;
}
