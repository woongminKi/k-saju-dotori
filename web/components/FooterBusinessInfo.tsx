'use client';
import { useState } from 'react';
import { BUSINESS_INFO } from '../lib/business-info';

/** Footer "Business information" toggle — the only interactive bit here, so it's split out as a
 *  client component while Footer itself stays a server component. */
export function FooterBusinessInfo() {
  const [open, setOpen] = useState(false);

  return (
    <div className="text-[11px] text-bark/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="footer-business-info"
        className="flex items-center gap-1 text-xs text-bark/60 transition hover:text-acorn"
      >
        Business information <span aria-hidden="true">{open ? '▴' : '▾'}</span>
      </button>
      <div
        id="footer-business-info"
        className={`grid transition-[grid-template-rows] duration-200 ${open ? 'mt-2 grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="space-y-0.5 overflow-hidden">
          <p>{BUSINESS_INFO.name} · Owner {BUSINESS_INFO.ceo}</p>
          <p>Registration no. {BUSINESS_INFO.registrationNumber}</p>
          <p>{BUSINESS_INFO.address}</p>
          <p>{BUSINESS_INFO.country}</p>
          <p>{BUSINESS_INFO.email}</p>
          <p>{BUSINESS_INFO.businessHours}</p>
        </div>
      </div>
    </div>
  );
}
