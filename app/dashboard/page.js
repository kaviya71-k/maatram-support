'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function Dashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login/');
        return;
      }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(data);
    }
    load();
  }, [router]);

  async function logout() {
    await supabase.auth.signOut();
    router.push('/login/');
  }

  if (!profile) return <div className="section"><p>Loading...</p></div>;

  return (
    <section className="section">
      <h2>Welcome, {profile.name}</h2>
      <div className="grid">
        <div className="card">
          <h3>Your account</h3>
          <p>Maatram ID: {profile.maatram_id}</p>
          <p>Role: <span className="badge">{profile.role}</span></p>
          <p>College: {profile.college || '-'}</p>
          <p>Zone: {profile.zone || '-'}</p>
        </div>
      </div>
      <div style={{ textAlign: 'center', marginTop: 30 }}>
        <button className="btn" onClick={logout}>Logout</button>
      </div>
    </section>
  );
}