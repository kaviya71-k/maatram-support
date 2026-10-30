import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const PASSWORD = 'Dummy@12345';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pick = (a) => a[Math.floor(Math.random() * a.length)];

const colleges = ['Anna Arts College', 'Sri Vidya Engineering', 'St Mary Science College', 'Greenfield Polytechnic', 'Lakeview Commerce College'];
const zones = ['North Zone', 'South Zone'];
const cats = ['Admission', 'Scholarship', 'Events', 'Mentoring', 'Technical', 'Other'];
const channels = ['WhatsApp', 'Phone call', 'Email', 'Form', 'In person'];
const prios = ['Low', 'Medium', 'High'];
const texts = [
  'Need help with my admission documents.',
  'Scholarship amount not yet received.',
  'Where is the next mentoring session?',
  'Unable to log in to the learning portal.',
  'Fee receipt is missing.',
  'Want to join the upcoming event.',
  'Need a mentor for career guidance.',
  'General question about the programme.',
];

const people = [];
const add = (id, name, role, college, zone) => people.push({ id, name, role, college, zone });
add('DOFFICE01', 'Demo Office 1', 'office', 'Maatram HQ', 'All');
add('DOFFICE02', 'Demo Office 2', 'office', 'Maatram HQ', 'All');
add('DZONE01', 'Demo Zone Incharge 1', 'zone', colleges[0], zones[0]);
add('DZONE02', 'Demo Zone Incharge 2', 'zone', colleges[3], zones[1]);
for (let i = 1; i <= 3; i++) add(`DMENTOR0${i}`, `Demo Mentor ${i}`, 'mentor', colleges[i - 1], zones[i % 2]);
for (let i = 1; i <= 4; i++) add(`DANCHOR0${i}`, `Demo Anchor ${i}`, 'anchor', colleges[(i - 1) % 5], zones[i % 2]);
for (let i = 1; i <= 50; i++) {
  add(`DSTU${String(i).padStart(3, '0')}`, `Demo Student ${i}`, 'student', colleges[i % 5], zones[i % 2]);
}

async function make(p) {
  const c = createClient(url, key, { auth: { persistSession: false } });
  for (let attempt = 0; attempt < 6; attempt++) {
    const { data, error } = await c.auth.signUp({ email: `${p.id.toLowerCase()}@maatram.app`, password: PASSWORD });
    if (error) {
      if (/already/i.test(error.message)) { console.log('skip', p.id); return; }
      if (/rate|seconds|too many/i.test(error.message)) { console.log('rate limit, waiting 60s'); await sleep(60000); continue; }
      console.log('error', p.id, error.message);
      return;
    }
    const uid = data.user.id;
    const { error: pe } = await c.from('profiles').insert({
      id: uid, maatram_id: p.id, name: p.name, role: p.role, college: p.college, zone: p.zone,
    });
    if (pe) { console.log('profile error', p.id, pe.message); return; }

    if (p.role === 'student') {
      const count = Math.random() < 0.4 ? 2 : 1;
      for (let n = 0; n < count; n++) {
        const visible = ['anchor', 'mentor', 'zone'].filter(() => Math.random() < 0.6);
        if (visible.length === 0) visible.push('anchor');
        visible.push('office');
        const when = new Date(Date.now() - Math.random() * 6 * 24 * 3600 * 1000).toISOString();
        const { data: q, error: qe } = await c.from('queries').insert({
          student_id: uid,
          category: pick(cats),
          channel: pick(channels),
          priority: pick(prios),
          description: pick(texts),
          visible_to: visible,
          created_at: when,
          updated_at: when,
        }).select().single();
        if (qe) { console.log('query error', p.id, qe.message); continue; }
        await c.from('query_history').insert({ query_id: q.id, changed_by: uid, action: 'Query logged' });
      }
    }
    console.log('done', p.id);
    return;
  }
}

for (const p of people) {
  await make(p);
  await sleep(1500);
}

// resolve a few queries so the dashboard has resolve-time data
const o = createClient(url, key, { auth: { persistSession: false } });
const { data: signed, error: se } = await o.auth.signInWithPassword({ email: 'doffice01@maatram.app', password: PASSWORD });
if (!se) {
  const { data } = await o.from('queries').select('id,created_at').eq('status', 'Assigned').limit(15);
  for (const q of data || []) {
    const t = new Date(new Date(q.created_at).getTime() + (2 + Math.random() * 38) * 3600000).toISOString();
    await o.from('queries').update({ status: 'Resolved', updated_at: t }).eq('id', q.id);
    await o.from('query_history').insert({ query_id: q.id, changed_by: signed.user.id, action: 'Status changed to Resolved', note: 'Demo data' });
  }
}
console.log('Seeding finished');