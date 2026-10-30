'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function Login() {
  const router = useRouter();
  const [maatramId, setMaatramId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    <div className="form-box">
      <h1>Login</h1>
      <form onSubmit={handleSubmit}>
        <label>Maatram ID</label>
        <input value={maatramId} onChange={(e) => setMaatramId(e.target.value)} required />

        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

        {error && <p className="msg-error">{error}</p>}

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button className="btn" disabled={loading}>
            {loading ? 'Please wait...' : 'Login'}
          </button>
        </div>
      </form>
    </div>
  );
}