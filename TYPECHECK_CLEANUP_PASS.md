# Type-Check Cleanup Pass

Status: scheduled as a release blocker before strict production shipping.

Last run:

```bash
npm run type-check -- --pretty false
```

Current result: failing with 270 TypeScript errors after the first safe cleanup pass.

## Scope

The production build currently passes because Next.js type validation is skipped in `next.config.mjs`. This cleanup pass is complete only when:

- `npm run type-check` exits with code 0.
- `next.config.mjs` no longer sets `typescript.ignoreBuildErrors = true`.
- `npm run build` passes with TypeScript validation enabled.
- Existing deploy gates still pass: `npx eslint . --quiet`, `npm run test:accountant`, and `npm audit --audit-level=high`.

## Priority Order

1. Drizzle query-builder typing fixes.

   Repeated failures come from assigning a Drizzle select builder to a variable and then conditionally replacing it with `.where(...)`, `.orderBy(...)`, or `.limit(...)`. Fix by collecting SQL conditions in arrays and applying them once, or by using dynamic builders where appropriate.

   Highest-impact files:
   - `app/api/analytics/route.ts`
   - `app/api/billing/route.ts`
   - `app/api/inventory/route.ts`
   - `app/api/lab-orders/route.ts`
   - `lib/services/audit.service.ts`
   - `lib/services/role.service.ts`
   - `lib/services/user.service.ts`

2. Auth/session shape alignment.

   Several APIs assume `session.user.tenantId` or `session.user.role`, but the Better Auth session type only exposes the core user fields. Fix with a shared helper that resolves the app user profile from `users` by session email/id, then use that helper consistently.

   Highest-impact files:
   - `app/api/appointments/route.ts`
   - `app/api/lab/results/route.ts`
   - `app/api/lab/results/[id]/route.ts`
   - `app/api/messaging-settings/route.ts`
   - `lib/tenant-messaging-auth.ts`

3. Guardian portal data model cleanup.

   `lib/guardian-portal/data.ts` is the largest single error source. Fix nullability, relation typing, and object spread assumptions there before touching smaller guardian routes.

   Highest-impact files:
   - `lib/guardian-portal/data.ts`
   - `app/api/guardian/appointments/route.ts`
   - `app/api/guardian/appointments/stats/route.ts`
   - `app/api/guardian/children/stats/route.ts`
   - `app/api/guardian/dashboard/route.ts`

4. Notification and activity logging cleanup.

   These errors are mostly nullable relation assumptions, incorrectly typed Drizzle callbacks, and `never` relation inference.

   Highest-impact files:
   - `lib/notification-service.ts`
   - `lib/services/notification.service.ts`
   - `hooks/useActivityLogging.ts`
   - `components/NotificationDialog.tsx`

5. Dashboard/component cleanup.

   Clean remaining UI and tenant dashboard mismatches after the backend models are fixed, so components can use the corrected response types.

   Highest-impact files:
   - `components/settings/UserSettingsWorkspace.tsx`
   - `app/tenant/[slug]/accountant/finance/page.tsx`
   - `app/tenant/[slug]/pharmacist-dashboard.tsx`
   - `app/tenant/[slug]/notifications/page.tsx`
   - `app/tenant/[slug]/pharmacy/settings/page.tsx`

## Already Completed In This Pass

- Added missing `success` and `warning` badge variants used by dashboards.
- Widened tenant preference, notification, security, workflow, and user settings types so normalized persisted settings are type-valid.
- Fixed profile settings toggle props.
- Fixed tenant usage `slug` typing.
- Fixed hospital workflow backup-frequency typing.
- Removed duplicate `ipAddress` update in fingerprinting.
- Fixed global analytics revenue alias.
- Removed invalid typed Sentry `webpack` init options.
- Switched generated Supabase client env access from Vite `import.meta.env` to Next public env variables.

## Exit Criteria

Do not mark the release as strict production-ready until this sequence passes:

```bash
npm run type-check
npm run build
npx eslint . --quiet
npm run test:accountant
npm audit --audit-level=high
```
