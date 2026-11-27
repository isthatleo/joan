import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/LegalPage";

export const metadata: Metadata = {
  title: "Accessibility | Joan Healthcare OS",
  description: "Joan's approach to building accessible healthcare workflows and how to report a barrier.",
};

export default function AccessibilityPage() {
  return (
    <LegalPage
      eyebrow="Trust"
      title="Accessibility"
      description="Joan is designed for busy clinical teams. We aim to make every workspace clear, keyboard-friendly, and usable across common assistive technologies."
      sections={[
        {
          title: "Our approach",
          paragraphs: [
            "Accessibility is treated as part of product quality, not a final checklist. We aim to follow widely recognized web accessibility guidance, including WCAG 2.1 AA principles, as a design and review target.",
            "This page describes our approach; it is not a certification or a guarantee that every page is free of barriers.",
          ],
        },
        {
          title: "Practices in the product",
          paragraphs: ["Our interface work emphasizes:"],
          bullets: [
            "Semantic headings, labels, and identifiable controls.",
            "Keyboard access to core navigation and form flows.",
            "Visible focus states and readable contrast in supported themes.",
            "Clear status messages for loading, success, and error states.",
            "Responsive layouts that remain usable on smaller screens.",
          ],
        },
        {
          title: "Known limitations",
          paragraphs: [
            "Some complex clinical views, legacy content, or third-party integrations may not yet meet the same standard. If you encounter a barrier, tell us the page, your role, the browser or assistive technology, and the task you were trying to complete.",
          ],
        },
        {
          title: "Feedback and review",
          paragraphs: [
            "Accessibility reports are routed to the platform team for review. We prioritize issues that block core clinical or administrative tasks and may ask for additional context to reproduce the problem.",
          ],
        },
        {
          title: "Contact",
          paragraphs: [
            "Use the contact page with an Accessibility topic, or email support@joan.health. Please do not include patient information in an accessibility report.",
          ],
        },
      ]}
    />
  );
}
