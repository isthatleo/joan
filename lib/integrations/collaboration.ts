import { getIntegrationCredentials, listActiveProviders } from "@/lib/integrations/server";

async function postJson(url: string, body: unknown, headers: Record<string, string> = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  return response;
}

export async function sendTenantCollaborationAlert(
  tenantSlugOrId: string,
  message: string,
  options?: { title?: string }
) {
  const activeProviders = await listActiveProviders(tenantSlugOrId);
  const targets = activeProviders.filter((provider) => ["slack", "teams", "discord"].includes(provider));
  const results: Array<{ provider: string; ok: boolean; error?: string }> = [];

  for (const provider of targets) {
    try {
      const creds = (await getIntegrationCredentials(tenantSlugOrId, provider)) || {};
      if (provider === "slack") {
        if (creds.webhookUrl) {
          const response = await postJson(creds.webhookUrl, { text: options?.title ? `*${options.title}*\n${message}` : message });
          results.push({ provider, ok: response.ok, error: response.ok ? undefined : `Slack webhook failed (${response.status})` });
          continue;
        }
      }
      if (provider === "teams" && creds.webhookUrl) {
        const response = await postJson(creds.webhookUrl, { text: options?.title ? `${options.title}\n${message}` : message });
        results.push({ provider, ok: response.ok, error: response.ok ? undefined : `Teams webhook failed (${response.status})` });
        continue;
      }
      if (provider === "discord" && creds.webhookUrl) {
        const response = await postJson(creds.webhookUrl, { content: options?.title ? `**${options.title}**\n${message}` : message });
        results.push({ provider, ok: response.ok, error: response.ok ? undefined : `Discord webhook failed (${response.status})` });
        continue;
      }
      results.push({ provider, ok: false, error: "Provider is missing required webhook credentials" });
    } catch (error: any) {
      results.push({ provider, ok: false, error: error?.message || "Failed to send collaboration alert" });
    }
  }

  return results;
}