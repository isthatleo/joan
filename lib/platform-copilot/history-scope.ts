import "server-only";
import { z } from "zod";
import {
  PLATFORM_CHAT_SCOPE_VERSION,
  type PlatformChatSessionScope,
} from "./types";

export const platformChatSessionScopeSchema = z
  .object({
    version: z.literal(PLATFORM_CHAT_SCOPE_VERSION),
    actorId: z.string().min(1),
    access: z.literal("platform"),
    dataLayer: z.literal("platform_operations+read_only_clinical_metadata"),
  })
  .strict();

export function createPlatformChatSessionScope(
  actorId: string
): PlatformChatSessionScope {
  return {
    version: PLATFORM_CHAT_SCOPE_VERSION,
    actorId,
    access: "platform",
    dataLayer: "platform_operations+read_only_clinical_metadata",
  };
}

export function matchesPlatformChatSessionScope(
  claimed: PlatformChatSessionScope | undefined,
  expected: PlatformChatSessionScope
): boolean {
  return Boolean(
    claimed &&
      claimed.version === expected.version &&
      claimed.actorId === expected.actorId &&
      claimed.access === expected.access &&
      claimed.dataLayer === expected.dataLayer
  );
}
