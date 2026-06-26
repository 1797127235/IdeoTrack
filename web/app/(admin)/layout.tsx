"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import AuthGuard from "@/components/AuthGuard";
import AuthProvider from "@/components/AuthProvider";
import { ToastProvider } from "@/components/ui";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <AuthProvider>
      <AuthGuard>
        <ToastProvider>
          <div className="min-h-screen flex">
            <Sidebar
              mobileOpen={mobileNavOpen}
              onCloseMobile={() => setMobileNavOpen(false)}
            />
            <div className="flex-1 lg:ml-60 flex flex-col min-w-0">
              <TopBar onMenuClick={() => setMobileNavOpen(true)} />
              <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
                {children}
              </main>
            </div>
          </div>
        </ToastProvider>
      </AuthGuard>
    </AuthProvider>
  );
}
