'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import useProfile from '../../components/useProfile';

export default function Settings() {
  const profile = useProfile();
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profile) return;
    supabase
      .from('contacts')
      .select('email')
      .eq('user_id', profile.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setEmail(data.email);
      });
  }, [profile]);

  async function save(e) {
    e.preventDefault();
    setMsg('');
    setError('');
    const value = email.trim();
    if (!value) {
      await supabase.from('contacts').delete().eq('user_id', profile.id);
      setMsg('Email removed. You will only get in-app notifications.');
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
      setError('Enter a valid email address.');
      return;
    }
    const { error: err } = await supabase.from('contacts').upsert({ user_id: profile.id, email: value });
    if (err) setError(err.message);
    else setMsg('Saved. Updates will now also be emailed to you. Use the test button to check it.');
  }

  async function sendTest() {
    setMsg('');
    setError('');
    const { data, error: err } = await supabase.rpc('send_test_email');
    if (err) setError(err.message);
    else setMsg(data);
  }

  if (!profile) return <div className="page"><p>Loading...</p></div>;

  return (
    <div className="form-box" style={{ maxWidth: 520 }}>
      <h1>Notification email</h1>
      <p className="small">
        Optional. We email you a short notice and a link when something needs your attention.
        The email never contains the query details, and nobody else can see your address.
      </p>
      <form onSubmit={save}>
        <label>Email address</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        {error && <p className="msg-error">{error}</p>}
        {msg && <p className="msg-ok">{msg}</p>}
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button className="btn">Save</button>{' '}
          <button type="button" className="btn gold" onClick={sendTest}>Send me a test email</button>
        </div>
      </form>
      <p style={{ marginTop: 20, textAlign: 'center' }}><Link href="/settings/password">Change password</Link></p>
      <p style={{ textAlign: 'center' }}><Link href="/dashboard">Back to dashboard</Link></p>
    </div>
  );
}