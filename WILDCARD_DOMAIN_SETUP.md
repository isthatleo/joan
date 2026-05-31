# Wildcard Tenant Domain Setup

The app is wildcard-domain ready in code. DNS and SSL still have to be configured in the hosting/domain provider.

## Required Environment

Set these in production:

```env
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_ROOT_DOMAIN=yourdomain.com
NEXT_PUBLIC_TENANT_DOMAINS=yourdomain.com
ROOT_DOMAIN=yourdomain.com
```

`NEXT_PUBLIC_TENANT_DOMAINS` supports comma-separated domains if you operate more than one root domain.

## DNS

Create these DNS records with your DNS provider:

```text
A/CNAME  yourdomain.com       -> hosting provider target
CNAME    *.yourdomain.com     -> hosting provider target
```

For Vercel, add both `yourdomain.com` and `*.yourdomain.com` to the project domains. Vercel provisions SSL automatically after DNS validates.

For Cloudflare, create `CNAME *` to the hosting target and enable Universal SSL or upload an edge certificate that covers `*.yourdomain.com`.

## Tenant Slug Behavior

When a tenant is provisioned with slug `asake`, production users access:

```text
https://asake.yourdomain.com/login
```

The app proxy rewrites that internally to:

```text
/tenant/asake/login
```

The URL remains the clean subdomain URL in the browser.

## Staff ID QR Behavior

In production, staff ID QR codes should resolve through the configured domain. If `NEXT_PUBLIC_APP_URL=https://yourdomain.com`, the QR opens:

```text
https://yourdomain.com/tenant/asake/staff-id/{staffId}
```

If the QR is generated while browsing from `https://asake.yourdomain.com`, it can also use the tenant subdomain origin.
