"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, Clock3, Eye, MessageSquare, ShieldAlert, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { withTenantPrefix } from "@/lib/tenant-routing";
import { Button, PageHeader, SectionCard, Skeleton } from "@/components/ui";

type UserFeedbackDetailPageProps = {
  routeBase: string;
  queryKey: string;
  title?: string;
  description?: string;
};

function FeedbackBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold capitalize text-foreground">{value.replaceAll("_", " ")}</p>
    </div>
  );
}

export function UserFeedbackDetailPage({
  routeBase,
  queryKey,
  title = "Feedback Details",
  description = "Review submission context, routing, and current resolution status.",
}: UserFeedbackDetailPageProps) {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const slug = typeof params?.slug === "string" ? params.slug : undefined;
  const feedbackId = typeof params?.id === "string" ? params.id : "";
  const hostname = typeof window !== "undefined" ? window.location.hostname : null;
  const toTenantPath = (path: string) => withTenantPrefix(path, slug, hostname);

  const { data, isLoading } = useQuery({
    queryKey: ["feedback-detail", routeBase, feedbackId],
    queryFn: async () => {
      const response = await fetch(`/api/feedback/${feedbackId}`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(response.status === 404 ? "Feedback not found" : "Failed to load feedback");
      }
      return response.json();
    },
    enabled: !!feedbackId,
    refetchInterval: 15000,
  });

  const deleteFeedbackMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/feedback/${feedbackId}`, { method: "DELETE" });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete feedback");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      queryClient.invalidateQueries({ queryKey: ["feedback-detail"] });
      toast.success("Feedback deleted");
      router.push(toTenantPath(routeBase));
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to delete feedback");
    },
  });

  const feedback = data?.feedback;

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline">
              <Link href={toTenantPath(routeBase)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Feedback
              </Link>
            </Button>
            <Button
              variant="outline"
              className="border-destructive/30 text-destructive hover:bg-destructive/10"
              disabled={deleteFeedbackMutation.isPending || !feedbackId}
              onClick={() => {
                if (!window.confirm("Delete this feedback entry?")) return;
                deleteFeedbackMutation.mutate();
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {deleteFeedbackMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : !feedback ? (
        <SectionCard>
          <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
            <Eye className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="text-base font-semibold text-foreground">Feedback not found</p>
              <p className="text-sm text-muted-foreground">This item may have been deleted or you may not have access to it.</p>
            </div>
            <Button asChild variant="outline">
              <Link href={toTenantPath(routeBase)}>Return to Feedback</Link>
            </Button>
          </div>
        </SectionCard>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <FeedbackBadge label="Type" value={feedback.type} />
            <FeedbackBadge label="Scope" value={feedback.scope || "tenant"} />
            <FeedbackBadge label="Status" value={feedback.status} />
            <FeedbackBadge label="Priority" value={feedback.priority} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.35fr_0.9fr]">
            <SectionCard title={feedback.title} description="Primary submission details captured from the active workflow.">
              <div className="space-y-5">
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Description</p>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">
                    {feedback.description || "No additional description provided."}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-background p-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <UserRound className="h-4 w-4" />
                      <span className="text-xs font-medium uppercase tracking-[0.2em]">Submitted By</span>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-foreground">{feedback.user?.fullName || feedback.user?.email || "Unknown user"}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{feedback.user?.email || "No email recorded"}</p>
                  </div>

                  <div className="rounded-2xl border border-border bg-background p-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock3 className="h-4 w-4" />
                      <span className="text-xs font-medium uppercase tracking-[0.2em]">Submitted</span>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-foreground">
                      {feedback.createdAt ? format(new Date(feedback.createdAt), "MMM dd, yyyy 'at' h:mm a") : "Unknown"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{feedback.tenant?.name || "Cross-tenant platform feedback"}</p>
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Resolution State" description="Current handling and routing for this feedback item.">
              <div className="space-y-4">
                <div className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <ShieldAlert className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-[0.2em]">Routing</span>
                  </div>
                  <p className="mt-3 text-sm text-foreground">
                    {feedback.scope === "platform"
                      ? "This item is routed to super admin for product and implementation review."
                      : "This item remains within the tenant scope for operational follow-up."}
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MessageSquare className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase tracking-[0.2em]">Resolution</span>
                  </div>
                  <p className="mt-3 text-sm font-medium text-foreground">
                    Current status: {feedback.status.replaceAll("_", " ")}
                  </p>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">
                    {feedback.resolution || "No resolution has been recorded yet."}
                  </p>
                  {feedback.updatedAt ? (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Last updated {format(new Date(feedback.updatedAt), "MMM dd, yyyy 'at' h:mm a")}
                    </p>
                  ) : null}
                  {feedback.resolvedAt ? (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Resolved {format(new Date(feedback.resolvedAt), "MMM dd, yyyy 'at' h:mm a")}
                    </p>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Assigned Reviewer</p>
                  <p className="mt-3 text-sm font-semibold text-foreground">
                    {feedback.assignedToUser?.fullName || feedback.assignedToUser?.email || "Unassigned"}
                  </p>
                </div>
              </div>
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );
}
