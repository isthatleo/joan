import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy | Joan Healthcare OS",
  description: "How Joan handles account, workplace, and contact information across its multi-tenant platform.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy policy"
      description="This policy explains what information Joan receives, how it is used inside a role-aware workspace, and how to reach us with a privacy question."
      sections={[
        {
          title: "Scope of this policy",
          paragraphs: [
            "This policy applies to the Joan marketing site, sign-in experience, documentation, and the authenticated product workspaces. It is written for prospective customers, clinicians, administrators, and other people who interact with Joan.",
            "When Joan is deployed for a hospital, clinic, or network, that organization controls the clinical and operational records entered into its tenant. This page does not replace a customer's own privacy notice, policies, or applicable law.",
          ],
        },
        {
          title: "Information we receive",
          paragraphs: [
            "We receive information you provide directly, information created by your organization in a tenant workspace, and limited technical information generated when you use the site.",
          ],
          bullets: [
            "Account details such as name, email address, role, tenant, and authentication records.",
            "Workspace records such as appointments, consultations, lab results, prescriptions, invoices, and messages entered by authorized users.",
            "Contact form details such as your name, work email, organization, topic, and message.",
            "Technical and usage data such as IP address, browser type, timestamps, and error logs where collection is enabled.",
          ],
        },
        {
          title: "How information is used",
          paragraphs: [
            "Information is used to provide and secure the platform, route support and product requests, maintain audit trails, improve reliability, and communicate with users about their account or request.",
            "Clinical and tenant records are used to deliver the workflows your organization has enabled. They are not repurposed for advertising.",
          ],
        },
        {
          title: "Tenant and role boundaries",
          paragraphs: [
            "Joan is built as a multi-tenant platform. Access to tenant data is restricted server-side by the signed-in user's tenant, role, and permissions. Client-side interface checks are never the only access control.",
            "Clinical Copilot answers are generated from records scoped to the signed-in clinician and further filtered by that user's permissions. Answers are decision support and must be reviewed against the source record.",
          ],
        },
        {
          title: "Sharing and service providers",
          paragraphs: [
            "We do not sell personal information. Information may be processed by infrastructure, communications, and model providers where those services are configured for the relevant deployment. For example, outbound email may use a configured provider, and Copilot requests may use a configured model provider.",
            "Recipients are limited to what is needed for the requested function, and customer-configured integrations are governed by the organization that enabled them.",
          ],
        },
        {
          title: "Retention and your choices",
          paragraphs: [
            "Retention depends on the type of record, the customer's configuration, and legal or operational requirements. Contact submissions are retained as platform feedback so they can be reviewed and resolved.",
            "You may request access to, correction of, or deletion of information by contacting us. We may need to verify your identity and authority before acting, especially where records belong to a tenant organization.",
          ],
        },
        {
          title: "Changes and contact",
          paragraphs: [
            "We may update this policy as the platform changes. The updated date at the top of the page indicates the current version.",
            "For privacy questions, use the contact page or email support@joan.health. Do not include patient identifiers or clinical details in an unsolicited email.",
          ],
        },
      ]}
    />
  );
}
