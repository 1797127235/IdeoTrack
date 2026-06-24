import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import AuthGuard from "@/components/AuthGuard";
import AuthProvider from "@/components/AuthProvider";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthProvider>
      <AuthGuard>
        <div className="min-h-screen flex">
          <Sidebar />
          <div className="flex-1 ml-60 flex flex-col">
            <TopBar />
            <main className="flex-1 p-8 overflow-auto">{children}</main>
          </div>
        </div>
      </AuthGuard>
    </AuthProvider>
  );
}
