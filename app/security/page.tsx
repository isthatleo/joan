import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/LegalPage";

export const metadata: Metadata = {
  title: "Security | Joan Healthcare OS",
  description: "An overview of Joan's access controls, tenant boundaries, auditing, and AI safeguards.",
};

export default function SecurityPage() {
  return (
    <LegalPage
      eyebrow="Trust"
      title="Security"
      description="Joan is organized around explicit roles, bounded tenants, and visible activity so healthcare teams can work with clear boundaries."
      sections={[
        {
          title: "Access control",
          paragraphs: [
            "Every authenticated request is resolved against the signed-in account, its tenant, and its assigned roles or permission overrides. Authorization is enforced on the server; interface visibility is not treated as a security boundary.",
          ],
        },
        {
          title: "Tenant isolation",
          paragraphs: [
            "Clinical and operational records are queried with tenant constraints. Copilot contexts and summaries are additionally scoped to the clinician's assigned queue, visits, and records before any data is sent to a configured model provider.",
          ],
        },
        {
          title: "Data handling",
          paragraphs: [
            "Transport encryption, provider configuration, and retention settings depend on the deployment. Secrets such as API keys are kept server-side and are not exposed through the public site or client bundle.",
          ],
        },
        {
          title: "Audit and activity records",
          paragraphs: [
            "Important actions and Copilot generations are written to activity or AI logs where logging is enabled. These records support internal review and operational accountability.",
          ],
        },
        {
          title: "AI safeguards",
          paragraphs: ["Clinical Copilot is built around several guardrails:"],
          bullets: [
            "Answers are grounded only in authorized in-app records.",
            "Source references are validated against the records included in the request.",
            "Role permissions filter which categories of clinical data can be used.",
            "AI output is presented as decision support for clinician review, not as an autonomous action.",
            "Adding generated text to a note is an explicit local user action.",
          ],
        },
        {
          title: "Reporting a concern",
          paragraphs: [
            "If you believe you found a security issue, use the contact page with a Security topic. Include the affected page or endpoint and a description of the impact. Do not include real patient records or credentials in your report, and do not test systems you are not authorized to test.",
          ],
        },
        {
          title: "Scope of this page",
          paragraphs: [
            "This page is a general overview of platform design practices. It is not a certification, audit report, or claim of compliance with any specific regulatory framework. Customers should review their deployment and agreements for control details.",
          ],
        },
      ]}
    />
  );
}
