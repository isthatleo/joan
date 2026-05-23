import * as React from "react";

export interface EmailTemplateProps {
  firstName?: string;
  recipientName?: string;
  subject?: string;
  preheader?: string;
  heading?: string;
  body?: string;
  bodyHtml?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  secondaryCtaLabel?: string;
  secondaryCtaUrl?: string;
  brandName?: string;
  brandColor?: string;
  brandLogoUrl?: string;
  footerNote?: string;
  supportEmail?: string;
  previewLabel?: string;
  statusLabel?: string;
  statusTone?: "default" | "success" | "warning" | "danger" | "info";
  summary?: Array<{ label: string; value: string }>;
  sections?: Array<{ title: string; body?: string; bodyHtml?: string }>;
  footerLinks?: Array<{ label: string; href: string }>;
  variant?: "default" | "alert" | "success" | "invoice" | "report";
  items?: Array<{ label: string; value: string }>;
}

export function EmailTemplate({
  firstName,
  recipientName,
  preheader,
  heading,
  body,
  bodyHtml,
  ctaLabel,
  ctaUrl,
  secondaryCtaLabel,
  secondaryCtaUrl,
  brandName = "Joan Healthcare",
  brandColor = "#0F766E",
  brandLogoUrl,
  footerNote,
  supportEmail = "support@joan.health",
  previewLabel,
  statusLabel,
  statusTone = "default",
  summary,
  sections,
  footerLinks,
  variant = "default",
  items,
}: EmailTemplateProps) {
  const name = recipientName || firstName || "there";
  const variantColors: Record<NonNullable<EmailTemplateProps["variant"]>, string> = {
    default: brandColor,
    alert: "#DC2626",
    success: "#16A34A",
    invoice: "#1E40AF",
    report: "#7C3AED",
  };
  const toneColors: Record<NonNullable<EmailTemplateProps["statusTone"]>, { bg: string; text: string }> = {
    default: { bg: "#E2E8F0", text: "#0F172A" },
    success: { bg: "#DCFCE7", text: "#166534" },
    warning: { bg: "#FEF3C7", text: "#92400E" },
    danger: { bg: "#FEE2E2", text: "#991B1B" },
    info: { bg: "#DBEAFE", text: "#1D4ED8" },
  };
  const accentColor = variantColors[variant];
  const badgePalette = toneColors[statusTone];

  return (
    <html>
      <head>
        <title>{heading || `Hello ${name}`}</title>
      </head>
      <body style={main}>
        {preheader ? (
          <div style={preheaderStyle} aria-hidden="true">
            {preheader}
          </div>
        ) : null}
        <div style={container}>
          <div style={{ ...hero, background: `linear-gradient(135deg, ${accentColor}, #0F172A)` }}>
            <div style={heroTopRow}>
              {previewLabel ? <span style={eyebrow}>{previewLabel}</span> : <span style={eyebrow}>Transactional update</span>}
              {statusLabel ? (
                <span style={{ ...statusBadge, backgroundColor: badgePalette.bg, color: badgePalette.text }}>
                  {statusLabel}
                </span>
              ) : null}
            </div>
            {brandLogoUrl ? (
              <img src={brandLogoUrl} alt={brandName} height={36} style={{ marginBottom: "18px" }} />
            ) : (
              <p style={brand}>{brandName}</p>
            )}
            <h1 style={heroHeading}>{heading || `Hello ${name},`}</h1>
            <p style={heroText}>{body || "We have an update for you. Review the details below and take action if needed."}</p>
          </div>

          <div style={content}>
            {summary && summary.length > 0 ? (
              <div style={summaryGrid}>
                {summary.map((item, index) => (
                  <div key={`${item.label}-${index}`} style={summaryCard}>
                    <p style={summaryLabel}>{item.label}</p>
                    <p style={summaryValue}>{item.value}</p>
                  </div>
                ))}
              </div>
            ) : null}

            {bodyHtml ? <div style={text} dangerouslySetInnerHTML={{ __html: bodyHtml }} /> : null}

            {items && items.length > 0 ? (
              <div style={itemsBox}>
                {items.map((item, index) => (
                  <div
                    key={`${item.label}-${index}`}
                    style={{
                      ...itemRow,
                      borderBottom: index === items.length - 1 ? "none" : itemRow.borderBottom,
                    }}
                  >
                    <p style={itemLabel}>{item.label}</p>
                    <p style={itemValue}>{item.value}</p>
                  </div>
                ))}
              </div>
            ) : null}

            {sections?.map((section, index) => (
              <div key={`${section.title}-${index}`} style={sectionCard}>
                <h2 style={sectionTitle}>{section.title}</h2>
                {section.body ? <p style={text}>{section.body}</p> : null}
                {section.bodyHtml ? <div style={text} dangerouslySetInnerHTML={{ __html: section.bodyHtml }} /> : null}
              </div>
            ))}

            {(ctaLabel && ctaUrl) || (secondaryCtaLabel && secondaryCtaUrl) ? (
              <div style={ctaRow}>
                {ctaLabel && ctaUrl ? (
                  <a href={ctaUrl} style={{ ...button, backgroundColor: accentColor }}>
                    {ctaLabel}
                  </a>
                ) : null}
                {secondaryCtaLabel && secondaryCtaUrl ? (
                  <a href={secondaryCtaUrl} style={secondaryButton}>
                    {secondaryCtaLabel}
                  </a>
                ) : null}
              </div>
            ) : null}

            {footerNote ? <p style={footerNoteStyle}>{footerNote}</p> : null}
          </div>

          <div style={divider} />
          <div style={footerWrap}>
            <p style={small}>
              Need help? Contact <a href={`mailto:${supportEmail}`} style={{ color: accentColor }}>{supportEmail}</a>
            </p>
            {footerLinks?.length ? (
              <p style={small}>
                {footerLinks.map((link, index) => (
                  <React.Fragment key={`${link.label}-${index}`}>
                    {index > 0 ? " | " : ""}
                    <a href={link.href} style={{ color: accentColor }}>{link.label}</a>
                  </React.Fragment>
                ))}
              </p>
            ) : null}
            <p style={small}>&copy; {new Date().getFullYear()} {brandName}. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  );
}

