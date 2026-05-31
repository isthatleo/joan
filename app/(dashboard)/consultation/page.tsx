import { redirect } from "next/navigation";

export default function ConsultationRedirectPage() {
  redirect("/doctor/queue");
}
