/**
 * Hospital Settings Sync Utilities
 * 
 * This module provides utilities to keep hospital settings synchronized
 * across all dashboards, sidebars, and user sessions in real-time.
 */

import { useEffect, useCallback } from 'react';

export interface TenantBrandingUpdate {
  type: 'branding' | 'name' | 'logo' | 'colors' | 'modules' | 'communication';
  tenantId: string;
  data: Record<string, any>;
  timestamp: number;
}

/**
 * Broadcast tenant settings changes to all open tabs/windows
 * Uses BroadcastChannel API for cross-tab communication
 */
export class TenantSettingsBroadcaster {
  private channel: BroadcastChannel;

  constructor(tenantId: string) {
    this.channel = new BroadcastChannel(`hospital_settings_${tenantId}`);
  }

  broadcast(update: TenantBrandingUpdate) {
    this.channel.postMessage(update);
  }

  subscribe(callback: (update: TenantBrandingUpdate) => void) {
    this.channel.onmessage = (event) => {
      callback(event.data);
    };
  }

  close() {
    this.channel.close();
  }
}

/**
 * Hook to broadcast and listen for hospital settings changes
 * Syncs across all open tabs and windows
 */
export function useTenantSettingsSync(tenantId: string, onUpdate?: (update: TenantBrandingUpdate) => void) {
  const broadcaster = useCallback(() => {
    if (typeof window === 'undefined') return null;
    return new TenantSettingsBroadcaster(tenantId);
  }, [tenantId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const bc = broadcaster();
    if (!bc) return;

    if (onUpdate) {
      bc.subscribe(onUpdate);
    }

    return () => bc.close();
  }, [tenantId, broadcaster, onUpdate]);

  const broadcastUpdate = useCallback((update: TenantBrandingUpdate) => {
    const bc = broadcaster();
    if (bc) {
      bc.broadcast(update);
    }
  }, [broadcaster]);

  return { broadcastUpdate };
}

/**
 * Sync hospital name to sidebar logo area
 * Updates in real-time when hospital name changes
 */
export function syncHospitalNameToSidebar(tenantName: string) {
  if (typeof window === 'undefined') return;

  // Update all sidebar hospital name displays
  const nameElements = document.querySelectorAll('[data-hospital-name]');
  nameElements.forEach((el) => {
    el.textContent = tenantName;
  });

  // Update document title
  document.title = `${tenantName} - Dashboard`;
}

/**
 * Sync hospital logo to sidebar
 * Updates logo image when new logo is uploaded
 */
export function syncHospitalLogoToSidebar(logoUrl: string, lightLogoUrl?: string) {
  if (typeof window === 'undefined') return;

  const logoElements = document.querySelectorAll('[data-hospital-logo]');
  logoElements.forEach((el) => {
    if (el instanceof HTMLImageElement) {
      el.src = logoUrl;
      if (lightLogoUrl) {
        el.setAttribute('data-light-logo', lightLogoUrl);
      }
    }
  });
}

/**
 * Sync branding colors to CSS variables
 * Updates theme colors in real-time
 */
export function syncBrandingColors(primaryColor: string, accentColor?: string) {
  if (typeof window === 'undefined') return;

  const root = document.documentElement;
  
  // Convert hex to RGB if needed
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : '249, 115, 22'; // Default orange
  };

  root.style.setProperty('--color-primary', primaryColor);
  root.style.setProperty('--color-primary-rgb', hexToRgb(primaryColor));

  if (accentColor) {
    root.style.setProperty('--color-accent', accentColor);
    root.style.setProperty('--color-accent-rgb', hexToRgb(accentColor));
  }

  // Update Tailwind color utilities (optional)
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    :root {
      --color-primary: ${primaryColor};
      --color-accent: ${accentColor || primaryColor};
    }
    
    .text-primary { color: var(--color-primary); }
    .bg-primary { background-color: var(--color-primary); }
    .border-primary { border-color: var(--color-primary); }
  `;
  document.head.appendChild(styleSheet);
}

/**
 * Sync module visibility
 * Hide/show navigation items based on enabled modules
 */
export function syncModuleVisibility(enabledModules: Record<string, boolean>) {
  if (typeof window === 'undefined') return;

  // Map module names to navigation item identifiers
  const moduleMap: Record<string, string> = {
    appointments: '[data-nav-appointments]',
    pharmacy: '[data-nav-pharmacy]',
    lab: '[data-nav-lab]',
    billing: '[data-nav-billing]',
    inpatient: '[data-nav-inpatient]',
    emergency: '[data-nav-emergency]',
    telemedicine: '[data-nav-telemedicine]',
    insurance: '[data-nav-insurance]',
  };

  Object.entries(moduleMap).forEach(([module, selector]) => {
    const elements = document.querySelectorAll(selector);
    elements.forEach((el) => {
      if (enabledModules[module]) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    });
  });
}

/**
 * Listen for storage changes (for cross-tab sync)
 * Updates settings when changed in another tab
 */
export function listenForStorageChanges(
  tenantId: string,
  callback: (updates: Record<string, any>) => void
) {
  if (typeof window === 'undefined') return;

  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === `hospital_settings_${tenantId}`) {
      try {
        const updates = JSON.parse(e.newValue || '{}');
        callback(updates);
      } catch (error) {
        console.error('Error parsing storage change:', error);
      }
    }
  };

  window.addEventListener('storage', handleStorageChange);

  return () => {
    window.removeEventListener('storage', handleStorageChange);
  };
}

/**
 * Batch update multiple hospital settings
 * Ensures all related updates are synced together
 */
export function batchUpdateHospitalSettings(
  tenantId: string,
  updates: {
    name?: string;
    logoUrl?: string;
    lightLogoUrl?: string;
    primaryColor?: string;
    accentColor?: string;
    modules?: Record<string, boolean>;
  }
) {
  if (typeof window === 'undefined') return;

  if (updates.name) {
    syncHospitalNameToSidebar(updates.name);
  }

  if (updates.logoUrl) {
    syncHospitalLogoToSidebar(updates.logoUrl, updates.lightLogoUrl);
  }

  if (updates.primaryColor || updates.accentColor) {
    syncBrandingColors(updates.primaryColor || '#F97316', updates.accentColor);
  }

  if (updates.modules) {
    syncModuleVisibility(updates.modules);
  }

  // Broadcast to other tabs
  if (typeof BroadcastChannel !== 'undefined') {
    const broadcaster = new TenantSettingsBroadcaster(tenantId);
    broadcaster.broadcast({
      type: 'branding',
      tenantId,
      data: updates,
      timestamp: Date.now(),
    });
    broadcaster.close();
  }

  // Store in localStorage for persistence
  localStorage.setItem(
    `hospital_settings_${tenantId}`,
    JSON.stringify(updates)
  );
}

/**
 * Restore hospital settings from last session
 * Useful for recovering settings after page reload
 */
export function restoreHospitalSettings(tenantId: string) {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(`hospital_settings_${tenantId}`);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error restoring hospital settings:', error);
  }

  return null;
}

/**
 * Clear cached hospital settings
 */
export function clearHospitalSettingsCache(tenantId: string) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`hospital_settings_${tenantId}`);
}