const main: React.CSSProperties = {
  backgroundColor: "#E2E8F0",
  fontFamily: "Arial, Helvetica, sans-serif",
  margin: 0,
  padding: "24px 12px",
};

const preheaderStyle: React.CSSProperties = {
  display: "none",
  opacity: 0,
  overflow: "hidden",
  maxHeight: 0,
  maxWidth: 0,
};

const container: React.CSSProperties = {
  maxWidth: "680px",
  margin: "0 auto",
  backgroundColor: "#FFFFFF",
  borderRadius: "18px",
  overflow: "hidden",
  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.12)",
};

const hero: React.CSSProperties = {
  padding: "28px 28px 24px",
  color: "#FFFFFF",
};

const heroTopRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  marginBottom: "18px",
};

const eyebrow: React.CSSProperties = {
  fontSize: "11px",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  opacity: 0.84,
  fontWeight: 700,
};

const statusBadge: React.CSSProperties = {
  borderRadius: "999px",
  padding: "6px 10px",
  fontSize: "11px",
  fontWeight: 700,
};

const brand: React.CSSProperties = {
  color: "#FFFFFF",
  fontSize: "20px",
  fontWeight: 700,
  margin: "0 0 18px",
};

const heroHeading: React.CSSProperties = {
  fontSize: "28px",
  lineHeight: "1.2",
  margin: "0 0 10px",
};

const heroText: React.CSSProperties = {
  fontSize: "15px",
  lineHeight: "1.7",
  margin: 0,
  color: "rgba(255,255,255,0.88)",
};

const content: React.CSSProperties = {
  padding: "28px",
};

const summaryGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "12px",
  marginBottom: "20px",
};

const summaryCard: React.CSSProperties = {
  backgroundColor: "#F8FAFC",
  border: "1px solid #E2E8F0",
  borderRadius: "12px",
  padding: "14px",
};

const summaryLabel: React.CSSProperties = {
  margin: "0 0 6px",
  color: "#64748B",
  fontSize: "12px",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const summaryValue: React.CSSProperties = {
  margin: 0,
  color: "#0F172A",
  fontSize: "20px",
  fontWeight: 700,
};

const text: React.CSSProperties = {
  fontSize: "15px",
  color: "#334155",
  lineHeight: "1.7",
  margin: "0 0 16px",
};

const sectionCard: React.CSSProperties = {
  border: "1px solid #E2E8F0",
  borderRadius: "12px",
  padding: "18px",
  marginTop: "16px",
  backgroundColor: "#FFFFFF",
};

const sectionTitle: React.CSSProperties = {
  fontSize: "16px",
  color: "#0F172A",
  margin: "0 0 10px",
};

const ctaRow: React.CSSProperties = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
  alignItems: "center",
  margin: "28px 0 8px",
};

const button: React.CSSProperties = {
  color: "#FFFFFF",
  padding: "12px 22px",
  borderRadius: "10px",
  fontWeight: 700,
  fontSize: "14px",
  textDecoration: "none",
  display: "inline-block",
};

const secondaryButton: React.CSSProperties = {
  color: "#0F172A",
  padding: "12px 22px",
  borderRadius: "10px",
  fontWeight: 700,
  fontSize: "14px",
  textDecoration: "none",
  display: "inline-block",
  border: "1px solid #CBD5E1",
  backgroundColor: "#FFFFFF",
};

const itemsBox: React.CSSProperties = {
  border: "1px solid #E2E8F0",
  borderRadius: "12px",
  padding: "12px 16px",
  margin: "18px 0",
  backgroundColor: "#F8FAFC",
};

const itemRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  borderBottom: "1px solid #E2E8F0",
  padding: "10px 0",
};

const itemLabel: React.CSSProperties = {
  fontSize: "13px",
  color: "#64748B",
  margin: 0,
};

const itemValue: React.CSSProperties = {
  fontSize: "13px",
  color: "#0F172A",
  fontWeight: 700,
  margin: 0,
};

const footerNoteStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "#64748B",
  margin: "18px 0 0",
};

const divider: React.CSSProperties = {
  height: "1px",
  backgroundColor: "#E2E8F0",
};

const footerWrap: React.CSSProperties = {
  padding: "18px 28px 24px",
};

const small: React.CSSProperties = {
  fontSize: "12px",
  color: "#64748B",
  margin: "4px 0",
  lineHeight: "1.6",
};

export default EmailTemplate;
