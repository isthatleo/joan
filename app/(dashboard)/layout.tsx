"use client";

import { AICopilotButton } from "@/components/AICopilotButton";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { PlatformCopilotButton } from "@/components/platform-copilot/PlatformCopilotButton";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { useAuthStore } from "@/stores/auth";

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-subtle">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          Loading your workspace…
        </div>
      </div>
    );
  }
  if (!user) return null;

  return (
    <>
      <div className="flex h-screen bg-subtle text-foreground">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin">{children}</main>
        </div>
      </div>
      {user.role === "super_admin" ? (
        <PlatformCopilotButton sessionKey={`platform-copilot:${user.id || user.email}`} />
      ) : (
        <AICopilotButton
          sessionKey={`tenant-copilot:${user.id || user.email}:${user.tenantId || user.hospitalId || "global"}`}
        />
      )}
    </>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DashboardContent>{children}</DashboardContent>
      </AuthProvider>
    </ThemeProvider>
  );
}
