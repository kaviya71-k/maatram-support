'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import useProfile from '../../../components/useProfile';
import { CATEGORIES, CHANNELS, PRIORITIES, VISIBILITY } from '../../../lib/constants';

export default function NewQuery() {
  const router = useRouter();
  const profile = useProfile(); const [cats, setCats] = useState(CATEGORIES); useEffect(() => { supabase.from('categories').select('name').order('name').then(({ data }) => { if (data && data.length) setCats(data.map((c) => c.name)); }); }, []);
  const [f, setF] = useState({ category: CATEGORIES[0], channel: 'Form', priority: 'Medium', description: '' });
  const [visible, setVisible] = useState(['anchor', 'mentor', 'office']);
  const [emergency, setEmergency] = useState(false);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const toggle = (key) =>
    setVisible(visible.includes(key) ? visible.filter((k) => k !== key) : [...visible, key]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!profile) return;
    setError('');
    setLoading(true);

    let attachment_url = null;
    if (file) {
      const path = `${profile.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
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
        student_id: profile.id,
        category: f.category,
        channel: f.channel,
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
      note: emergency ? 'Marked as emergency' : null,
    });

    if (emergency) {
      const { data: offices } = await supabase.from('profiles').select('id').eq('role', 'office');
      if (offices && offices.length) {
        await supabase.from('notifications').insert(
          offices.map((o) => ({
            user_id: o.id,
            query_id: q.id,
            message: `Emergency query from ${profile.name}`,
          }))
        );
      }
    }

    router.push('/dashboard/');
  }

  return (
    <div className="form-box" style={{ maxWidth: 600 }}>
      <h1>Log a query</h1>
      <form onSubmit={handleSubmit}>
        <label>Category</label>
        <select value={f.category} onChange={set('category')}>
          {cats.map((c) => <option key={c}>{c}</option>)}
        </select>

        <label>Channel it came through</label>
        <select value={f.channel} onChange={set('channel')}>
          {CHANNELS.map((c) => <option key={c}>{c}</option>)}
        </select>

        <label>Priority</label>
        <select value={f.priority} onChange={set('priority')} disabled={emergency}>
          {PRIORITIES.map((c) => <option key={c}>{c}</option>)}
        </select>

        <label>Description</label>
        <textarea rows={4} value={f.description} onChange={set('description')} required />

        <label>Attachment (screenshot or document, optional)</label>
        <input type="file" onChange={(e) => setFile(e.target.files[0] || null)} />

        <label>Who can see this query?</label>
        {VISIBILITY.map((v) => (
          <div className="check" key={v.key}>
            <input
              type="checkbox"
              id={v.key}
              checked={v.key === 'office' ? true : visible.includes(v.key)}
              disabled={v.key === 'office'}
              onChange={() => toggle(v.key)}
            />
            <label htmlFor={v.key} style={{ margin: 0 }}>{v.label}</label>
          </div>
        ))}
        <p className="small">The Office Team always has oversight of every query.</p>

        <div className="check" style={{ marginTop: 14 }}>
          <input type="checkbox" id="emg" checked={emergency} onChange={(e) => setEmergency(e.target.checked)} />
          <label htmlFor="emg" style={{ margin: 0 }}>This is an emergency (alerts the Office Team)</label>
        </div>

        {error && <p className="msg-error">{error}</p>}

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button className="btn" disabled={loading || !profile}>
            {loading ? 'Submitting...' : 'Submit query'}
          </button>
        </div>
      </form>
    </div>
  );
}