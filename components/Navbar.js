'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';

const base = process.env.NEXT_PUBLIC_BASE_PATH || '';

export default function Navbar() {
  const path = (usePathname() || '/').replace(/\/$/, '') || '/';
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);
  const [role, setRole] = useState(null);

  useEffect(() => {
    async function loadRole(session) {
      setLoggedIn(!!session);
      if (!session) {
        setRole(null);
        return;
      }
      const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
      setRole(data ? data.role : null);
    }
    supabase.auth.getSession().then(({ data }) => loadRole(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setTimeout(() => loadRole(session), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    router.push('/login/');
  }

  const links = loggedIn
    ? [
        { href: '/', label: 'Home' },
        { href: '/dashboard', label: 'Dashboard' },
        { href: '/query/new', label: 'Log a query' },
        ...(role === 'office' ? [{ href: '/admin', label: 'Admin' }] : []),
        { href: '/about', label: 'About' },
      ]
    : [
        { href: '/', label: 'Home' },
        { href: '/about', label: 'About' },
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
        {loggedIn && <button onClick={logout}>Logout</button>}
      </div>
    </nav>
  );
}