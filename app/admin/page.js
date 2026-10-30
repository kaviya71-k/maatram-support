'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import useProfile from '../../components/useProfile';
import { ROLE_LABEL } from '../../lib/constants'; import { COLLEGES } from '../../lib/colleges';

export default function Admin() {
  const profile = useProfile();
  const [cats, setCats] = useState([]);
  const [rules, setRules] = useState([]);
  const [users, setUsers] = useState([]);
  const [newCat, setNewCat] = useState('');
  const [rule, setRule] = useState({ category: '', college: '', assign_role: 'anchor' });
  const [nudge, setNudge] = useState(24);
  const [esc, setEsc] = useState(48);
  const [result, setResult] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const { data: c } = await supabase.from('categories').select('*').order('name');
    setCats(c || []);
    const { data: r } = await supabase.from('assignment_rules').select('*').order('created_at');
    setRules(r || []);
    const { data: u } = await supabase.from('profiles').select('*').order('name');
    setUsers(u || []);
  }, []);

  useEffect(() => {
    if (profile && profile.role === 'office') load();
  }, [profile, load]);

  async function addCat() {
    if (!newCat.trim()) return;
    const { error } = await supabase.from('categories').insert({ name: newCat.trim() });
    setMsg(error ? error.message : '');
    setNewCat('');
    load();
  }

  async function delCat(name) {
    await supabase.from('categories').delete().eq('name', name);
    load();
  }

  async function addRule() {
    const { error } = await supabase.from('assignment_rules').insert({
      category: rule.category || null,
      college: rule.college.trim() || null,
      assign_role: rule.assign_role,
    });
    setMsg(error ? error.message : '');
    load();
  }

  async function delRule(id) {
    await supabase.from('assignment_rules').delete().eq('id', id);
    load();
  }

  async function changeRole(id, role) {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', id);
    setMsg(error ? error.message : '');
    load();
  }

  async function runNow() {
    setResult('Running...');
    const { data, error } = await supabase.rpc('run_reminders', {
      nudge_hours: Number(nudge),
      escalate_hours: Number(esc),
    });
    setResult(error ? error.message : data);
  }

  async function downloadCsv() {
    const { data } = await supabase
      .from('queries')
      .select('*, student:profiles!student_id(name,maatram_id,college), assignee:profiles!assigned_to(name)')
      .order('created_at', { ascending: false });
    const rows = [['Student', 'Maatram ID', 'College', 'Category', 'Channel', 'Priority', 'Status', 'Assigned to', 'Created', 'Last update']];
    (data || []).forEach((q) =>
      rows.push([
        q.student?.name, q.student?.maatram_id, q.student?.college, q.category, q.channel,
        q.priority, q.status, q.assignee?.name, q.created_at, q.updated_at,
      ])
    );
    const csv = rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'maatram-queries-report.csv';
    a.click();
  }

  if (!profile) return <div className="page"><p>Loading...</p></div>;
  if (profile.role !== 'office') {
    return <div className="page"><h1>Admin</h1><p>This page is only for the Office Team.</p></div>;
  }

  return (
    <div className="page">
      <h1>Admin console</h1>
      <p className="small">Categories, assignment rules, users, reminders and reports.</p>
      {msg && <p className="msg-error">{msg}</p>}

      <div className="panel" style={{ marginTop: 20 }}>
        <h3>Reminders and escalation</h3>
        <p className="small">Runs automatically every hour. Use this button to run it now (set both to 0 to test).</p>
        <div className="filters">
          <label className="small">Nudge after (hours)</label>
          <input type="number" min="0" value={nudge} onChange={(e) => setNudge(e.target.value)} />
          <label className="small">Escalate after (hours)</label>
          <input type="number" min="0" value={esc} onChange={(e) => setEsc(e.target.value)} />
          <button className="btn" onClick={runNow}>Run reminders now</button>
        </div>
        {result && <p><b>{result}</b></p>}
      </div>

      <div className="panel">
        <h3>Categories</h3>
        <div className="filters">
          {cats.map((c) => (
            <span key={c.name} className="badge">
              {c.name} <a style={{ cursor: 'pointer' }} onClick={() => delCat(c.name)}>x</a>
            </span>
          ))}
        </div>
        <div className="filters">
          <input placeholder="New category" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
          <button className="btn" onClick={addCat}>Add</button>
        </div>
      </div>

      <div className="panel">
        <h3>Assignment rules</h3>
        <p className="small">The most specific matching rule wins. Within a role, the person with the fewest open queries (preferring the same college) gets it.</p>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Category</th><th>College</th><th>Assign to</th><th></th></tr></thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id}>
                  <td>{r.category || 'Any'}</td>
                  <td>{r.college || 'Any'}</td>
                  <td>{ROLE_LABEL[r.assign_role]}</td>
                  <td><a style={{ cursor: 'pointer' }} onClick={() => delRule(r.id)}>Delete</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="filters">
          <select value={rule.category} onChange={(e) => setRule({ ...rule, category: e.target.value })}>
            <option value="">Any category</option>
            {cats.map((c) => <option key={c.name}>{c.name}</option>)}
          </select>
          <select value={rule.college} onChange={(e) => setRule({ ...rule, college: e.target.value })}><option value="">Any college</option>{COLLEGES.map((c) => <option key={c} value={c}>{c}</option>)}</select>
          <select value={rule.assign_role} onChange={(e) => setRule({ ...rule, assign_role: e.target.value })}>
            <option value="anchor">Anchor</option>
            <option value="mentor">Mentor</option>
            <option value="zone">Zone In-charge</option>
            <option value="office">Office Team</option>
          </select>
          <button className="btn" onClick={addRule}>Add rule</button>
        </div>
      </div>

      <div className="panel">
        <h3>Users ({users.length})</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Maatram ID</th><th>College</th><th>Zone</th><th>Role</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.maatram_id}</td>
                  <td>{u.college || '-'}</td>
                  <td>{u.zone || '-'}</td>
                  <td>
                    <select value={u.role} onChange={(e) => changeRole(u.id, e.target.value)}>
                      <option value="student">Student</option>
                      <option value="anchor">Anchor</option>
                      <option value="mentor">Mentor</option>
                      <option value="zone">Zone In-charge</option>
                      <option value="office">Office Team</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <h3>Reports</h3>
        <button className="btn" onClick={downloadCsv}>Download all queries (CSV)</button>
      </div>
    </div>
  );
}