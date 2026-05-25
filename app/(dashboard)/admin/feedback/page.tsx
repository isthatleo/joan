import { UserFeedbackWorkspace } from "@/components/feedback/UserFeedbackWorkspace";

export default function FeedbackPage() {
  return <UserFeedbackWorkspace routeBase="/admin/feedback" queryKey="admin-feedback" />;
}
