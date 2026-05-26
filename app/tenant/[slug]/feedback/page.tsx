import { UserFeedbackWorkspace } from "@/components/feedback/UserFeedbackWorkspace";

export default function TenantFeedbackPage() {
  return <UserFeedbackWorkspace routeBase="/feedback" queryKey="tenant-feedback" />;
}
