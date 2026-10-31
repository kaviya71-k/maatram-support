'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { COLLEGES, ZONES } from '../../lib/colleges';

export default function Signup() {
  const router = useRouter();
  const [f, setF] = useState({
    name: '', maatramId: '', email: '', password: '', confirm: '', role: 'student', year: '',
    college: '', otherCollege: '', zone: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const isOffice = f.role === 'office';

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
    const college = f.college === 'Other' ? f.otherCollege.trim() : f.college;
    if (!isOffice && (!college || !f.zone)) {
      setError('Please choose your college and zone.');
      return;
    }

    if ((f.role === 'student' || f.role === 'anchor') && !f.year) { setError('Please choose the year of study.'); return; } setLoading(true);
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
      college: college || null,
      zone: f.zone || null, year: f.year ? Number(f.year) : null,
    });

    if (profErr) {
      setError(profErr.message);
      setLoading(false);
      return;
    }

    if (f.email.trim()) { await supabase.from('contacts').upsert({ user_id: user.id, email: f.email.trim() }); } router.push('/dashboard/');
  }

  return (
    <div className="form-box">
      <h1>Create your account</h1>
      <form onSubmit={handleSubmit}>
        <label>Full name</label>
        <input value={f.name} onChange={set('name')} required />

        <label>Maatram ID</label>
        <input value={f.maatramId} onChange={set('maatramId')} required />

        <label>Email for notifications (optional)</label><input type="email" value={f.email} onChange={set('email')} /><p className="small">Only used to send you reminders. Nobody else can see it.</p><label>Create a password (at least 8 characters)</label>
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

        {!isOffice && (
          <>
            <label>College</label>
            <select value={f.college} onChange={set('college')}>
              <option value="">Select your college</option>
              {COLLEGES.map((c) => <option key={c} value={c}>{c}</option>)}
              <option value="Other">Other</option>
            </select>
            {f.college === 'Other' && (
              <input
                style={{ marginTop: 8 }}
                placeholder="Type your college name"
                value={f.otherCollege}
                onChange={set('otherCollege')}
              />
            )}

            <label>Zone</label>
            <select value={f.zone} onChange={set('zone')}>
              <option value="">Select your zone</option>
              {ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
            </select>
          </>
        )}

        {(f.role === 'student' || f.role === 'anchor') && (
          <>
            <label>{f.role === 'anchor' ? 'Year of students you mentor' : 'Year of study'}</label>
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

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button className="btn" disabled={loading}>
            {loading ? 'Please wait...' : 'Sign up'}
          </button>
        </div>
      </form>
    </div>
  );
}