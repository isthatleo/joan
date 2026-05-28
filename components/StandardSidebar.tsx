"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, LucideIcon } from "lucide-react";
import { resolveTenantSlug, withTenantPrefix } from "@/lib/tenant-routing";
import { getTenantSettingsSyncEventName } from "@/lib/hospital-settings-sync";
import { getModuleKeyForPath, isTenantModuleEnabled, normalizeTenantModules } from "@/lib/tenant-modules";

interface SidebarItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface SidebarSection {
  title: string;
  items: SidebarItem[];
}

interface StandardSidebarProps {
  logo: string;
  productName: string;
  sections: SidebarSection[];
  userRole: string;
}

export function StandardSidebar({
  logo,
  productName,
  sections,
  userRole,
}: StandardSidebarProps) {
  const pathname = usePathname();
  const hostname = typeof window !== "undefined" ? window.location.hostname : null;
  const tenantSlug =
    typeof window !== "undefined"
      ? resolveTenantSlug(pathname, hostname, sessionStorage.getItem("active_tenant_slug"))
      : null;

  const [tenantName, setTenantName] = useState(productName);
  const [tenantLogo, setTenantLogo] = useState<string | null>(logo || null);
  const [tenantModules, setTenantModules] = useState<Record<string, boolean> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const applyBranding = (updates: { name?: string; logoUrl?: string | null; modules?: Record<string, boolean> }) => {
      if (typeof updates.name === "string") {
        setTenantName(updates.name);
        sessionStorage.setItem("active_tenant_name", updates.name);
      }
      if ("logoUrl" in updates) {
        const nextLogo = updates.logoUrl || null;
        setTenantLogo(nextLogo);
        if (nextLogo) {
          sessionStorage.setItem("active_tenant_logo", nextLogo);
        } else {
          sessionStorage.removeItem("active_tenant_logo");
        }
      }
      if (updates.modules) {
        const normalized = normalizeTenantModules(updates.modules);
        setTenantModules(normalized);
        sessionStorage.setItem("active_tenant_modules", JSON.stringify(normalized));
      }
    };

    const syncFromStorage = () => {
      const nextName = sessionStorage.getItem("active_tenant_name");
      const nextLogo = sessionStorage.getItem("active_tenant_logo");
      const nextModulesRaw = sessionStorage.getItem("active_tenant_modules");
      setTenantName(nextName || productName);
      setTenantLogo(nextLogo || logo || null);
      if (nextModulesRaw) {
        try {
          setTenantModules(normalizeTenantModules(JSON.parse(nextModulesRaw)));
        } catch {}
      }
    };

    const syncFromEvent = (event: Event) => {
      const detail = (event as CustomEvent<{ name?: string; logoUrl?: string | null }>).detail;
      applyBranding(detail || {});
      syncFromStorage();
    };

    const syncFromLocalStorageEvent = (event: StorageEvent) => {
      if (event.key && event.key !== `hospital_settings_${tenantSlug}`) return;
      if (!event.newValue) return;
      try {
        const data = JSON.parse(event.newValue);
        applyBranding({
          name: data?.name,
          logoUrl: Object.prototype.hasOwnProperty.call(data || {}, "logoUrl") ? data.logoUrl : undefined,
          modules: data?.modules,
        });
      } catch {}
    };

    let brandingPollInterval: ReturnType<typeof setInterval> | null = null;
    let modulesPollInterval: ReturnType<typeof setInterval> | null = null;
    const fetchLatestBranding = async () => {
      if (!tenantSlug) return;
      try {
        const response = await fetch(`/api/tenants/${tenantSlug}/branding`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = await response.json();
        applyBranding({
          name: data?.hospitalName,
          logoUrl: Object.prototype.hasOwnProperty.call(data || {}, "logoUrl") ? data.logoUrl || null : undefined,
        });
      } catch {}
    };

    const fetchLatestModules = async () => {
      if (!tenantSlug) return;
      try {
        const response = await fetch(`/api/tenants/${tenantSlug}/settings`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = await response.json();
        applyBranding({ modules: data?.modules });
      } catch {}
    };

    syncFromStorage();
    window.addEventListener("storage", syncFromLocalStorageEvent);
    window.addEventListener(getTenantSettingsSyncEventName(), syncFromEvent as EventListener);
    fetchLatestBranding();
    fetchLatestModules();
    if (tenantSlug) {
      brandingPollInterval = setInterval(fetchLatestBranding, 10000);
      modulesPollInterval = setInterval(fetchLatestModules, 10000);
    }

    return () => {
      window.removeEventListener("storage", syncFromLocalStorageEvent);
      window.removeEventListener(getTenantSettingsSyncEventName(), syncFromEvent as EventListener);
      if (brandingPollInterval) clearInterval(brandingPollInterval);
      if (modulesPollInterval) clearInterval(modulesPollInterval);
    };
  }, [logo, productName, tenantSlug]);

  return (
    <div className="fixed left-0 top-0 h-screen w-64 overflow-y-auto border-r border-gray-200 bg-white">
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center gap-3">
          {tenantLogo ? (
            <img
              src={tenantLogo}
              alt="Logo"
              className="h-10 w-10 rounded-lg border border-gray-200 object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500 text-white">
              <GraduationCap className="h-5 w-5" />
            </div>
          )}
          <div>
            <h2 className="font-bold text-gray-900">{tenantName}</h2>
            <p className="text-xs capitalize text-gray-600">{userRole}</p>
          </div>
        </div>
      </div>

      <nav className="space-y-6 p-4">
        {sections.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            <h3 className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-gray-600">
              {section.title}
            </h3>
            <div className="space-y-1">
              {section.items.filter((item) => isTenantModuleEnabled(tenantModules, getModuleKeyForPath(item.href))).map((item, itemIndex) => {
                const resolvedHref = withTenantPrefix(item.href, tenantSlug, hostname);
                const isActive = pathname === resolvedHref;
                const Icon = item.icon;

                return (
                  <Link
                    key={itemIndex}
                    href={resolvedHref}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-orange-50 text-orange-600"
                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}
