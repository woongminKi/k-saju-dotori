# Dotori — Launch Checklist

Everything remaining before real users can use Dotori in production. Split into items only the
business owner can provide/decide, and items the engineering team still needs to build or verify.

Status legend: `[ ]` open · `[~]` in progress / partially done · `[x]` done

## Owner-blocked

- [ ] **Domain name** — production URL is not finalized. Needs a purchased domain (e.g. `dotori.app`)
  and a decision on the canonical host.
- [ ] **Real business info** — fill in the placeholder fields in `web/lib/business-info.ts`
  (`TODO(needs-owner-creds)`): legal entity name, owner/CEO name, business registration number,
  registered address, and country/jurisdiction. These feed the Terms and Privacy pages.
- [ ] **Support email** — currently the placeholder `support@example.com` in `business-info.ts`.
  Replace with a real, monitored support inbox (referenced by Terms, Privacy, and Refund pages).
- [ ] **Stripe account + live keys** — Phase 5 (real payments) is currently deferred. Needs a Stripe
  account, then test keys for Phase 5 and live keys (after Stripe review/activation) for launch.
- [~] **Google OAuth production client** — the OAuth client was configured directly in the Supabase
  dashboard on 2026-07-11 (per `NEEDS_FROM_OWNER.md`). Final confirmation via a full sign-in
  round-trip test is still pending.
- [ ] **Anthropic API key separation decision** — production currently reuses the Korean sibling
  app's Anthropic key (decision recorded 2026-07-11, used via local `.env` only, not committed).
  Decide whether Dotori should get its own dedicated key before launch. Not yet implemented.
- [ ] **Governing law jurisdiction** — Terms of Service has a placeholder
  `[OWNER: insert governing jurisdiction/state/country and courts]` in the "Governing law" section
  (`web/app/terms/page.tsx`) that the owner must fill in.
- [ ] **Data protection officer / EU representative** — Privacy Policy has a placeholder
  `[OWNER: confirm data protection officer / EU representative contact if required by DPA
  obligations]` (`web/app/privacy/page.tsx`) that the owner must resolve.
- [~] **Vercel production promotion** — a preview deployment exists (project `dotori-web`, team
  `woongmins-projects`, connected to `woongminKi/k-saju-dotori`). Promotion to a production
  deployment has not been decided/done yet.

## Engineering

- [ ] **Phase 5 Stripe integration** — deferred and not started. Payments currently run through a
  stub provider; real Stripe checkout, webhooks, and reconciliation still need to be built.
- [ ] **Production environment variables** — once the owner items above are ready, the production
  env vars (Supabase URL/keys, Anthropic key, payment keys, `CRON_SECRET`, PII encryption key, etc.)
  need to be set on the Vercel project.
- [ ] **Rate limiting** — none currently exists in the codebase. `web/middleware.ts` only handles the
  referral cookie and the Supabase session; there is no request throttling on the API routes or LLM
  endpoints. This is a launch-readiness gap that should be closed before opening to real traffic.
- [ ] **Error monitoring / observability** — nothing like Sentry, PostHog, or Datadog is configured
  (no such dependency in `web/package.json`, no instrumentation in the app). Choosing and wiring up
  an error-monitoring/observability solution is an open decision, not yet implemented.
- [ ] **Final production `next build` regression** — a full production build regression will be run
  as part of Phase 7 verification. (Do not mark this done until the Phase 7 work-log confirms it
  passed.)

## Notes

- `web/vercel.json` defines the cron jobs (`/api/retention/sweep` daily, `/api/payments/reconcile`
  every 15 min); it lives under `web/` because the Vercel project's Root Directory is `web`.
- The 30-day reading retention window and the "no charge / auto-refund on failed generation"
  behavior described in the legal pages are already implemented (`web/lib/reading-flow.ts`,
  `web/lib/retention.ts`).
