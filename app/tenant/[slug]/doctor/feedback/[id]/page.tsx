import { UserFeedbackDetailPage } from "@/components/feedback/UserFeedbackDetailPage";

export default function FeedbackDetailPage() {
  return <UserFeedbackDetailPage routeBase="/doctor/feedback" queryKey="doctor-feedback" />;
}
