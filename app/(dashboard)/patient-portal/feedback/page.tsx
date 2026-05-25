import { UserFeedbackWorkspace } from "@/components/feedback/UserFeedbackWorkspace";

export default function FeedbackPage() {
  return <UserFeedbackWorkspace routeBase="/patient-portal/feedback" queryKey="patient-portal-feedback" />;
}
