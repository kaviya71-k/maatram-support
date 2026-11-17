'use client';
import Link from 'next/link';
import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import useProfile from '../../../components/useProfile';
import { CATEGORIES, PRIORITIES } from '../../../lib/constants';

function guessCategory(text) {
  const t = text.toLowerCase();
  if (/scholarship|fee|fees|fund/.test(t)) return 'Scholarship';
  if (/admission|document|certificate|enrol/.test(t)) return 'Admission';
  if (/event|session|workshop|webinar|programme|program/.test(t)) return 'Events';
  if (/mentor|guidance|career/.test(t)) return 'Mentoring';
  if (/login|password|portal|website|error|technical/.test(t)) return 'Technical';
  return 'Other';
}

function guessPriority(text) {
  return /urgent|asap|emergency|immediately/i.test(text) ? 'High' : 'Medium';
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') inQ = false;
      else cell += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      cell = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== '')) rows.push(row);
  return rows;
}

async function findStudent(fromEmail, maatramId) {
  if (maatramId && maatramId.trim()) {
    const { data } = await supabase
      .from('profiles')
      .select('id,name,maatram_id')
      .eq('maatram_id', maatramId.trim().toUpperCase())
      .eq('role', 'student')
      .maybeSingle();
    return data;
  }
  const { data } = await supabase.rpc('find_student_by_email', { p_email: fromEmail || '' });
  return data;
}

async function createQuery(profile, studentId, category, priority, description) {
  const { data: q, error } = await supabase
    .from('queries')
    .insert({
      student_id: studentId,
      category,
      channel: 'Email',
      priority,
      description: description.slice(0, 2000),
      visible_to: ['anchor', 'office'],
    })
    .select()
    .single();
  if (error) return error.message;
  await supabase.from('query_history').insert({
    query_id: q.id,
    changed_by: profile.id,
    action: 'Query imported from email',
    note: 'Created by the Office Team from an email',
  });
  return null;
}

