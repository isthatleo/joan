import { useAuthStore } from "@/stores/auth";

export function useCan(permission: string) {
  const permissions = useAuthStore((s) => s.permissions);
  return permissions.has(permission);
}
