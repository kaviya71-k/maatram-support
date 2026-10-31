'use client';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';
import useProfile from '../../../components/useProfile';
import { STATUSES, ROLE_LABEL } from '../../../lib/constants';

const CHAIN = ['anchor', 'mentor', 'zone', 'office'];

function Detail() {
  const id = useSearchParams().get('id');
  const profile = useProfile();
  const [q, setQ] = useState(null);
  const [history, setHistory] = useState([]);
  const [staff, setStaff] = useState([]);
  const [note, setNote] = useState('');
  const [status, setStatus] = useState('');
  const [assignTo, setAssignTo] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase
      .from('queries')
      .select('*, student:profiles!student_id(name,maatram_id,college,zone,year), assignee:profiles!assigned_to(name,role)')
      .eq('id', id)
      .single();
    setQ(data);
    if (data) setStatus(data.status);
    const { data: h } = await supabase
      .from('query_history')
      .select('*, changer:profiles!changed_by(name,role)')
      .eq('query_id', id)
      .order('created_at', { ascending: true });
    setHistory(h || []);
    const { data: s } = await supabase.from('profiles').select('id,name,role,college,year').neq('role', 'student').order('name');
    setStaff(s || []);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function addHistory(action, text) {
    await supabase.from('query_history').insert({
      query_id: id,
      changed_by: profile.id,
      action,
      note: text || null,
    });
  }

  async function notify(userId, message) {
    if (!userId) return;
    await supabase.from('notifications').insert({ user_id: userId, query_id: id, message });
  }

  async function save(fields, action, text) {
    setBusy(true);
    setMsg('');
    const { data, error } = await supabase
      .from('queries')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();
    if (error || !data || data.length === 0) {
      setMsg(error ? error.message : 'You are not allowed to change this query.');
      setBusy(false);
      return false;
    }
    await addHistory(action, text);
    setNote('');
    await load();
    setBusy(false);
    return true;
  }

  async function changeStatus() {
    const ok = await save({ status }, `Status changed to ${status}`, note);
    if (ok && ['Resolved', 'Closed', 'Waiting for student'].includes(status)) {
      await notify(q.student_id, `Your query is now: ${status}`);
    }
  }

  async function assign() {
    const person = staff.find((s) => s.id === assignTo);
    if (!person) return;
    const visible_to = q.visible_to.includes(person.role) ? q.visible_to : [...q.visible_to, person.role];
    const ok = await save(
      { assigned_to: person.id, visible_to, status: q.status === 'New' ? 'Assigned' : q.status },
      `Assigned to ${person.name}`,
      note
    );
    if (ok) await notify(person.id, 'A query was assigned to you.');
  }

  async function escalate() {
    const next = CHAIN.find((r) => !q.visible_to.includes(r));
    if (!next) {
      setMsg('Already visible to every level.');
      return;
    }
    const ok = await save({ visible_to: [...q.visible_to, next] }, `Escalated to ${ROLE_LABEL[next]}`, note);
    if (ok && next === 'office') {
      for (const o of staff.filter((s) => s.role === 'office')) {
        await notify(o.id, 'A query was escalated to the Office Team.');
      }
    }
  }

  async function reply() {
    if (!note.trim()) return;
    if (q.status === 'Waiting for student') {
      await save({ status: 'In progress' }, 'Student replied', note);
    } else {
      await addHistory('Student replied', note);
      setNote('');
      await load();
    }
    if (q.assigned_to) await notify(q.assigned_to, 'The student replied on a query.');
  }

  if (!id) return <div className="page"><p>No query selected.</p></div>;
  if (!profile || !q) return <div className="page"><p>Loading...</p></div>;

  const isStaff = profile.role !== 'student';

  return (
    <div className="page">
      <Link href="/dashboard">&larr; Back to dashboard</Link>
      <h1 style={{ marginTop: 14 }}>
        {q.category} query {q.is_emergency && <span className="emergency">EMERGENCY</span>}
      </h1>

      <div className="panel">
        <p><b>Student:</b> {q.student?.name} ({q.student?.maatram_id}) - {q.student?.college || '-'}</p>
        <p><b>Channel:</b> {q.channel} &nbsp; <b>Priority:</b> {q.priority} &nbsp; <b>Status:</b> <span className="badge">{q.status}</span></p>
        <p><b>Assigned to:</b> {q.assignee?.name || 'Nobody yet'}</p>
        <p><b>Visible to:</b> {q.visible_to.map((r) => ROLE_LABEL[r]).join(', ')}</p>
        <p style={{ marginTop: 10 }}>{q.description}</p>
        {q.attachment_url && (
          <p style={{ marginTop: 10 }}><a href={q.attachment_url} target="_blank" rel="noreferrer">Open attachment</a></p>
        )}
      </div>

      {isStaff && (
        <div className="panel">
          <h3>Work on this query</h3>
          <label>Note (saved in the history)</label>
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />

          <label>Change status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <button className="btn" disabled={busy} onClick={changeStatus}>Update status</button>

          <hr style={{ margin: '20px 0' }} />
          <label>Assign / reassign to</label>
          <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)}>
            <option value="">Choose a person</option>
            {staff.filter((s) => s.role !== 'anchor' || (s.college === q.student?.college && s.year === q.student?.year)).map((s) => <option key={s.id} value={s.id}>{s.name} ({ROLE_LABEL[s.role]})</option>)}
          </select>
          <button className="btn" disabled={busy || !assignTo} onClick={assign}>Assign</button>

          <hr style={{ margin: '20px 0' }} />
          <button className="btn gold" disabled={busy} onClick={escalate}>Escalate to next level</button>
        </div>
      )}

      {!isStaff && q.status !== 'Closed' && (
        <div className="panel">
          <h3>Add a reply</h3>
          <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          <button className="btn" disabled={busy} onClick={reply}>Send reply</button>
        </div>
      )}

      {msg && <p className="msg-error">{msg}</p>}

      <h3 style={{ marginTop: 20 }}>History</h3>
      <div className="timeline">
        {history.map((h) => (
          <div key={h.id}>
            <b>{h.action}</b>
            <div className="small">
              {h.changer?.name} ({ROLE_LABEL[h.changer?.role] || '-'}) - {new Date(h.created_at).toLocaleString()}
            </div>
            {h.note && <div>{h.note}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function QueryView() {
  return (
    <Suspense fallback={<div className="page"><p>Loading...</p></div>}>
      <Detail />
    </Suspense>
  );
}