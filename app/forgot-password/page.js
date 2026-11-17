'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function ForgotPassword() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [maatramId, setMaatramId] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function sendCode(e) {
    e.preventDefault();
    setError('');
    setMsg('');
    setLoading(true);
    const { data, error: err } = await supabase.rpc('request_password_reset', {
      p_maatram_id: maatramId,
      p_email: email,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setMsg(data);
    setStep(2);
  }

  async function reset(e) {
    e.preventDefault();
    setError('');
    setMsg('');
    if (pw.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (pw !== pw2) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    const { data, error: err } = await supabase.rpc('reset_password_with_code', {
      p_maatram_id: maatramId,
      p_code: code,
      p_new_password: pw,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    if (data === 'ok') {
      setMsg('Password changed. Taking you to the login page...');
      setTimeout(() => router.push('/login/'), 1500);
    } else {
      setError(data);
    }
  }

  return (
    <div className="form-box">
      <h1>Forgot password</h1>
      {step === 1 && (
        <form onSubmit={sendCode}>
          <p className="small">Enter your Maatram ID and the notification email saved on your account. We will email you a 6-digit code.</p>
          <label>Maatram ID</label>
          <input value={maatramId} onChange={(e) => setMaatramId(e.target.value)} required />
          <label>Notification email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          {error && <p className="msg-error">{error}</p>}
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <button className="btn" disabled={loading}>{loading ? 'Please wait...' : 'Send code'}</button>
          </div>
          <p className="small" style={{ marginTop: 16, textAlign: 'center' }}>
            No email saved on your account? Ask the Maatram office to reset your password.
          </p>
        </form>
      )}
      {step === 2 && (
        <form onSubmit={reset}>
          {msg && <p className="msg-ok">{msg}</p>}
          <label>6-digit code</label>
          <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6} required />
          <label>New password (at least 8 characters)</label>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} required />
          <label>Confirm new password</label>
          <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} required />
          {error && <p className="msg-error">{error}</p>}
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <button className="btn" disabled={loading}>{loading ? 'Please wait...' : 'Change password'}</button>
          </div>
        </form>
      )}
      <p style={{ marginTop: 16, textAlign: 'center' }}><Link href="/login">Back to login</Link></p>
    </div>
  );
}