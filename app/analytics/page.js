'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../../lib/supabase';
import useProfile from '../../components/useProfile';

const isOpen = (q) => !['Resolved', 'Closed'].includes(q.status);

function countBy(arr, fn) {
  const m = {};
  arr.forEach((x) => {
    const k = fn(x);
    m[k] = (m[k] || 0) + 1;
  });
  return Object.entries(m).map(([name, count]) => ({ name, count }));
}

const short = (s) => (s.length > 30 ? s.slice(0, 28) + '...' : s);

export default function Analytics() {
  const profile = useProfile();
  const [queries, setQueries] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!profile || profile.role !== 'office') return;
    supabase
      .from('queries')
      .select('*, student:profiles!student_id(name,college,zone), assignee:profiles!assigned_to(name,role)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setQueries(data || []);
        setLoaded(true);
      });
  }, [profile]);

  if (!profile) return <div className="page"><p>Loading...</p></div>;
  if (profile.role !== 'office') {
    return <div className="page"><h1>Analytics</h1><p>This page is only for the Office Team.</p></div>;
  }

  const byZone = countBy(queries, (q) => q.student?.zone || 'No zone').sort((a, b) => a.name.localeCompare(b.name));
  const byCollege = countBy(queries, (q) => short(q.student?.college || 'No college'))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  const byAnchor = countBy(
    queries.filter((q) => q.assignee?.role === 'anchor'),
    (q) => q.assignee.name
  ).sort((a, b) => b.count - a.count);

  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    days.push({
      key: d.toDateString(),
      name: d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
      count: 0,
    });
  }
  queries.forEach((q) => {
    const day = days.find((x) => x.key === new Date(q.created_at).toDateString());
    if (day) day.count += 1;
  });

  const overdue = queries
    .filter(isOpen)
    .sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at))
    .slice(0, 10);

  const categories = Array.from(new Set(queries.map((q) => q.category))).sort();
  const byCategory = categories.map((c) => {
    const all = queries.filter((q) => q.category === c);
    const done = all.filter((q) => !isOpen(q));
    const avg = done.length
      ? (done.reduce((s, q) => s + (new Date(q.updated_at) - new Date(q.created_at)), 0) / done.length / 3600000).toFixed(1)
      : '-';
    return { c, total: all.length, resolved: done.length, avg };
  });

  return (
    <div className="page">
      <Link href="/dashboard">&larr; Back to dashboard</Link>
      <h1 style={{ marginTop: 14 }}>Analytics</h1>
      <p className="small">Office Team only. Based on {queries.length} queries.</p>
      {loaded && queries.length === 0 && <p>No queries yet.</p>}

      <div className="grid" style={{ margin: '24px auto' }}>
        <div className="card">
          <h3>Queries per zone</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={byZone}>
              <XAxis dataKey="name" fontSize={11} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#f0b90b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3>New queries, last 14 days</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={days}>
              <XAxis dataKey="name" fontSize={10} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#000000" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid" style={{ margin: '24px auto' }}>
        <div className="card">
          <h3>Queries per college (top 10)</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart layout="vertical" data={byCollege}>
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={170} fontSize={10} />
              <Tooltip />
              <Bar dataKey="count" fill="#000000" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3>Queries per anchor</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart layout="vertical" data={byAnchor}>
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={170} fontSize={10} />
              <Tooltip />
              <Bar dataKey="count" fill="#f0b90b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="panel">
        <h3>Most overdue open queries</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Student</th><th>Category</th><th>Priority</th><th>Assigned to</th><th>Hours since last update</th><th></th></tr>
            </thead>
            <tbody>
              {overdue.map((q) => (
                <tr key={q.id}>
                  <td>{q.student?.name}</td>
                  <td>{q.category}</td>
                  <td>{q.is_emergency ? 'EMERGENCY' : q.priority}</td>
                  <td>{q.assignee?.name || '-'}</td>
                  <td>{Math.round((Date.now() - new Date(q.updated_at).getTime()) / 3600000)}</td>
                  <td><Link href={`/query/view?id=${q.id}`}>View</Link></td>
                </tr>
              ))}
              {loaded && overdue.length === 0 && <tr><td colSpan={6}>No open queries.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <h3>Resolve time by category</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Category</th><th>Total</th><th>Resolved or closed</th><th>Average hours to resolve</th></tr></thead>
            <tbody>
              {byCategory.map((r) => (
                <tr key={r.c}><td>{r.c}</td><td>{r.total}</td><td>{r.resolved}</td><td>{r.avg}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}