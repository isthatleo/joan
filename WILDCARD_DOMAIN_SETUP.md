# Wildcard Tenant Domain Setup

The app is wildcard-domain ready in code. DNS and SSL still have to be configured in the hosting/domain provider.

## Required Environment

Set these in production:

```env
NEXT_PUBLIC_APP_URL=https://https://joanhealth.tech/
NEXT_PUBLIC_ROOT_DOMAIN=https://joanhealth.tech/
NEXT_PUBLIC_TENANT_DOMAINS=https://joanhealth.tech/
ROOT_DOMAIN=https://joanhealth.tech/
```

`NEXT_PUBLIC_TENANT_DOMAINS` supports comma-separated domains if you operate more than one root domain.

## DNS

Create these DNS records with your DNS provider:

```text
A/CNAME  https://joanhealth.tech/       -> hosting provider target
CNAME    *.https://joanhealth.tech/     -> hosting provider target
```

For Vercel, add both `https://joanhealth.tech/` and `*.https://joanhealth.tech/` to the project domains. Vercel provisions SSL automatically after DNS validates.

For Cloudflare, create `CNAME *` to the hosting target and enable Universal SSL or upload an edge certificate that covers `*.https://joanhealth.tech/`.

## Tenant Slug Behavior

When a tenant is provisioned with slug `asake`, production users access:

```text
https://asake.https://joanhealth.tech//login
```

The app proxy rewrites that internally to:

```text
/tenant/asake/login
```

The URL remains the clean subdomain URL in the browser.

## Staff ID QR Behavior

In production, staff ID QR codes should resolve through the configured domain. If `NEXT_PUBLIC_APP_URL=https://https://joanhealth.tech/`, the QR opens:

```text
https://https://joanhealth.tech//tenant/asake/staff-id/{staffId}
```

If the QR is generated while browsing from `https://asake.https://joanhealth.tech/`, it can also use the tenant subdomain origin.
