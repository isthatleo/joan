import { UserFeedbackWorkspace } from "@/components/feedback/UserFeedbackWorkspace";

export default function TenantPharmacyFeedbackPage() {
  return <UserFeedbackWorkspace routeBase="/pharmacy/feedback" queryKey="pharmacy-feedback" />;
}
