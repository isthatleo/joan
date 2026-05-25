import { UserFeedbackDetailPage } from "@/components/feedback/UserFeedbackDetailPage";

export default function FeedbackDetailPage() {
  return <UserFeedbackDetailPage routeBase="/admin/feedback" queryKey="admin-feedback" />;
}
