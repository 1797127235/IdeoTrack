import AuthGuard from "@/components/AuthGuard";

/**
 * 管理员路由组布局 —— 统一包裹 AuthGuard，
 * 所有 (admin)/ 下的页面自动受管理员守卫保护。
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard>{children}</AuthGuard>;
}
