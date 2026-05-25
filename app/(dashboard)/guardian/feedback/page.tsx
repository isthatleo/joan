import { UserFeedbackWorkspace } from "@/components/feedback/UserFeedbackWorkspace";

export default function FeedbackPage() {
  return <UserFeedbackWorkspace routeBase="/guardian/feedback" queryKey="guardian-feedback" />;
}
