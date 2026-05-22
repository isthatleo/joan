import { redirect } from "next/navigation";

export default async function TenantRoot({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Land hospital admin on the existing dashboard root (auth/role-aware)
  redirect(`/tenant/${slug}/`);
}
