import { redirect } from "next/navigation";

export default function BillingRedirectPage() {
  redirect("/super-admin/billing");
}
