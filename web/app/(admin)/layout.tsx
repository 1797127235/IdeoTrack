import AuthGuard from "@/components/AuthGuard";
import Sidebar from "@/components/Sidebar";

/**
 * 管理员路由组布局 —— 统一包裹 AuthGuard，
 * 所有 (admin)/ 下的页面自动受管理员守卫保护。
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-[#ECFEFF]">
        <Sidebar />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
