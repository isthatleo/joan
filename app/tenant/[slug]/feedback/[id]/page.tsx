import { UserFeedbackDetailPage } from "@/components/feedback/UserFeedbackDetailPage";

export default function TenantFeedbackDetailPage() {
  return <UserFeedbackDetailPage routeBase="/feedback" queryKey="tenant-feedback" />;
}
