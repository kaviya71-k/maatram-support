'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';

const STEPS = [
  { title: 'Log a query', text: 'Students record a query in under a minute: category, channel, priority, a short description and an optional attachment. They choose who can see it.' },
  { title: 'Assign and track', text: 'Rules assign each query to the right coordinator. Status stages, notes and a time-stamped history keep everything visible.' },
  { title: 'Follow up', text: 'Reminders, overdue flags and escalation by email make sure nothing stays unanswered. The student is told when it is resolved.' },
];

const ROLES = [
  ['Student', 'Logs queries and tracks them. Sees only their own.'],
  ['Anchor', 'Alumni mentor for one college and year. Works on those students\' queries.'],
  ['Zone In-charge', 'Looks after all the colleges in a zone.'],
  ['Mentor', 'Chief member of a college. Kept informed, and steps in on important queries left unsolved.'],
  ['Office Team', 'Oversees everything. Manages categories, rules, users and reports.'],
];

export default function Home() {
  const router = useRouter();
  const [signedIn, setSignedIn] = useState(false);
  const [maatramId, setMaatramId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const cleanId = maatramId.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const { error: err } = await supabase.auth.signInWithPassword({
      email: `${cleanId}@maatram.app`,
      password,
    });
    if (err) {
      setError('Wrong Maatram ID or password.');
      setLoading(false);
      return;
    }
    router.push('/dashboard/');
  }

  return (
    <>
      <section className="hero" style={{ padding: '56px 40px' }}>
        <div className="hero-split">
          <div>
            <div className="eyebrow">Maatram Foundation</div>
            <h1>Student Support and Follow-up System</h1>
            <p>
              One place to log every student query, assign it to the right coordinator, track it until it is
              resolved, and follow up on time.
            </p>
            <p className="small" style={{ color: '#222' }}>Maatram HackForge 2026-27, problem MH26-04.</p>
          </div>

          <div className="form-box">
            {signedIn ? (
              <>
                <h1>Welcome back</h1>
                <p style={{ textAlign: 'center', marginBottom: 20 }}>You are logged in.</p>
                <div style={{ textAlign: 'center' }}>
                  <Link href="/dashboard" className="btn">Go to dashboard</Link>
                </div>
              </>
            ) : (
              <>
                <h1>Login</h1>
                <form onSubmit={handleSubmit}>
                  <label>Maatram ID</label>
                  <input value={maatramId} onChange={(e) => setMaatramId(e.target.value)} required />
                  <label>Password</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  {error && <p className="msg-error">{error}</p>}
                  <div style={{ textAlign: 'center', marginTop: 20 }}>
                    <button className="btn" disabled={loading}>{loading ? 'Please wait...' : 'Login'}</button>
                  </div>
                </form>
                <p className="small" style={{ textAlign: 'center', marginTop: 14 }}>
                  <Link href="/forgot-password">Forgot password?</Link>
                </p>
                <p style={{ textAlign: 'center', marginTop: 6 }}>
                  New student? <Link href="/signup"><b>Sign up</b></Link>
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="section">
        <h2>How it works</h2>
        <div className="grid">
          {STEPS.map((s, i) => (
            <div className="card" key={s.title}>
              <h3>{i + 1}. {s.title}</h3>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section dark">
        <h2>Who uses it</h2>
        <div className="role-grid">
          {ROLES.map(([name, text]) => (
            <div className="card" key={name}>
              <h3>{name}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', marginTop: 28 }}>
          <Link href="/about" className="btn gold">See how it meets the problem statement</Link>
        </p>
      </section>
    </>
  );
}