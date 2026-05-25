import { UserFeedbackDetailPage } from "@/components/feedback/UserFeedbackDetailPage";

export default function TenantPharmacyFeedbackDetailPage() {
  return <UserFeedbackDetailPage routeBase="/pharmacy/feedback" queryKey="pharmacy-feedback" />;
}
