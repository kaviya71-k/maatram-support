'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { COLLEGES, ZONES } from '../../lib/colleges';

export default function Signup() {
  const router = useRouter();
  const [f, setF] = useState({
    name: '', maatramId: '', email: '', password: '', confirm: '',
    college: '', otherCollege: '', zone: '', year: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const [zoneMap, setZoneMap] = useState({});
  useEffect(() => {
    supabase.from('college_zones').select('college,zone').then(({ data }) => {
      const m = {};
      (data || []).forEach((r) => { m[r.college] = r.zone; });
      setZoneMap(m);
    });
  }, []);
  const pickCollege = (e) => {
    const c = e.target.value;
    setF({ ...f, college: c, zone: zoneMap[c] || f.zone });
  };

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
    if (!college || !f.zone || !f.year) {
      setError('Please choose your college, zone and year of study.');
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
      role: 'student',
      college,
      zone: f.zone,
      year: Number(f.year),
    });
    if (profErr) {
      setError(profErr.message);
      setLoading(false);
      return;
    }

    await supabase.from('contacts').upsert({ user_id: user.id, email: f.email.trim() });
    router.push('/dashboard/');
  }

  return (
    <div className="form-box">
      <h1>Student sign up</h1>
      <p className="small" style={{ textAlign: 'center' }}>
        Anchors, mentors, zone in-charges and the office team get their accounts from the Maatram office.
      </p>
      <form onSubmit={handleSubmit}>
        <label>Full name</label>
        <input value={f.name} onChange={set('name')} required />

        <label>Maatram ID</label>
        <input value={f.maatramId} onChange={set('maatramId')} required />

        <label>Email for notifications</label>
        <input type="email" value={f.email} onChange={set('email')} required />
        <p className="small">Only used to send you updates. Nobody else can see it.</p>

        <label>Create a password (at least 8 characters)</label>
        <input type="password" value={f.password} onChange={set('password')} required />

        <label>Confirm password</label>
        <input type="password" value={f.confirm} onChange={set('confirm')} required />

        <label>College</label>
        <select value={f.college} onChange={pickCollege}>
          <option value="">Select your college</option>
          {COLLEGES.map((c) => <option key={c} value={c}>{c}</option>)}
          
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

        <label>Year of study</label>
        <select value={f.year} onChange={set('year')}>
          <option value="">Select year</option>
          <option value="1">1st year</option>
          <option value="2">2nd year</option>
          <option value="3">3rd year</option>
          <option value="4">4th year</option>
        </select>

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