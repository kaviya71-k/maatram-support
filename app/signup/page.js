'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function Signup() {
  const router = useRouter();
  const [f, setF] = useState({
    name: '', maatramId: '', password: '', confirm: '', role: 'student', college: '', zone: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (f.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (f.password !== f.confirm) {
      setError('Passwords do not match.');
      return;
    }
    const cleanId = f.maatramId.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!cleanId) {
      setError('Enter a valid Maatram ID.');
      return;
    }

    setLoading(true);
    const { data, error: signErr } = await supabase.auth.signUp({
      email: `${cleanId}@maatram.app`,
      password: f.password,
    });
    if (signErr) {
      setError(signErr.message);
      setLoading(false);
      return;
    }

    const user = data.user;
    if (!user) {
      setError('Signup failed. Please try again.');
      setLoading(false);
      return;
    }

    const { error: profErr } = await supabase.from('profiles').insert({
      id: user.id,
      maatram_id: f.maatramId.trim().toUpperCase(),
      name: f.name.trim(),
      role: f.role,
      college: f.college.trim(),
      zone: f.zone.trim(),
    });

    if (profErr) {
      setError(profErr.message);
      setLoading(false);
      return;
    }

    router.push('/dashboard/');
  }

  return (
    <div className="form-box">
      <h1>Create your account</h1>
      <form onSubmit={handleSubmit}>
        <label>Full name</label>
        <input value={f.name} onChange={set('name')} required />

        <label>Maatram ID</label>
        <input value={f.maatramId} onChange={set('maatramId')} required />

        <label>Create a password (at least 8 characters)</label>
        <input type="password" value={f.password} onChange={set('password')} required />

        <label>Confirm password</label>
        <input type="password" value={f.confirm} onChange={set('confirm')} required />

        <label>I am a</label>
        <select value={f.role} onChange={set('role')}>
          <option value="student">Student</option>
          <option value="anchor">Anchor</option>
          <option value="mentor">Mentor</option>
          <option value="zone">Zone In-charge</option>
          <option value="office">Office Team</option>
        </select>

        <label>College</label>
        <input value={f.college} onChange={set('college')} />

        <label>Zone</label>
        <input value={f.zone} onChange={set('zone')} />

        {error && <p className="msg-error">{error}</p>}

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button className="btn" disabled={loading}>
            {loading ? 'Please wait...' : 'Sign up'}
          </button>
        </div>
      </form>
    </div>
  );
}