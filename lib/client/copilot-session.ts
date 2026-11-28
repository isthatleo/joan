const COPILOT_SESSION_KEY_PREFIXES = [
  "copilot-chat:",
  "tenant-copilot:",
  "platform-copilot:",
];

/** Removes every browser-tab Copilot conversation on logout or user switch. */
export function clearCopilotSessionChats(): void {
  if (typeof window === "undefined") return;

  try {
    const keys: string[] = [];
    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const key = window.sessionStorage.key(index);
      if (key && COPILOT_SESSION_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        keys.push(key);
      }
    }
    for (const key of keys) window.sessionStorage.removeItem(key);
  } catch {
    // Session storage may be unavailable; nothing else depends on this cleanup.
  }
}
