'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import useProfile from '../../../components/useProfile';
import { COLLEGES, ZONES } from '../../../lib/colleges';

export default function AdminSettings() {
  const profile = useProfile();
  const [nudge, setNudge] = useState(24);
  const [esc, setEsc] = useState(48);
  const [map, setMap] = useState({});
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const { data: s } = await supabase.from('app_settings').select('*');
    (s || []).forEach((r) => {
      if (r.key === 'nudge_hours') setNudge(r.value);
      if (r.key === 'escalate_hours') setEsc(r.value);
    });
    const { data: z } = await supabase.from('college_zones').select('*');
    const m = {};
    (z || []).forEach((r) => { m[r.college] = r.zone; });
    setMap(m);
  }, []);

  useEffect(() => {
    if (profile && profile.role === 'office') load();
  }, [profile, load]);

  async function saveHours() {
    const { error } = await supabase.from('app_settings').upsert([
      { key: 'nudge_hours', value: Number(nudge) },
      { key: 'escalate_hours', value: Number(esc) },
    ]);
    setMsg(error ? error.message : 'Reminder times saved. The hourly job uses them from now on.');
  }

  async function setZone(college, zone) {
    const m = { ...map };
    if (zone) {
      await supabase.from('college_zones').upsert({ college, zone });
      m[college] = zone;
    } else {
      await supabase.from('college_zones').delete().eq('college', college);
      delete m[college];
    }
    setMap(m);
  }

  if (!profile) return <div className="page"><p>Loading...</p></div>;
  if (profile.role !== 'office') {
    return <div className="page"><h1>Settings</h1><p>This page is only for the Office Team.</p></div>;
  }

  return (
    <div className="page">
      <Link href="/admin">&larr; Back to admin</Link>
      <h1 style={{ marginTop: 14 }}>Settings</h1>

      <div className="panel" style={{ marginTop: 20 }}>
        <h3>Reminder and escalation times</h3>
        <p className="small">Used by the hourly job. A coordinator is nudged after the first time, and an overdue query is escalated one level after the second time.</p>
        <div className="filters">
          <label className="small">Nudge after (hours)</label>
          <input type="number" min="0" value={nudge} onChange={(e) => setNudge(e.target.value)} />
          <label className="small">Escalate after (hours)</label>
          <input type="number" min="0" value={esc} onChange={(e) => setEsc(e.target.value)} />
          <button className="btn" onClick={saveHours}>Save</button>
        </div>
        {msg && <p className="msg-ok">{msg}</p>}
      </div>

      <div className="panel">
        <h3>Which zone each college belongs to ({Object.keys(map).length} of {COLLEGES.length} set)</h3>
        <p className="small">When a student picks their college at signup, the zone is filled in from this table.</p>
        <div className="table-wrap">
          <table>
            <thead><tr><th>College</th><th>Zone</th></tr></thead>
            <tbody>
              {COLLEGES.map((c) => (
                <tr key={c}>
                  <td>{c}</td>
                  <td>
                    <select value={map[c] || ''} onChange={(e) => setZone(c, e.target.value)}>
                      <option value="">Not set</option>
                      {ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}