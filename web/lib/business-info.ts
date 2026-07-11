/**
 * Legal business info required for commerce disclosures. terms/contact/Footer reference this
 * constant as the single source of truth.
 * TODO(needs-owner-creds): every value below is a placeholder. Replace with the real legal
 * entity details (name, jurisdiction, contact, registration) before launch (Phase 7).
 */
export const BUSINESS_INFO = {
  name: 'Dotori', // TODO(needs-owner-creds): real legal/business entity name
  ceo: 'TBD', // TODO(needs-owner-creds): responsible person / owner name
  registrationNumber: 'TBD', // TODO(needs-owner-creds): business registration / company number
  address: 'TBD', // TODO(needs-owner-creds): registered business address
  country: 'TBD', // TODO(needs-owner-creds): jurisdiction (e.g. US, DE)
  email: 'support@example.com', // TODO(needs-owner-creds): real support email
  businessHours: 'Mon–Fri, 9:00–17:00 (excluding weekends and holidays)',
} as const;
