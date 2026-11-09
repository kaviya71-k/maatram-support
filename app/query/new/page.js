'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import useProfile from '../../../components/useProfile';
import { CATEGORIES, CHANNELS, PRIORITIES } from '../../../lib/constants';

const VISIBILITY = [
  { key: 'anchor', label: 'Anchor', help: 'Your alumni mentor for your college and year.' },
  { key: 'mentor', label: 'Mentor', help: 'The chief member of your college.' },
  { key: 'zone', label: 'Zone In-charge', help: 'Head of all the colleges in your zone.' },
  { key: 'office', label: 'Office Team', help: 'Oversees everything. Always included.' },
];

export default function NewQuery() {
  const router = useRouter();
  const profile = useProfile();
  const [cats, setCats] = useState(CATEGORIES);
  const [f, setF] = useState({ category: CATEGORIES[0], channel: 'WhatsApp', priority: 'Medium', description: '' });
  const [visible, setVisible] = useState(['anchor', 'mentor', 'office']);
  const [emergency, setEmergency] = useState(false);
  const [file, setFile] = useState(null);
  const [studentId, setStudentId] = useState('');
  const [student, setStudent] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from('categories').select('name').order('name').then(({ data }) => {
      if (data && data.length) setCats(data.map((c) => c.name));
    });
  }, []);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const toggle = (key) =>
    setVisible(visible.includes(key) ? visible.filter((k) => k !== key) : [...visible, key]);

  async function findStudent() {
    setError('');
    setStudent(null);
    const { data } = await supabase
      .from('profiles')
      .select('id,name,maatram_id,college,zone,year')
      .eq('maatram_id', studentId.trim().toUpperCase())
      .eq('role', 'student')
      .maybeSingle();
    if (!data) setError('No student found with that Maatram ID.');
    else setStudent(data);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const isOffice = profile.role === 'office';
    const target = isOffice ? student : profile;
    if (!target) {
      setError('Find the student first using their Maatram ID.');
      return;
    }
    setLoading(true);

    let attachment_url = null;
    if (file) {
      const path = `${target.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const { error: upErr } = await supabase.storage.from('attachments').upload(path, file);
      if (upErr) {
        setError(upErr.message);
        setLoading(false);
        return;
      }
      attachment_url = supabase.storage.from('attachments').getPublicUrl(path).data.publicUrl;
    }

    const visible_to = Array.from(new Set([...visible, 'office']));
    const { data: q, error: qErr } = await supabase
      .from('queries')
      .insert({
        student_id: target.id,
        category: f.category,
        channel: isOffice ? f.channel : 'Form',
        priority: emergency ? 'Urgent' : f.priority,
        description: f.description.trim(),
        attachment_url,
        visible_to,
        is_emergency: emergency,
      })
      .select()
      .single();

    if (qErr) {
      setError(qErr.message);
      setLoading(false);
      return;
    }

    await supabase.from('query_history').insert({
      query_id: q.id,
      changed_by: profile.id,
      action: 'Query logged',
      note: isOffice ? `Logged by the Office Team on behalf of the student (via ${f.channel})` : (emergency ? 'Marked as emergency' : null),
    });

    if (isOffice) {
      await supabase.from('notifications').insert({
        user_id: target.id,
        query_id: q.id,
        message: 'The Maatram office logged a query for you.',
      });
    }

    if (emergency) {
      const { data: offices } = await supabase.from('profiles').select('id').eq('role', 'office');
      if (offices && offices.length) {
        await supabase.from('notifications').insert(
          offices.map((o) => ({
            user_id: o.id,
            query_id: q.id,
            message: `Emergency query from ${target.name}`,
          }))
        );
      }
    }

    router.push('/dashboard/');
  }

  if (!profile) return <div className="page"><p>Loading...</p></div>;

  const isOffice = profile.role === 'office';
  if (profile.role !== 'student' && !isOffice) {
    return (
      <div className="page">
        <h1>Log a query</h1>
        <p>Students log their own queries. Coordinators work on the queries assigned to them from the dashboard.</p>
      </div>
    );
  }

  return (
    <div className="form-box" style={{ maxWidth: 620 }}>
      <h1>{isOffice ? 'Log a query for a student' : 'Log a query'}</h1>
      <p className="small" style={{ textAlign: 'center' }}>
        {isOffice
          ? 'Use this when a student contacted the office by WhatsApp, phone, email or in person.'
          : 'It takes under a minute. We assign it to the right person automatically.'}
      </p>
      <form onSubmit={handleSubmit}>
        {isOffice && (
          <>
            <label>Student's Maatram ID</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={studentId} onChange={(e) => setStudentId(e.target.value)} />
              <button type="button" className="btn" onClick={findStudent}>Find</button>
            </div>
            {student && (
              <p className="msg-ok">
                {student.name} - {student.college} - {student.zone} - Year {student.year}
              </p>
            )}
            <label>Channel it came through</label>
            <select value={f.channel} onChange={set('channel')}>
              {CHANNELS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </>
        )}

        <label>What is it about?</label>
        <select value={f.category} onChange={set('category')}>
          {cats.map((c) => <option key={c}>{c}</option>)}
        </select>

        <label>Priority</label>
        <select value={f.priority} onChange={set('priority')} disabled={emergency}>
          {PRIORITIES.map((c) => <option key={c}>{c}</option>)}
        </select>

        <label>Describe the query</label>
        <textarea rows={4} value={f.description} onChange={set('description')} required />

        <label>Attachment (screenshot or document, optional)</label>
        <input type="file" onChange={(e) => setFile(e.target.files[0] || null)} />

        <label>Who can see this query?</label>
        {VISIBILITY.map((v) => (
          <div key={v.key} style={{ marginBottom: 8 }}>
            <div className="check">
              <input
                type="checkbox"
                id={v.key}
                checked={v.key === 'office' ? true : visible.includes(v.key)}
                disabled={v.key === 'office'}
                onChange={() => toggle(v.key)}
              />
              <label htmlFor={v.key} style={{ margin: 0 }}><b>{v.label}</b></label>
            </div>
            <div className="small" style={{ marginLeft: 26 }}>{v.help}</div>
          </div>
        ))}

        <div className="check" style={{ marginTop: 14 }}>
          <input type="checkbox" id="emg" checked={emergency} onChange={(e) => setEmergency(e.target.checked)} />
          <label htmlFor="emg" style={{ margin: 0 }}>This is an emergency (goes straight to the Office Team)</label>
        </div>

        {error && <p className="msg-error">{error}</p>}

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button className="btn" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit query'}
          </button>
        </div>
      </form>
    </div>
  );
}