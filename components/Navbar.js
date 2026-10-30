'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const base = process.env.NEXT_PUBLIC_BASE_PATH || '';

export default function Navbar() {
  const path = (usePathname() || '/').replace(/\/$/, '') || '/';
  const links = [
    { href: '/', label: 'Home' },
    { href: '/login', label: 'Login' },
    { href: '/signup', label: 'Sign up' },
  ];
  return (
    <nav className="navbar">
      <Link href="/"><img src={`${base}/logo.png`} alt="Maatram" /></Link>
      <div className="nav-links">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className={path === l.href ? 'active' : ''}>
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}