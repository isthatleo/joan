import "server-only";
import OpenAI from "openai";
import { z } from "zod";

export class CopilotConfigurationError extends Error {}
export class CopilotModelError extends Error {}
export class CopilotAllProvidersFailedError extends CopilotModelError {}

export type CopilotProviderName = "openai" | "nvidia" | "openrouter" | "groq";

type CopilotProviderSpec = {
  name: CopilotProviderName;
  apiKeyEnv: string;
  modelEnv: string;
  defaultModel: string;
  baseURL?: string;
  tokenParam: "max_completion_tokens" | "max_tokens";
  defaultHeaders?: Record<string, string>;
};

const PROVIDER_TIMEOUT_MS = 8_000;
const PROVIDER_TOTAL_BUDGET_MS = 25_000;

/**
 * Fixed fallback order. A provider is only accepted when it returns parseable
 * JSON that matches the caller's schema. Keys are read lazily from the server
 * environment on every request; nothing here is exposed to the browser.
 */
const COPILOT_PROVIDERS: CopilotProviderSpec[] = [
  {
    name: "openai",
    apiKeyEnv: "OPENAI_API_KEY",
    modelEnv: "OPENAI_MODEL",
    defaultModel: "gpt-4o-mini",
    tokenParam: "max_completion_tokens",
  },
  {
    name: "nvidia",
    apiKeyEnv: "NVIDIA_API_KEY",
    modelEnv: "NVIDIA_MODEL",
    defaultModel: "nvidia/llama-3.3-nemotron-super-49b-v1",
    baseURL: "https://integrate.api.nvidia.com/v1",
    tokenParam: "max_tokens",
  },
  {
    name: "openrouter",
    apiKeyEnv: "OPENROUTER_API_KEY",
    modelEnv: "OPENROUTER_MODEL",
    defaultModel: "openai/gpt-4o-mini",
    baseURL: "https://openrouter.ai/api/v1",
    tokenParam: "max_tokens",
    defaultHeaders: { "X-Title": "Joan Copilot" },
  },
  {
    name: "groq",
    apiKeyEnv: "GROQ_API_KEY",
    modelEnv: "GROQ_MODEL",
    defaultModel: "llama-3.3-70b-versatile",
    baseURL: "https://api.groq.com/openai/v1",
    tokenParam: "max_tokens",
  },
];

function configuredCopilotProviders(): CopilotProviderSpec[] {
  return COPILOT_PROVIDERS.filter((provider) => Boolean(process.env[provider.apiKeyEnv]));
}

function cleanJson(content: string): string {
  return content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

async function callCopilotProvider(
  spec: CopilotProviderSpec,
  system: string,
  user: string,
  timeoutMs: number
): Promise<unknown> {
  const apiKey = process.env[spec.apiKeyEnv];
  if (!apiKey) {
    throw new CopilotConfigurationError(`${spec.apiKeyEnv} is not configured`);
  }

  const client = new OpenAI({
    apiKey,
    baseURL: spec.baseURL,
    defaultHeaders: spec.defaultHeaders,
    timeout: timeoutMs,
    // Falling through to the next provider is the retry.
    maxRetries: 0,
  });

  const completion = await client.chat.completions.create({
    model: process.env[spec.modelEnv] || spec.defaultModel,
    [spec.tokenParam]: 1600,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  } as any);

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new CopilotModelError(`Empty response from ${spec.name}`);
  }

  try {
    return JSON.parse(cleanJson(raw)) as unknown;
  } catch {
    throw new CopilotModelError(`Invalid JSON from ${spec.name}`);
  }
}

export async function requestJsonWithFallback<T>(
  system: string,
  user: string,
  schema: z.ZodType<T>
): Promise<{ data: T; provider: CopilotProviderName }> {
  const providers = configuredCopilotProviders();
  if (providers.length === 0) {
    throw new CopilotConfigurationError(
      "No Copilot provider is configured. Set OPENAI_API_KEY, NVIDIA_API_KEY, OPENROUTER_API_KEY, or GROQ_API_KEY on the server."
    );
  }

  const startedAt = Date.now();
  const failures: Array<{ provider: CopilotProviderName; message: string }> = [];

  for (const provider of providers) {
    const remaining = PROVIDER_TOTAL_BUDGET_MS - (Date.now() - startedAt);
    if (remaining <= 0) break;

    try {
      const raw = await callCopilotProvider(
        provider,
        system,
        user,
        Math.min(PROVIDER_TIMEOUT_MS, remaining)
      );
      const parsed = schema.safeParse(raw);
      if (!parsed.success) {
        throw new CopilotModelError(`Unexpected response shape from ${provider.name}`);
      }
      return { data: parsed.data, provider: provider.name };
    } catch (error) {
      // Keep provider name and a short error string only. Never log prompts,
      // keys, headers, or model output here.
      failures.push({
        provider: provider.name,
        message: error instanceof Error ? error.message.slice(0, 240) : "Unknown provider error",
      });
    }
  }

  console.warn("[copilot] all configured providers failed", failures);
  throw new CopilotAllProvidersFailedError("All configured Copilot providers failed");
}
