'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/demo', label: 'Demo' },
  { href: '/lab', label: 'Lab' },
  { href: '/debug', label: 'Debug' },
];

interface PageShellProps {
  children: React.ReactNode;
}

export function PageShell({ children }: PageShellProps) {
  const pathname = usePathname();

  return (
    <div className="page-shell">
      <nav className="page-shell__nav">
        <Link href="/" className="page-shell__brand">
          PlantFlow Twin
        </Link>
        <div className="page-shell__links">
          {NAV_LINKS.map((link) => {
            const isActive =
              link.href === '/'
                ? pathname === '/'
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`page-shell__link${isActive ? ' page-shell__link--active' : ''}`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>
      <main className="page-shell__main">{children}</main>
      <footer className="page-shell__footer">
        PlantFlow Twin — Deterministic DES Engine · v0.2.0
      </footer>
    </div>
  );
}
