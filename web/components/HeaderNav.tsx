'use client';

import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Home', match: (p: string) => p === '/' },
  { href: '/library', label: 'History', match: (p: string) => p.startsWith('/library') },
  { href: '/checkout', label: 'Credits', match: (p: string) => p.startsWith('/checkout') },
];

function linkClass(active: boolean): string {
  return active
    ? 'font-extrabold text-acorn-dark'
    : 'text-bark/70 transition hover:text-acorn';
}

export function HeaderNav({ isLoggedIn }: { isLoggedIn: boolean }) {
  const pathname = usePathname() ?? '/';

  return (
    <nav className="mx-auto flex max-w-2xl items-center gap-4 px-4 py-3 text-sm">
      {LINKS.map((link) => (
        <a key={link.href} href={link.href} className={linkClass(link.match(pathname))}>
          {link.label}
        </a>
      ))}
      {isLoggedIn ? (
        <form action="/api/auth/logout" method="post" className="contents">
          <button type="submit" className="text-bark/70 transition hover:text-acorn">
            Log out
          </button>
        </form>
      ) : (
        <a href="/login" className={linkClass(pathname.startsWith('/login'))}>
          Log in
        </a>
      )}
      <a
        href="/"
        aria-label="Dotori home"
        className="ml-auto flex items-center gap-1.5 font-extrabold text-acorn-dark transition hover:opacity-80"
      >
        <span aria-hidden="true" className="text-lg">🌰</span> Dotori
      </a>
    </nav>
  );
}
