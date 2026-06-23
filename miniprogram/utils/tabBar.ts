/**
 * 通知自定义 tabBar 高亮当前页签。
 * 在 tabBar 页面（pages/home、pages/counselor/dashboard 等）的 onShow 中调用。
 */
export function updateTabBarSelected(): void {
  const pages = getCurrentPages();
  const current = pages[pages.length - 1];
  if (!current) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tabBar = (current as any).getTabBar?.();
  if (tabBar && typeof tabBar.setSelectedByPath === 'function') {
    tabBar.setSelectedByPath(current.route || '');
  }
}
