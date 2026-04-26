"use client";

import { useState } from "react";
import {
  PageHeader,
  StatCard,
  SectionCard,
  StatusPill,
} from "@/components/ui";
import {
  Settings,
  Shield,
  Globe,
  Mail,
  Database,
  Bell,
  Key,
  RotateCw,
  Save,
} from "lucide-react";

export default function SuperAdminSettings() {
  const [maintenance, setMaintenance] = useState(false);
  const [twoFactor, setTwoFactor] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [auditLogging, setAuditLogging] = useState(true);

  return (
    <div>
      <PageHeader
        title="System Settings"
        subtitle="Configure platform-wide preferences and security"
        actions={
          <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition">
            <Save className="h-4 w-4" />
            Save Changes
          </button>
        }
      />

      {/* Quick Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Environment" value="Production" subtitle="Live system" icon={Globe} tone="success" />
        <StatCard title="App Version" value="v2.4.1" subtitle="Last updated 2d ago" icon={Settings} tone="info" />
        <StatCard title="Region" value="us-east-1" subtitle="Primary cluster" icon={Database} tone="primary" />
        <StatCard title="Security" value="Hardened" subtitle="HIPAA + SOC2" icon={Shield} tone="success" />
      </div>

      {/* General */}
      <SectionCard title="General" description="Platform identity and metadata" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Platform Name" defaultValue="Joan Healthcare" />
          <Field label="Support Email" defaultValue="support@joan.health" />
          <Field label="Default Language" defaultValue="English (US)" />
          <Field label="Default Timezone" defaultValue="UTC" />
        </div>
      </SectionCard>

      {/* Security */}
      <SectionCard title="Security & Access" description="Platform-wide auth policies" className="mb-6">
        <div className="space-y-3">
          <Toggle
            icon={Shield}
            title="Two-Factor Authentication"
            description="Require 2FA for all admin and staff users"
            checked={twoFactor}
            onChange={setTwoFactor}
          />
          <Toggle
            icon={Database}
            title="Audit Logging"
            description="Record all privileged actions across tenants"
            checked={auditLogging}
            onChange={setAuditLogging}
          />
          <Toggle
            icon={Settings}
            title="Maintenance Mode"
            description="Temporarily disable the platform for upgrades"
            checked={maintenance}
            onChange={setMaintenance}
          />
        </div>
      </SectionCard>

      {/* Notifications */}
      <SectionCard title="Notifications" description="System-level delivery channels" className="mb-6">
        <div className="space-y-3">
          <Toggle
            icon={Mail}
            title="Email Notifications"
            description="Send transactional and alert emails"
            checked={emailEnabled}
            onChange={setEmailEnabled}
          />
          <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-info-soft text-info-soft-foreground">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Push Notifications</p>
                <p className="text-xs text-muted-foreground">Configured per tenant</p>
              </div>
            </div>
            <StatusPill tone="success">Operational</StatusPill>
          </div>
        </div>
      </SectionCard>

      {/* API Keys */}
      <SectionCard
        title="API Keys"
        description="Platform-level integration credentials"
        actions={
          <button className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition">
            <RotateCw className="h-3.5 w-3.5" />
            Rotate All
          </button>
        }
      >
        <div className="space-y-2">
          {[
            { name: "Public API", key: "pk_live_••••••8a2c", lastUsed: "1m ago" },
            { name: "Admin API", key: "sk_live_••••••f43e", lastUsed: "15m ago" },
            { name: "Webhook Signing", key: "whsec_••••••91c7", lastUsed: "1h ago" },
          ].map((k, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
                  <Key className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{k.name}</p>
                  <p className="text-xs font-mono text-muted-foreground">{k.key}</p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">Used {k.lastUsed}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function Field({ label, defaultValue }: { label: string; defaultValue: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <input
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

function Toggle({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: any;
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-foreground">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
