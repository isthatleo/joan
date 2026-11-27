import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/LegalPage";

export const metadata: Metadata = {
  title: "Refund Policy | Joan Healthcare OS",
  description: "How to request a review of a Joan charge and what information to include.",
};

export default function RefundPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Refund policy"
      description="This policy explains how billing reviews and refund requests are handled for Joan subscriptions and paid services."
      sections={[
        {
          title: "Scope",
          paragraphs: [
            "This policy applies to charges for Joan subscriptions and paid platform services. Professional services, third-party charges, and customer-specific arrangements may follow the terms in the applicable agreement or invoice.",
          ],
        },
        {
          title: "Billing cycles",
          paragraphs: [
            "Subscription fees are billed according to the plan, invoice, or customer agreement. Renewals continue until cancelled in accordance with that agreement. Taxes and externally imposed charges are handled as shown on the invoice.",
          ],
        },
        {
          title: "Cancellation",
          paragraphs: [
            "You may request cancellation through your account administrator or by contacting us. Cancellation does not automatically delete tenant data, and access may continue until the end of the paid term unless otherwise agreed.",
          ],
        },
        {
          title: "Refund requests",
          paragraphs: [
            "To request a refund or billing review, send the invoice number, billing email, organization name, charge date, amount, and a short explanation. Requests are reviewed against the applicable agreement and service usage.",
            "Approved refunds are returned to the original payment method where possible. Processing time depends on the payment provider and financial institution.",
          ],
        },
        {
          title: "Charges that are generally not refundable",
          paragraphs: ["The following are typically outside a standard refund:"],
          bullets: [
            "Services already delivered under a completed billing period.",
            "Third-party costs, taxes, or payment-processing charges that Joan cannot reverse.",
            "Custom work or professional services governed by a separate statement of work.",
            "Duplicate charges that have already been credited.",
          ],
        },
        {
          title: "Billing errors and disputed charges",
          paragraphs: [
            "If you believe a charge is incorrect, contact us promptly so we can investigate. Include supporting details and avoid initiating a broader dispute until we have had a reasonable opportunity to review the record.",
          ],
        },
        {
          title: "How to submit",
          paragraphs: [
            "Use the contact page and select Billing or refund as the topic, or email support@joan.health with the invoice details. Do not include clinical records or patient identifiers in a billing request.",
          ],
        },
      ]}
    />
  );
}
