import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service | Joan Healthcare OS",
  description: "Terms governing use of the Joan website and authenticated healthcare workspace.",
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of service"
      description="These terms set out the basic rules for using Joan, the responsibilities of users and organizations, and important limits around clinical decision support."
      sections={[
        {
          title: "Agreement to use Joan",
          paragraphs: [
            "By accessing the Joan website or signing in to a workspace, you agree to use the platform only for lawful purposes and in accordance with these terms and any agreement your organization has with Joan.",
            "If you use Joan on behalf of an organization, you confirm that you have authority to do so and that your use is permitted by that organization.",
          ],
        },
        {
          title: "Accounts and access",
          paragraphs: [
            "You are responsible for keeping your credentials secure and for notifying your administrator or Joan support if you believe your account has been compromised. Access is personal and must not be shared.",
            "Joan uses server-side tenant, role, and permission checks to determine what each account can see and do. Attempting to bypass those controls is prohibited.",
          ],
        },
        {
          title: "Acceptable use",
          paragraphs: ["You must not misuse the platform or interfere with its operation."],
          bullets: [
            "Do not upload content you do not have a right or duty to handle.",
            "Do not probe, scrape, or attempt to access records outside your authorization.",
            "Do not use the platform to distribute unlawful, deceptive, or harmful material.",
            "Do not use automated access in a way that degrades the service or violates an agreed limit.",
          ],
        },
        {
          title: "Clinical responsibility and AI",
          paragraphs: [
            "Joan supports clinical and administrative workflows; it does not replace professional judgment, local policy, or applicable law. clinicians remain responsible for the records they enter and the decisions they make.",
            "Copilot answers are generated from authorized in-app records and include source references, but they may be incomplete or incorrect. They are not a definitive diagnosis, prescription, or treatment recommendation. Verify every detail against the source record before acting, and do not enter patient identifiers into public contact forms.",
          ],
        },
        {
          title: "Fees and billing",
          paragraphs: [
            "Where a subscription or paid service applies, fees, billing cycles, and taxes are described in the relevant order, invoice, or customer agreement. The refund policy explains how to request a review of a charge.",
          ],
        },
        {
          title: "Intellectual property",
          paragraphs: [
            "Joan and its software, design, and documentation remain the property of Joan or its licensors. Customer data remains subject to the customer's rights and the applicable service agreement.",
          ],
        },
        {
          title: "Suspension and changes",
          paragraphs: [
            "Access may be suspended or limited where required to protect security, prevent misuse, comply with law, or enforce an agreement. We may update these terms as the platform evolves; the updated date indicates the current version.",
          ],
        },
        {
          title: "Disclaimer",
          paragraphs: [
            "The platform is provided on the basis described in your service agreement. Nothing on this website is legal, medical, or regulatory advice, and this page does not assert certification or compliance with any specific framework.",
          ],
        },
      ]}
    />
  );
}
