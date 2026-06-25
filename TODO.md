# TODO - Better Auth performance & security fixes

- [ ] Step 1: Update `lib/auth.ts`
  - [x] Enable `experimental.joins: true`
  - [x] Enable Secure cookies for HTTPS (conditional)
  - [x] Configure `advanced.ipAddress.ipAddressHeaders` for Vercel
- [ ] Step 2: Update `lib/auth-schema.ts`
  - [x] Add Drizzle `relations()` for `user`, `session`, `account`
- [ ] Step 3: Validate
  - [ ] Run typecheck
  - [ ] Run build
  - [ ] Optional: run smoke test for auth endpoints
