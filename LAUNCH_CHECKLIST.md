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
- [ ] **Polar sandbox credentials** (PRIMARY payment provider) — `PolarPaymentProvider` (checkout create
  + confirm-via-retrieve + cancel + refund + reconciliation) and the Standard Webhooks handler at
  `web/app/api/payments/polar/webhook/route.ts` are implemented, typechecked, built, and covered by tests
  that mock `fetch` and verify real HMAC signatures — but have never run against a real Polar account.
  Needs a Polar account + sandbox organization access token + webhook signing secret to verify live
  checkout, webhook signature verification, and refunds (see `NEEDS_FROM_OWNER.md`, now 🔴). **Unlike
  Stripe, the Polar sandbox needs no review/approval — it's available immediately on signup.** After
  getting the token, run `pnpm exec tsx tools/polar-setup.ts` (from `web/`) to create the 6 products and
  paste the printed `POLAR_PRODUCT_ID_*` lines into `web/.env`. Production activation (seller review:
  social profile + flow demo) and a production token are separate, later launch items.
- [ ] **Stripe test keys — DORMANT (superseded by Polar).** Kept, not deleted. Stripe requires a US
  business entity the owner doesn't have, so payments moved to Polar (a Merchant of Record that supports
  Korea). `web/lib/payment-stripe.ts`, its webhook route, and its tests remain in place and green, and the
  provider is still auto-selected as a fallback if Polar is unconfigured — so a future US entity could
  revive Stripe with no code archaeology. Not a launch blocker in the Polar world.
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

- [~] **Phase 5 (revised) Polar integration** — implemented: `web/lib/payment-polar.ts`
  (`PolarPaymentProvider`: checkout create/confirm/cancel/refund/reclaimDashboardRefund/reconcile via raw
  `fetch` — no SDK, no new npm dep), Standard Webhooks handler at
  `web/app/api/payments/polar/webhook/route.ts` (`webhook-id`/`webhook-timestamp`/`webhook-signature`
  verified with base64-decoded `whsec_` secret + constant-time compare + 300s timestamp tolerance; handles
  `order.paid`/`checkout.expired`/`order.refunded`), signature verification factored into pure testable
  `web/lib/polar-webhook.ts`, and provider auto-selected over Stripe/stub once `POLAR_ACCESS_TOKEN` +
  `POLAR_WEBHOOK_SECRET` are both set (3-way precedence in `web/lib/services.ts`). Product ids come from
  `POLAR_PRODUCT_ID_*` env vars (bootstrapped by `web/tools/polar-setup.ts`). All green on
  `typecheck`/`test`/`build` with mocked `fetch` + real HMAC signatures — blocked on a real sandbox token
  for live verification (see Owner-blocked above).
- [~] **Phase 5 Stripe integration — DORMANT (superseded by Polar).** `web/lib/payment-stripe.ts` (Checkout
  Session create/confirm/cancel/refund/reconcile) and its webhook handler at
  `web/app/api/payments/stripe/webhook/route.ts` (handles
  `checkout.session.completed`/`async_payment_succeeded`/`expired` + dashboard `charge.refunded`) remain in
  the tree, unchanged and green, as the fallback provider when Polar is unconfigured. Retained for a
  possible future US-entity revival; not deleted.
- [ ] **Production environment variables** — once the owner items above are ready, the production
  env vars (Supabase URL/keys, Anthropic key, payment keys, `CRON_SECRET`, PII encryption key, etc.)
  need to be set on the Vercel project.
- [x] **Rate limiting** — `web/lib/rate-limit.ts` (fixed-window, Supabase-backed with an in-memory
  dev fallback, fail-open on backend errors). Applied to free teaser generation, oracle draws, paid
  reading generation, checkout order creation, referral apply, and compat room create/join. Webhook
  and cron routes are exempt (protected by their own secrets). New migration
  `supabase/migrations/0002_rate_limits.sql` — needs to be run by the owner (see
  `NEEDS_FROM_OWNER.md`, 🔴).
- [~] **Error monitoring / observability** — structured logs + friendly error pages are in place:
  `web/app/error.tsx` / `global-error.tsx` (in-voice, on-brand), `web/instrumentation.ts`
  (`onRequestError`, single grep-able JSON line per request error, funneled through one
  `reportError()` function that's the sole swap-in point for a real sink later), and a money-path
  audit added missing structured-log markers to a couple of previously-silent catches (no behavior
  changes). Choosing an external alerting service (Sentry/PostHog/Datadog/etc.) is still an open
  owner decision — not implemented, and not blocking launch on its own.
- [ ] **Final production `next build` regression** — a full production build regression will be run
  as part of Phase 7 verification. (Do not mark this done until the Phase 7 work-log confirms it
  passed.)

## Notes

- `web/vercel.json` defines the cron jobs (`/api/retention/sweep` daily, `/api/payments/reconcile`
  every 15 min); it lives under `web/` because the Vercel project's Root Directory is `web`.
- The 30-day reading retention window and the "no charge / auto-refund on failed generation"
  behavior described in the legal pages are already implemented (`web/lib/reading-flow.ts`,
  `web/lib/retention.ts`).
