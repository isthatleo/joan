import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/LegalPage";

export const metadata: Metadata = {
  title: "Cookie Policy | Joan Healthcare OS",
  description: "How cookies and similar technologies are used across the Joan website and product.",
};

export default function CookiePage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Cookie policy"
      description="This page explains the categories of cookies and similar technologies that may be used by Joan and how to manage them."
      sections={[
        {
          title: "What cookies are",
          paragraphs: [
            "Cookies are small files stored by a browser. Similar technologies may include local storage and server-side session records. They can help a site remember preferences, keep a user signed in, or understand aggregate usage.",
          ],
        },
        {
          title: "Categories we use",
          paragraphs: [
            "The exact cookies in use depend on the deployment and which modules are enabled. Categories are described below so you can understand their purpose.",
          ],
          bullets: [
            "Strictly necessary: session, authentication, security, and load-balancing functions required to deliver the service.",
            "Preferences: remembered interface choices such as language, theme, or dismissed notices.",
            "Analytics: aggregate measurement where enabled, used to understand reliability and product usage.",
            "Integration-generated: cookies set by a third-party service you or your organization choose to connect.",
          ],
        },
        {
          title: "Managing cookies",
          paragraphs: [
            "Most browsers allow you to block or delete cookies. Blocking strictly necessary cookies may prevent sign-in or break core functions. Preference and analytics choices can be adjusted through your browser or site controls where available.",
          ],
        },
        {
          title: "Third parties",
          paragraphs: [
            "Some services may set their own cookies under their own notices. Joan does not control those providers, and their use is governed by the terms of the service that placed the cookie.",
          ],
        },
        {
          title: "Changes and questions",
          paragraphs: [
            "We may update this page when the technologies in use change. For questions about cookies in a specific tenant workspace, contact your administrator or use the Joan contact page.",
          ],
        },
      ]}
    />
  );
}
