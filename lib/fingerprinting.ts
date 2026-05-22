import { NextRequest } from "next/server";

export interface DeviceInfo {
  fingerprint: string;
  userAgent: string;
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  deviceType: "mobile" | "tablet" | "desktop";
  deviceBrand?: string;
  screenResolution?: string;
  language?: string;
  timezone?: string;
  isVpn?: boolean;
  isProxy?: boolean;
  isBotOrSpider?: boolean;
}

export interface LocationInfo {
  ipAddress: string;
  country?: string;
  city?: string;
  timezone?: string;
}

// Parse user agent to extract device information
export function parseUserAgent(userAgent: string): Omit<DeviceInfo, "fingerprint"> {
  const ua = userAgent.toLowerCase();

  // Detect browser
  let browser = "Unknown";
  let browserVersion = "Unknown";

  if (ua.includes("chrome") && !ua.includes("chromium")) {
    browser = "Chrome";
    const match = ua.match(/chrome\/([\d.]+)/);
    if (match) browserVersion = match[1];
  } else if (ua.includes("safari") && !ua.includes("chrome")) {
    browser = "Safari";
    const match = ua.match(/version\/([\d.]+)/);
    if (match) browserVersion = match[1];
  } else if (ua.includes("firefox")) {
    browser = "Firefox";
    const match = ua.match(/firefox\/([\d.]+)/);
    if (match) browserVersion = match[1];
  } else if (ua.includes("edg")) {
    browser = "Edge";
    const match = ua.match(/edg\/([\d.]+)/);
    if (match) browserVersion = match[1];
  }

  // Detect OS
  let os = "Unknown";
  let osVersion = "Unknown";

  if (ua.includes("windows")) {
    os = "Windows";
    if (ua.includes("windows nt 10")) osVersion = "10";
    else if (ua.includes("windows nt 6.1")) osVersion = "7";
  } else if (ua.includes("mac os")) {
    os = "macOS";
    const match = ua.match(/mac os x ([\d_]+)/);
    if (match) osVersion = match[1].replace(/_/g, ".");
  } else if (ua.includes("linux")) {
    os = "Linux";
  } else if (ua.includes("iphone")) {
    os = "iOS";
  } else if (ua.includes("android")) {
    os = "Android";
  }

  // Detect device type
  let deviceType: "mobile" | "tablet" | "desktop" = "desktop";
  if (ua.includes("mobile") || ua.includes("iphone") || ua.includes("android")) {
    deviceType = "mobile";
  } else if (ua.includes("tablet") || ua.includes("ipad")) {
    deviceType = "tablet";
  }

  return {
    userAgent,
    browser,
    browserVersion,
    os,
    osVersion,
    deviceType,
  };
}

// Generate fingerprint hash
export async function generateFingerprint(deviceInfo: Partial<DeviceInfo>): Promise<string> {
  const fingerprintData = JSON.stringify({
    ua: deviceInfo.userAgent,
    browser: deviceInfo.browser,
    os: deviceInfo.os,
    deviceType: deviceInfo.deviceType,
    screenRes: deviceInfo.screenResolution,
    language: deviceInfo.language,
    timezone: deviceInfo.timezone,
  });

  if (typeof TextEncoder === "undefined") {
    // Node.js environment
    const crypto = require("crypto");
    return crypto.createHash("sha256").update(fingerprintData).digest("hex");
  } else {
    // Browser environment
    const encoder = new TextEncoder();
    const data = encoder.encode(fingerprintData);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
}

// Extract IP from request
export function getIpAddress(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const clientIp = request.headers.get("x-client-ip");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  return realIp || clientIp || "Unknown";
}

// Check if VPN/Proxy
export async function checkVpnProxy(ipAddress: string): Promise<{ isVpn: boolean; isProxy: boolean }> {
  // This is a placeholder - in production, you'd use a VPN detection service
  // For now, we'll return false for both
  return { isVpn: false, isProxy: false };
}

// Check if bot/spider
export function checkBotOrSpider(userAgent: string): boolean {
  const botPatterns = /bot|spider|crawler|scraper|wget|curl|fetch|api|postman|insomnia/i;
  return botPatterns.test(userAgent);
}

// Get location info from IP (placeholder - use MaxMind GeoIP in production)
export async function getLocationFromIp(ipAddress: string): Promise<LocationInfo> {
  // This is a placeholder implementation
  // In production, use MaxMind GeoIP2, IP2Location, or similar service
  return {
    ipAddress,
    country: "Unknown",
    city: "Unknown",
    timezone: "UTC",
  };
}

// Generate session token
export function generateSessionToken(): string {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    // Browser
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    return Array.from(arr, (byte) => byte.toString(16).padStart(2, "0")).join("");
  } else {
    // Node.js
    const crypto = require("crypto");
    return crypto.randomBytes(32).toString("hex");
  }
}

