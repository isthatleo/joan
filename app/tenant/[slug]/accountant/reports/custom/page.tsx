"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function CustomReportPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const create = async () => {
    toast.success("Custom report request created");
    router.push(`/tenant/${slug}/accountant/reports`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/tenant/${slug}/accountant/reports`} className="rounded-lg border border-border p-2 hover:bg-muted"><ArrowLeft className="size-4" /></Link>
        <div><p className="text-xs uppercase tracking-wider text-muted-foreground">Custom Report</p><h1 className="text-3xl font-bold">Build a custom report</h1></div>
      </div>
      <div className="space-y-4 rounded-xl border border-border bg-card p-6">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Report name" className="h-10 w-full rounded-lg border border-border px-3" />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Report scope and fields" className="min-h-32 w-full rounded-lg border border-border px-3 py-2" />
      </div>
      <button onClick={create} className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white">Create Custom Report</button>
    </div>
  );
}
