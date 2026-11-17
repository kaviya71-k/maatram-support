'use client';
import Link from 'next/link';
import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import useProfile from '../../../components/useProfile';

export default function ChangePassword() {
  const profile = useProfile();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setMsg('');
    setError('');
    if (pw.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (pw !== pw2) {
      setError('Passwords do not match.');
      return;
    }
    const { error: err } = await supabase.auth.updateUser({ password: pw });
    if (err) setError(err.message);
    else {
      setMsg('Password changed. If you have an email saved, a confirmation is on its way.');
      await supabase.from('notifications').insert({ user_id: profile.id, message: 'Your password was changed. If this was not you, contact the Maatram office.' });
      setPw('');
      setPw2('');
    }
  }

  if (!profile) return <div className="page"><p>Loading...</p></div>;

  return (
    <div className="form-box">
      <h1>Change password</h1>
      <form onSubmit={submit}>
        <label>New password (at least 8 characters)</label>
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} required />
        <label>Confirm new password</label>
        <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} required />
        {error && <p className="msg-error">{error}</p>}
        {msg && <p className="msg-ok">{msg}</p>}
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button className="btn">Change password</button>
        </div>
      </form>
      <p style={{ marginTop: 16, textAlign: 'center' }}><Link href="/settings">Back to settings</Link></p>
    </div>
  );
}