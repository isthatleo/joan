"use client";

import { useEffect, useState, type AnchorHTMLAttributes, type ReactNode } from "react";

const FALLBACK_HREF = "/api/public/tenants/default?redirect=1";

type TenantSignInLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  children: ReactNode;
};

/**
 * Marketing sign-in link that resolves the current tenant workspace instead of
 * sending visitors to the removed global /login role grid.
 */
export function TenantSignInLink({ children, ...props }: TenantSignInLinkProps) {
  const [href, setHref] = useState(FALLBACK_HREF);

  useEffect(() => {
    let active = true;

    fetch("/api/public/tenants/default", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { loginUrl?: string } | null) => {
        if (active && data?.loginUrl) setHref(data.loginUrl);
      })
      .catch(() => {
        // Keep the redirect endpoint as a safe fallback.
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <a href={href} {...props}>
      {children}
    </a>
  );
}
