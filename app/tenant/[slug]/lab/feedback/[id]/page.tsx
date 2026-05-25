import { UserFeedbackDetailPage } from "@/components/feedback/UserFeedbackDetailPage";

export default function TenantLabFeedbackDetailPage() {
  return <UserFeedbackDetailPage routeBase="/lab/feedback" queryKey="lab-feedback" />;
}
