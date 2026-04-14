import React from "react";
import { useCan } from "@/hooks/use-can";

interface CanProps {
  permission: string;
  children: React.ReactNode;
}

export function Can({ permission, children }: CanProps) {
  const allowed = useCan(permission);
  if (!allowed) return null;
  return <>{children}</>;
}
