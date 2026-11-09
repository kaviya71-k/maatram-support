'use client';
import Link from 'next/link';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../../lib/supabase';
import useProfile from '../../../components/useProfile';
import { COLLEGES, ZONES } from '../../../lib/colleges';

const EMPTY = { name: '', maatramId: '', email: '', password: '', role: 'anchor', college: '', zone: '', year: '' };

export default function AddStaff() {
  const profile = useProfile();
  const [f, setF] = useState(EMPTY);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMsg('');

    const cleanId = f.maatramId.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!cleanId) { setError('Enter a Maatram ID.'); return; }
    if (f.password.length < 8) { setError('The temporary password must be at least 8 characters.'); return; }
    if (f.role === 'anchor' && (!f.college || !f.year)) { setError('An anchor needs a college and the year of students they mentor.'); return; }
    if (f.role === 'mentor' && (!f.college || !f.zone)) { setError('A mentor needs a college and a zone.'); return; }
    if (f.role === 'zone' && !f.zone) { setError('A zone in-charge needs a zone.'); return; }

    setLoading(true);
    const temp = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    const { data, error: signErr } = await temp.auth.signUp({
      email: `${cleanId}@maatram.app`,
      password: f.password,
    });
    if (signErr || !data.user) {
      setError(signErr ? signErr.message : 'Could not create the login.');
      setLoading(false);
      return;
    }

    const { error: rpcErr } = await supabase.rpc('create_staff', {
      p_id: data.user.id,
      p_maatram_id: f.maatramId.trim(),
      p_name: f.name.trim(),
      p_role: f.role,
      p_college: f.college,
      p_zone: f.zone,
      p_year: f.year ? Number(f.year) : null,
      p_email: f.email.trim(),
    });
    if (rpcErr) {
      setError(rpcErr.message);
      setLoading(false);
      return;
    }

    setMsg(`Account created for ${f.name.trim()} (${f.maatramId.trim().toUpperCase()}). Share the Maatram ID and the temporary password with them.`);
    setF(EMPTY);
    setLoading(false);
  }

  if (!profile) return <div className="page"><p>Loading...</p></div>;
  if (profile.role !== 'office') {
    return <div className="page"><h1>Add staff</h1><p>This page is only for the Office Team.</p></div>;
  }

  return (
    <div className="form-box" style={{ maxWidth: 560 }}>
      <h1>Add a staff account</h1>
      <p className="small" style={{ textAlign: 'center' }}>
        Anchors, mentors, zone in-charges and office team members are created here, not at signup.
      </p>
      <form onSubmit={handleSubmit}>
        <label>Role</label>
        <select value={f.role} onChange={set('role')}>
          <option value="anchor">Anchor (alumni who mentors one year of one college)</option>
          <option value="mentor">Mentor (chief member of a college)</option>
          <option value="zone">Zone In-charge (all colleges in a zone)</option>
          <option value="office">Office Team</option>
        </select>

        <label>Full name</label>
        <input value={f.name} onChange={set('name')} required />

        <label>Maatram ID</label>
        <input value={f.maatramId} onChange={set('maatramId')} required />

        <label>Email for notifications</label>
        <input type="email" value={f.email} onChange={set('email')} />

        <label>Temporary password (they can keep using it, at least 8 characters)</label>
        <input value={f.password} onChange={set('password')} required />

        {(f.role === 'anchor' || f.role === 'mentor') && (
          <>
            <label>College</label>
            <select value={f.college} onChange={set('college')}>
              <option value="">Select college</option>
              {COLLEGES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </>
        )}

        {(f.role === 'mentor' || f.role === 'zone') && (
          <>
            <label>Zone</label>
            <select value={f.zone} onChange={set('zone')}>
              <option value="">Select zone</option>
              {ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
            </select>
          </>
        )}

        {f.role === 'anchor' && (
          <>
            <label>Year of students they mentor</label>
            <select value={f.year} onChange={set('year')}>
              <option value="">Select year</option>
              <option value="1">1st year</option>
              <option value="2">2nd year</option>
              <option value="3">3rd year</option>
              <option value="4">4th year</option>
            </select>
          </>
        )}

        {error && <p className="msg-error">{error}</p>}
        {msg && <p className="msg-ok">{msg}</p>}

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button className="btn" disabled={loading}>{loading ? 'Creating...' : 'Create account'}</button>
        </div>
      </form>
      <p style={{ textAlign: 'center', marginTop: 16 }}><Link href="/admin">Back to admin</Link></p>
    </div>
  );
}