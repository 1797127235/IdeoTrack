/**
 * 返回北京时间 YYYY-MM-DD 字符串。
 * 手动计算，避免 iOS/Android 对 toLocaleDateString 返回格式不一致。
 */
export function toBeijingDateString(d = new Date()): string {
  const offsetMs = (d.getTimezoneOffset() + 480) * 60 * 1000;
  const beijing = new Date(d.getTime() + offsetMs);
  const year = beijing.getFullYear();
  const month = String(beijing.getMonth() + 1).padStart(2, '0');
  const day = String(beijing.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 将 YYYY-MM-DD 格式化为中文展示「YYYY年M月D日」。
 */
export function formatDateText(dateStr: string): string {
  const parts = dateStr.split(/[-/]/).map((s) => parseInt(s, 10));
  if (parts.length >= 3 && !Number.isNaN(parts[0])) {
    return `${parts[0]}年${parts[1]}月${parts[2]}日`;
  }
  return dateStr;
}
