import { create } from "zustand";
import { useCallback, useEffect } from "react";

export interface HospitalBranding {
  id: string;
  name: string;
  slug: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  lightLogoUrl?: string;
  faviconUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  timezone?: string;
  plan?: string;
}

interface HospitalBrandingStore {
  branding: HospitalBranding | null;
  isLoading: boolean;
  lastUpdated: number;

  setBranding: (branding: HospitalBranding) => void;
  setLoading: (loading: boolean) => void;
  fetchBranding: (tenantId: string) => Promise<void>;
  updateBranding: (tenantId: string, updates: Partial<HospitalBranding>) => Promise<void>;
}

export const useHospitalBrandingStore = create<HospitalBrandingStore>((set) => ({
  branding: null,
  isLoading: false,
  lastUpdated: 0,

  setBranding: (branding) => set({ branding, lastUpdated: Date.now() }),
  setLoading: (isLoading) => set({ isLoading }),

  fetchBranding: async (tenantId: string) => {
    try {
      set({ isLoading: true });
      const res = await fetch(`/api/hospital/${tenantId}/branding`);
      if (res.ok) {
        const data = await res.json();
        set({ branding: data, lastUpdated: Date.now() });
      }
    } catch (error) {
      console.error("Error fetching hospital branding:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  updateBranding: async (tenantId: string, updates: Partial<HospitalBranding>) => {
    try {
      const res = await fetch(`/api/hospital/${tenantId}/branding`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        const data = await res.json();
        set({ branding: data.tenant, lastUpdated: Date.now() });
      }
    } catch (error) {
      console.error("Error updating hospital branding:", error);
      throw error;
    }
  },
}));

/**
 * Hook to sync hospital branding across dashboard
 * Apply logo, colors, and name to UI in real-time
 */
export function useHospitalBranding(tenantId?: string) {
  const { branding, isLoading, fetchBranding, updateBranding } = useHospitalBrandingStore();

  useEffect(() => {
    if (tenantId) {
      fetchBranding(tenantId);

      // Poll for updates every 60 seconds
      const interval = setInterval(() => {
        fetchBranding(tenantId);
      }, 60000);

      return () => clearInterval(interval);
    }
  }, [tenantId, fetchBranding]);

  // Apply branding to DOM
  useEffect(() => {
    if (!branding) return;

    // Update favicon
    if (branding.faviconUrl) {
      let favicon = document.querySelector("link[rel='icon']") as HTMLLinkElement;
      if (!favicon) {
        favicon = document.createElement("link");
        favicon.rel = "icon";
        document.head.appendChild(favicon);
      }
      favicon.href = branding.faviconUrl;
    }

    // Update primary color in CSS variables
    const root = document.documentElement;
    if (branding.primaryColor) {
      root.style.setProperty("--color-primary", branding.primaryColor);
    }
    if (branding.accentColor) {
      root.style.setProperty("--color-accent", branding.accentColor);
    }

    // Update page title
    document.title = `${branding.name} - Healthcare Dashboard`;
  }, [branding]);

  return { branding, isLoading, updateBranding };
}

/**
 * Hook to listen for real-time branding updates
 * Useful for WebSocket/SSE broadcast updates
 */
export function useHospitalBrandingListener(tenantId?: string) {
  const { setBranding, fetchBranding } = useHospitalBrandingStore();

  useEffect(() => {
    if (!tenantId) return;

    // TODO: Connect to WebSocket or SSE
    // For now, just re-fetch periodically
    const checkForUpdates = async () => {
      try {
        const res = await fetch(`/api/hospital/${tenantId}/branding`);
        if (res.ok) {
          const data = await res.json();
          setBranding(data);
        }
      } catch (error) {
        console.error("Error checking for branding updates:", error);
      }
    };

    // Check for updates every 30 seconds
    const interval = setInterval(checkForUpdates, 30000);
    return () => clearInterval(interval);
  }, [tenantId, setBranding]);
}