export default function AdminTools() {
  const profile = useProfile();
  const [reset, setReset] = useState({ id: '', pw: '' });
  const [resetMsg, setResetMsg] = useState('');
  const [mail, setMail] = useState({ from: '', maatramId: '', subject: '', body: '', category: '', priority: '' });
  const [mailMsg, setMailMsg] = useState('');
  const [csvMsg, setCsvMsg] = useState('');

  async function doReset(e) {
    e.preventDefault();
    setResetMsg('');
    const { data, error } = await supabase.rpc('admin_reset_password', {
      p_maatram_id: reset.id,
      p_new_password: reset.pw,
    });
    setResetMsg(error ? error.message : data);
    if (!error) setReset({ id: '', pw: '' });
  }

  async function importOne(e) {
    e.preventDefault();
    setMailMsg('');
    const student = await findStudent(mail.from, mail.maatramId);
    if (!student) {
      setMailMsg('No student matches that email. Type the student Maatram ID and try again.');
      return;
    }
    const text = mail.subject + ' ' + mail.body;
    const category = mail.category || guessCategory(text);
    const priority = mail.priority || guessPriority(text);
    const err = await createQuery(profile, student.id, category, priority, mail.subject + ': ' + mail.body);
    if (err) setMailMsg(err);
    else {
      setMailMsg(`Query created for ${student.name} (${student.maatram_id}) as ${category}, ${priority}, channel Email. It was assigned by the rules. Open the dashboard to see it.`);
      setMail({ from: '', maatramId: '', subject: '', body: '', category: '', priority: '' });
    }
  }

  async function importCsv(e) {
    const file = e.target.files[0];
    if (!file) return;
    setCsvMsg('Importing...');
    const rows = parseCsv(await file.text());
    if (rows.length < 2) {
      setCsvMsg('The file needs a header row (from,subject,body) and at least one email.');
      return;
    }
    const head = rows[0].map((h) => h.trim().toLowerCase());
    const iFrom = head.indexOf('from');
    const iSub = head.indexOf('subject');
    const iBody = head.indexOf('body');
    const iId = head.indexOf('maatram_id');
    if (iFrom < 0 || iSub < 0 || iBody < 0) {
      setCsvMsg('The header must contain: from, subject, body (and optionally maatram_id).');
      return;
    }
    let ok = 0;
    const skipped = [];
    for (const r of rows.slice(1)) {
      const from = (r[iFrom] || '').trim();
      const subject = (r[iSub] || '').trim();
      const body = (r[iBody] || '').trim();
      const student = await findStudent(from, iId >= 0 ? r[iId] : '');
      if (!student) {
        skipped.push(from || '(no sender)');
        continue;
      }
      const text = subject + ' ' + body;
      const err = await createQuery(profile, student.id, guessCategory(text), guessPriority(text), subject + ': ' + body);
      if (err) skipped.push(from + ' (' + err + ')');
      else ok += 1;
    }
    setCsvMsg(`Imported ${ok} queries. Skipped ${skipped.length}${skipped.length ? ': ' + skipped.join(', ') : ''}.`);
    e.target.value = '';
  }

  if (!profile) return <div className="page"><p>Loading...</p></div>;
  if (profile.role !== 'office') {
    return <div className="page"><h1>Tools</h1><p>This page is only for the Office Team.</p></div>;
  }

  return (
    <div className="page">
      <Link href="/admin">&larr; Back to admin</Link>
      <h1 style={{ marginTop: 14 }}>Office tools</h1>

      <div className="panel" style={{ marginTop: 20 }}>
        <h3>Import a query from an email</h3>
        <p className="small">Paste an email a student sent to the shared inbox. The student is matched by the sender address saved on their account, or by the Maatram ID you type. The category and priority are guessed from the text, and you can override them.</p>
        <form onSubmit={importOne}>
          <label>From (sender email)</label>
          <input style={{ width: '100%', padding: 9, border: '1px solid #999' }} value={mail.from} onChange={(e) => setMail({ ...mail, from: e.target.value })} />
          <label>Or the student's Maatram ID</label>
          <input style={{ width: '100%', padding: 9, border: '1px solid #999' }} value={mail.maatramId} onChange={(e) => setMail({ ...mail, maatramId: e.target.value })} />
          <label>Subject</label>
          <input style={{ width: '100%', padding: 9, border: '1px solid #999' }} value={mail.subject} onChange={(e) => setMail({ ...mail, subject: e.target.value })} required />
          <label>Message</label>
          <textarea rows={4} value={mail.body} onChange={(e) => setMail({ ...mail, body: e.target.value })} required />
          <div className="filters">
            <select value={mail.category} onChange={(e) => setMail({ ...mail, category: e.target.value })}>
              <option value="">Category: auto-detect</option>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <select value={mail.priority} onChange={(e) => setMail({ ...mail, priority: e.target.value })}>
              <option value="">Priority: auto-detect</option>
              {PRIORITIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <button className="btn">Create query</button>
          </div>
        </form>
        {mailMsg && <p className="msg-ok">{mailMsg}</p>}
      </div>

      <div className="panel">
        <h3>Import many emails from a CSV file</h3>
        <p className="small">Export the shared inbox to a CSV file with the columns <b>from, subject, body</b> (and optionally <b>maatram_id</b>), then choose the file. Each row becomes a query with the channel set to Email. Rows with no matching student are skipped and listed.</p>
        <input type="file" accept=".csv" onChange={importCsv} />
        {csvMsg && <p className="msg-ok">{csvMsg}</p>}
      </div>

      <div className="panel">
        <h3>Reset a user's password</h3>
        <p className="small">Use this when a user has no notification email saved. Give them the temporary password and ask them to change it from Settings.</p>
        <form onSubmit={doReset}>
          <div className="filters">
            <input placeholder="Maatram ID" value={reset.id} onChange={(e) => setReset({ ...reset, id: e.target.value })} required />
            <input placeholder="Temporary password (8+ characters)" value={reset.pw} onChange={(e) => setReset({ ...reset, pw: e.target.value })} required />
            <button className="btn">Reset password</button>
          </div>
        </form>
        {resetMsg && <p className="msg-ok">{resetMsg}</p>}
      </div>
    </div>
  );
}