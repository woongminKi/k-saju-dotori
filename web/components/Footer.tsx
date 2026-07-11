import { BUSINESS_INFO } from '../lib/business-info';
import { FooterBusinessInfo } from './FooterBusinessInfo';

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-line bg-cream">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <FooterBusinessInfo />

        <nav className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-bark/60">
          <a href="/terms" className="transition hover:text-acorn">Terms of Service</a>
          <span aria-hidden="true" className="text-bark/30">·</span>
          <a href="/privacy" className="transition hover:text-acorn">Privacy Policy</a>
          <span aria-hidden="true" className="text-bark/30">·</span>
          <a href="/refund" className="transition hover:text-acorn">Refund Policy</a>
        </nav>

        <p className="mt-3 text-[11px] text-bark/40">
          © {year} {BUSINESS_INFO.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
