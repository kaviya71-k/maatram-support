'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import useProfile from '../../../components/useProfile';

export default function Replies() {
  const profile = useProfile();
  const [rows, setRows] = useState([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase.from('canned_replies').select('*').order('title');
    setRows(data || []);
  }, []);

  useEffect(() => {
    if (profile && profile.role === 'office') load();
  }, [profile, load]);

  async function add(e) {
    e.preventDefault();
    setMsg('');
    const { error } = await supabase.from('canned_replies').insert({ title: title.trim(), body: body.trim() });
    if (error) {
      setMsg(error.message);
      return;
    }
    setTitle('');
    setBody('');
    load();
  }

  async function del(id) {
    await supabase.from('canned_replies').delete().eq('id', id);
    load();
  }

  if (!profile) return <div className="page"><p>Loading...</p></div>;
  if (profile.role !== 'office') {
    return <div className="page"><h1>Saved replies</h1><p>This page is only for the Office Team.</p></div>;
  }

  return (
    <div className="page">
      <Link href="/admin">&larr; Back to admin</Link>
      <h1 style={{ marginTop: 14 }}>Saved replies</h1>
      <p className="small">Coordinators can insert these into a note with one click.</p>

      <div className="panel" style={{ marginTop: 20 }}>
        <h3>Add a saved reply</h3>
        <form onSubmit={add}>
          <input
            placeholder="Title, for example: Upload your marksheet"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            style={{ width: '100%', padding: 9, border: '1px solid #999', marginBottom: 10 }}
          />
          <textarea rows={3} placeholder="The message the student will see" value={body} onChange={(e) => setBody(e.target.value)} required />
          <button className="btn">Add</button>
        </form>
        {msg && <p className="msg-error">{msg}</p>}
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Title</th><th>Message</th><th></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.title}</td>
                <td>{r.body}</td>
                <td><a style={{ cursor: 'pointer' }} onClick={() => del(r.id)}>Delete</a></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={3}>No saved replies yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}