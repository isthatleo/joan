import { Sidebar } from "@/components/Sidebar";
import { AICopilotPanel } from "@/components/AICopilotPanel";
import { Topbar } from "@/components/Topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen bg-background flex flex-col">
      <Topbar breadcrumbs={[{ label: "Dashboard" }]} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
        <AICopilotPanel />
      </div>
    </div>
  );
}
