'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../../../lib/supabase';
import useProfile from '../../../components/useProfile';

const stars = (n) => '\u2605'.repeat(n) + '\u2606'.repeat(5 - n);

export default function Ratings() {
  const profile = useProfile();
  const [rows, setRows] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!profile || profile.role !== 'office') return;
    supabase
      .from('feedback')
      .select('*, student:profiles!student_id(name), query:queries!query_id(category, assignee:profiles!assigned_to(name,role))')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setRows(data || []);
        setLoaded(true);
      });
  }, [profile]);

  if (!profile) return <div className="page"><p>Loading...</p></div>;
  if (profile.role !== 'office') {
    return <div className="page"><h1>Ratings</h1><p>This page is only for the Office Team.</p></div>;
  }

  const avg = rows.length ? (rows.reduce((s, r) => s + r.rating, 0) / rows.length).toFixed(2) : '-';
  const dist = [5, 4, 3, 2, 1].map((n) => ({ name: `${n} star`, count: rows.filter((r) => r.rating === n).length }));

  const map = {};
  rows.forEach((r) => {
    const name = (r.query && r.query.assignee && r.query.assignee.name) || 'Unassigned';
    if (!map[name]) map[name] = { name, sum: 0, count: 0 };
    map[name].sum += r.rating;
    map[name].count += 1;
  });
  const byCoordinator = Object.values(map)
    .map((c) => ({ ...c, avg: (c.sum / c.count).toFixed(2) }))
    .sort((a, b) => b.avg - a.avg);

  return (
    <div className="page">
      <Link href="/analytics">&larr; Back to analytics</Link>
      <h1 style={{ marginTop: 14 }}>Student satisfaction</h1>

      <div className="stats">
        <div className="stat"><b>{avg}</b>Average rating (out of 5)</div>
        <div className="stat"><b>{rows.length}</b>Ratings received</div>
      </div>

      <div className="grid" style={{ margin: '24px auto' }}>
        <div className="card">
          <h3>Ratings given</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={dist}>
              <XAxis dataKey="name" fontSize={11} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#f0b90b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="panel">
        <h3>Average rating per coordinator</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Coordinator</th><th>Ratings</th><th>Average</th></tr></thead>
            <tbody>
              {byCoordinator.map((c) => (
                <tr key={c.name}><td>{c.name}</td><td>{c.count}</td><td>{c.avg}</td></tr>
              ))}
              {loaded && byCoordinator.length === 0 && <tr><td colSpan={3}>No ratings yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <h3>Latest comments</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Student</th><th>Category</th><th>Handled by</th><th>Rating</th><th>Comment</th></tr></thead>
            <tbody>
              {rows.slice(0, 10).map((r) => (
                <tr key={r.query_id}>
                  <td>{r.student ? r.student.name : '-'}</td>
                  <td>{r.query ? r.query.category : '-'}</td>
                  <td>{r.query && r.query.assignee ? r.query.assignee.name : '-'}</td>
                  <td style={{ color: '#f0b90b' }}>{stars(r.rating)}</td>
                  <td>{r.comment || '-'}</td>
                </tr>
              ))}
              {loaded && rows.length === 0 && <tr><td colSpan={5}>No ratings yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}