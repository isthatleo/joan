import { UserFeedbackWorkspace } from "@/components/feedback/UserFeedbackWorkspace";

export default function TenantLabFeedbackPage() {
  return <UserFeedbackWorkspace routeBase="/lab/feedback" queryKey="lab-feedback" />;
}
