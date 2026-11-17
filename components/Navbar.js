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
  const [hasEmail, setHasEmail] = useState(true);

  useEffect(() => {
    async function load(session) {
      setLoggedIn(!!session);
      if (!session) {
        setRole(null);
        setHasEmail(true);
        return;
      }
      const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
      setRole(data ? data.role : null);
      const { data: c } = await supabase.from('contacts').select('email').eq('user_id', session.user.id).maybeSingle();
      setHasEmail(!!(c && c.email));
    }
    supabase.auth.getSession().then(({ data }) => load(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setTimeout(() => load(session), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    router.push('/');
  }

  const links = loggedIn
    ? [
        { href: '/', label: 'Home' },
        { href: '/dashboard', label: 'Dashboard' },
        { href: '/query/new', label: 'Log a query' },
        ...(role === 'office' ? [{ href: '/analytics', label: 'Analytics' }, { href: '/admin', label: 'Admin' }] : []),
        { href: '/settings', label: 'Settings' },
        { href: '/about', label: 'How it works' },
      ]
    : [
        { href: '/', label: 'Home' },
        { href: '/about', label: 'How it works' },
        { href: '/login', label: 'Login' },
        { href: '/signup', label: 'Student sign up' },
      ];

  return (
    <>
      <nav className="navbar">
        <Link href="/"><img src={`${base}/logo.png`} alt="Maatram Foundation" /></Link>
        <div className="nav-links">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={path === l.href ? 'active' : ''}>{l.label}</Link>
          ))}
          {loggedIn && <button onClick={logout}>Logout</button>}
        </div>
      </nav>
      {loggedIn && !hasEmail && (
        <div className="banner">
          You will not get email updates yet. <Link href="/settings">Add your notification email</Link>
        </div>
      )}
    </>
  );
}