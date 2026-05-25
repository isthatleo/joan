import { UserFeedbackWorkspace } from "@/components/feedback/UserFeedbackWorkspace";

export default function FeedbackPage() {
  return <UserFeedbackWorkspace routeBase="/nurse/feedback" queryKey="nurse-feedback" />;
}
