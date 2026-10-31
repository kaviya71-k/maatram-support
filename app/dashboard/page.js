'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../../lib/supabase';
import useProfile from '../../components/useProfile';
import { CATEGORIES, STATUSES, ROLE_LABEL, OVERDUE_HOURS } from '../../lib/constants';

const isOpen = (q) => !['Resolved', 'Closed'].includes(q.status);
const isOverdue = (q) =>
  isOpen(q) && Date.now() - new Date(q.updated_at).getTime() > OVERDUE_HOURS * 3600 * 1000;

function countBy(arr, fn) {
  const m = {};
  arr.forEach((x) => {
    const k = fn(x);
    m[k] = (m[k] || 0) + 1;
  });
  return Object.entries(m).map(([name, count]) => ({ name, count }));
}

export default function Dashboard() {
  const profile = useProfile();
  const [queries, setQueries] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [assigned, setAssigned] = useState('all');
  const [from, setFrom] = useState('');

  useEffect(() => {
    if (!profile) return;
    async function load() {
      const { data } = await supabase
        .from('queries')
        .select('*, student:profiles!student_id(name,maatram_id,college), assignee:profiles!assigned_to(name)')
        .order('created_at', { ascending: false });
      setQueries(data || []);
      const { data: n } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false });
      setNotes(n || []);
      setLoaded(true);
    }
    load();
  }, [profile]);

  const filtered = useMemo(
    () =>
      queries.filter((q) => {
        const text = `${q.student?.name || ''} ${q.student?.maatram_id || ''} ${q.description}`.toLowerCase();
        if (search && !text.includes(search.toLowerCase())) return false;
        if (status && q.status !== status) return false;
        if (category && q.category !== category) return false;
        if (assigned === 'mine' && q.assigned_to !== profile?.id) return false;
        if (assigned === 'unassigned' && q.assigned_to) return false;
        if (from && new Date(q.created_at) < new Date(from)) return false;
        return true;
      }),
    [queries, search, status, category, assigned, from, profile]
  );

  async function markRead() {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile.id);
    setNotes([]);
  }

  if (!profile) return <div className="page"><p>Loading...</p></div>;

  const isStaff = profile.role !== 'student';
  const open = queries.filter(isOpen);
  const overdue = queries.filter(isOverdue);
  const done = queries.filter((q) => !isOpen(q));
  const avg = done.length
    ? (done.reduce((s, q) => s + (new Date(q.updated_at) - new Date(q.created_at)), 0) / done.length / 3600000).toFixed(1)
    : '-';
  const byCategory = countBy(queries, (q) => q.category);
  const byCoordinator = countBy(open, (q) => q.assignee?.name || 'Unassigned');

  return (
    <div className="page">
      <h1>Welcome, {profile.name}</h1><p className="small"><Link href="/settings">Notification email settings</Link></p>
      <p className="small">
        <span className="badge">{ROLE_LABEL[profile.role]}</span> {profile.maatram_id}
        {profile.college ? ` - ${profile.college}` : ''}
        {profile.zone ? ` - ${profile.zone}` : ''}
      </p>

      {notes.length > 0 && (
        <div style={{ margin: '20px 0' }}>
          {notes.map((n) => <div className="notice" key={n.id}>{n.message}</div>)}
          <button className="btn" onClick={markRead}>Mark all read</button>
        </div>
      )}

      {!isStaff && (
        <div style={{ margin: '20px 0' }}>
          <Link href="/query/new" className="btn">Log a new query</Link>
        </div>
      )}

      {isStaff && (
        <>
          <div className="stats">
            <div className="stat"><b>{open.length}</b>Open queries</div>
            <div className="stat"><b>{overdue.length}</b>Overdue (no update in {OVERDUE_HOURS}h)</div>
            <div className="stat"><b>{done.length}</b>Resolved / closed</div>
            <div className="stat"><b>{avg}</b>Avg hours to resolve</div>
          </div>

          <div className="grid" style={{ marginBottom: 30 }}>
            <div className="card">
              <h3>Top categories</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={byCategory}>
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#f0b90b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <h3>Open queries per coordinator</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={byCoordinator}>
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#000000" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      <h2 style={{ fontWeight: 400 }}>{isStaff ? 'Queries' : 'My queries'}</h2>

      <div className="filters">
        <input placeholder="Search student, ID or text" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        {isStaff && (
          <select value={assigned} onChange={(e) => setAssigned(e.target.value)}>
            <option value="all">All coordinators</option>
            <option value="mine">Assigned to me</option>
            <option value="unassigned">Unassigned</option>
          </select>
        )}
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} title="Created from" />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Student</th><th>Category</th><th>Priority</th><th>Status</th>
              <th>Assigned to</th><th>Created</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((q) => (
              <tr key={q.id}>
                <td>{q.student?.name} <span className="small">({q.student?.maatram_id})</span></td>
                <td>{q.category}</td>
                <td>{q.is_emergency ? <span className="emergency">EMERGENCY</span> : q.priority}</td>
                <td>
                  <span className="badge">{q.status}</span>
                  {isOverdue(q) && <span className="emergency"> overdue</span>}
                </td>
                <td>{q.assignee?.name || '-'}</td>
                <td>{new Date(q.created_at).toLocaleDateString()}</td>
                <td><Link href={`/query/view?id=${q.id}`}>View</Link></td>
              </tr>
            ))}
            {loaded && filtered.length === 0 && (
              <tr><td colSpan={7}>No queries found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}