import { UserFeedbackWorkspace } from "@/components/feedback/UserFeedbackWorkspace";

export default function FeedbackPage() {
  return <UserFeedbackWorkspace routeBase="/doctor/feedback" queryKey="doctor-feedback" />;
}
