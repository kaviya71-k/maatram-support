'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CATEGORIES, PRIORITIES } from '../lib/constants';

const when = (d) => new Date(d).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const ago = (d) => {
  const h = (Date.now() - new Date(d).getTime()) / 3600000;
  return h < 48 ? `${Math.max(1, Math.round(h))} hours` : `${Math.round(h / 24)} days`;
};
const isOpenQ = (q) => !['Resolved', 'Closed'].includes(q.status);

function guessCategory(text) {
  const t = text.toLowerCase();
  if (/scholarship|fee|fees|fund/.test(t)) return 'Scholarship';
  if (/admission|document|certificate|enrol|marksheet/.test(t)) return 'Admission';
  if (/event|session|workshop|webinar|programme|program|sangamam/.test(t)) return 'Events';
  if (/mentor|guidance|career/.test(t)) return 'Mentoring';
  if (/login|password|portal|website|error|technical|app/.test(t)) return 'Technical';
  return 'Other';
}

const VIS = [
  { label: 'Anchor + Office', value: ['anchor', 'office'] },
  { label: 'Anchor, Zone In-charge + Office', value: ['anchor', 'zone', 'office'] },
  { label: 'Everyone: Anchor, Zone, Mentor + Office', value: ['anchor', 'zone', 'mentor', 'office'] },
  { label: 'Only the Office Team', value: ['office'] },
];

export default function Assistant() {
  const [profile, setProfile] = useState(null);
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const [quick, setQuick] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const flow = useRef({ step: null, draft: {} });
  const started = useRef(false);
  const endRef = useRef(null);

  useEffect(() => {
    async function load(session) {
      if (!session) {
        setProfile(null);
        setMsgs([]);
        setQuick([]);
        setOpen(false);
        started.current = false;
        flow.current = { step: null, draft: {} };
        return;
      }
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      setProfile(data || null);
    }
    supabase.auth.getSession().then(({ data }) => load(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setTimeout(() => load(s), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (open && profile && !started.current) {
      started.current = true;
      const first = (profile.name || '').split(' ')[0];
      say(`Hello ${first}! I am the Maatram support assistant. Choose an option below, or type your question.`);
      setQuick(menu());
    }
  }, [open, profile]);

  useEffect(() => {
    if (endRef.current) endRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, quick]);

  function say(t, links) {
    setMsgs((m) => [...m, { from: 'bot', text: t, links }]);
  }
  function me(t) {
    setMsgs((m) => [...m, { from: 'me', text: t }]);
  }

  function menu() {
    if (!profile) return [];
    if (profile.role === 'student') {
      return [
        { label: 'My queries', id: 'status' },
        { label: 'Log a query', id: 'log' },
        { label: 'My query is stuck', id: 'stuck' },
        { label: 'How escalation works', id: 'escalation' },
        { label: 'Who can see my query?', id: 'visibility' },
        { label: 'How long will I wait?', id: 'sla' },
        { label: 'Email settings', id: 'email' },
        { label: 'Rate the support', id: 'rate' },
      ];
    }
    return [
      { label: 'My queue', id: 'queue' },
      { label: 'Overdue', id: 'overdue' },
      { label: 'Waiting for student', id: 'waiting' },
      ...(profile.role === 'office' ? [{ label: 'Unassigned', id: 'unassigned' }] : []),
      { label: 'How escalation works', id: 'escalation' },
      { label: 'Open dashboard', id: 'dash' },
    ];
  }

  function intent(t) {
    const s = t.toLowerCase();
    const staff = profile.role !== 'student';
    if (/\b(hi|hello|hey)\b/.test(s)) return 'greet';
    if (/unassigned/.test(s)) return staff ? 'unassigned' : 'status';
    if (/overdue|late/.test(s)) return staff ? 'overdue' : 'stuck';
    if (/waiting/.test(s)) return staff ? 'waiting' : 'status';
    if (/stuck|no reply|no response|delay|not answered|still waiting/.test(s)) return 'stuck';
    if (/status|my quer|track|where is|queue/.test(s)) return staff ? 'queue' : 'status';
    if (/log|raise|new quer|complain|report|submit/.test(s)) return staff ? 'dash' : 'log';
    if (/escalat/.test(s)) return 'escalation';
    if (/who can see|privacy|private|visible/.test(s)) return 'visibility';
    if (/how long|sla|when will|response time/.test(s)) return 'sla';
    if (/email|notification|notify/.test(s)) return 'email';
    if (/password/.test(s)) return 'password';
    if (/rate|rating|feedback|star/.test(s)) return 'rate';
    if (/dashboard/.test(s)) return 'dash';
    return null;
  }

  async function run(item, echo = true) {
    if (echo) me(item.label);
    setBusy(true);
    setQuick([]);
    try {
      switch (item.id) {
        case 'greet':
          say('Hello! What would you like to do?');
          break;
        case 'status':
          await showStatus();
          break;
        case 'log':
          flow.current = { step: 'desc', draft: {} };
          say('Describe your query in a sentence or two. If it is an emergency, please use the full form instead, because it alerts the Office Team.', [{ href: '/query/new', label: 'Open the full form' }]);
          setQuick([{ label: 'Cancel', id: 'cancel' }]);
          break;
        case 'cat':
          flow.current.draft.category = item.payload;
          flow.current.step = 'priority';
          say('How urgent is it?');
          setQuick(PRIORITIES.map((p) => ({ label: p, id: 'prio', payload: p })));
          break;
        case 'prio':
          flow.current.draft.priority = item.payload;
          flow.current.step = 'vis';
          say('Who can see this query? The Office Team is always included.');
          setQuick(VIS.map((v) => ({ label: v.label, id: 'vis', payload: v.value })));
          break;
        case 'vis': {
          flow.current.draft.visible_to = item.payload;
          flow.current.step = 'confirm';
          const d = flow.current.draft;
          say(`Please confirm:\nCategory: ${d.category}\nPriority: ${d.priority}\nVisible to: ${d.visible_to.join(', ')}\nDescription: ${d.description}`);
          setQuick([{ label: 'Submit', id: 'submit' }, { label: 'Cancel', id: 'cancel' }]);
          break;
        }
        case 'submit':
          await createQuery();
          break;
        case 'cancel':
          flow.current = { step: null, draft: {} };
          say('Okay, cancelled.');
          break;
        case 'stuck':
          await stuckList();
          break;
        case 'stuckpick':
          stuckPick(item.payload);
          break;
        case 'askupdate':
          await askUpdate(item.payload);
          break;
        case 'queue':
        case 'overdue':
        case 'waiting':
        case 'unassigned':
          await listQueries(item.id);
          break;
        case 'dash':
          say('Here is your dashboard.', [{ href: '/dashboard', label: 'Open dashboard' }]);
          break;
        case 'escalation':
          say('If nobody updates a query in time, it moves up one level at a time: Anchor, then Zone In-charge, then Mentor, then the Office Team. Low and medium priority queries skip the Mentor. The Office Team always sees every query.');
          break;
        case 'visibility':
          say('You choose who can see each query: the Anchor (your alumni mentor for your college and year), the Zone In-charge (looks after your zone), the Mentor (chief member of your college, kept informed) and the Office Team (always included). Other students can never see your queries.');
          break;
        case 'sla':
          await showSla();
          break;
        case 'email':
          say('You can add or change your notification email, and send yourself a test email, in Settings.', [{ href: '/settings', label: 'Open settings' }]);
          break;
        case 'password':
          say('You can change your password in Settings. If you forgot it, use Forgot password on the login page.', [{ href: '/settings/password', label: 'Change password' }, { href: '/forgot-password', label: 'Forgot password' }]);
          break;
        case 'rate':
          say('When a query is Resolved, open it and tap the stars under "Rate the support you received". You can change your rating later.', [{ href: '/dashboard', label: 'Open my queries' }]);
          break;
        default:
          break;
      }
    } catch (e) {
      say('Sorry, something went wrong. Please try again.');
    }
    setBusy(false);
    setQuick((q) => (q.length ? q : menu()));
  }

  async function showStatus() {
    const { data } = await supabase
      .from('queries')
      .select('*, assignee:profiles!assigned_to(name)')
      .order('created_at', { ascending: false })
      .limit(20);
    const rows = data || [];
    const openRows = rows.filter(isOpenQ);
    if (rows.length === 0) {
      say('You have not logged any query yet. Tap "Log a query" and I will help you.');
      return;
    }
    if (openRows.length === 0) {
      say('All your queries are resolved. If one is not fixed, open it from your dashboard.', [{ href: '/dashboard', label: 'Open my queries' }]);
      return;
    }
    say(`You have ${openRows.length} open ${openRows.length === 1 ? 'query' : 'queries'}:`);
    openRows.slice(0, 6).forEach((q) => {
      say(
        `${q.category} (${q.priority}): ${q.status}\nHandled by: ${q.assignee ? q.assignee.name : 'not assigned yet'}${q.due_at ? '\nUpdate expected by ' + when(q.due_at) : ''}`,
        [{ href: `/query/view?id=${q.id}`, label: 'Open' }]
      );
    });
  }

  async function gotDescription(t) {
    setBusy(true);
    const { data } = await supabase.from('categories').select('name').order('name');
    const names = data && data.length ? data.map((c) => c.name) : CATEGORIES;
    const guess = guessCategory(t);
    flow.current = { step: 'category', draft: { description: t } };
    say('Thanks. Which category fits best?');
    const list = names.includes(guess) ? [guess, ...names.filter((n) => n !== guess)] : names;
    setQuick(list.map((n, i) => ({ label: i === 0 && names.includes(guess) ? `${n} (suggested)` : n, id: 'cat', payload: n })));
    setBusy(false);
  }

  async function createQuery() {
    const d = flow.current.draft;
    const { data: q, error } = await supabase
      .from('queries')
      .insert({
        student_id: profile.id,
        category: d.category,
        channel: 'Chat assistant',
        priority: d.priority,
        description: d.description.slice(0, 2000),
        visible_to: d.visible_to,
        is_emergency: false,
      })
      .select()
      .single();
    flow.current = { step: null, draft: {} };
    if (error || !q) {
      say('I could not create the query. Please try the full form.', [{ href: '/query/new', label: 'Open the full form' }]);
      return;
    }
    await supabase.from('query_history').insert({
      query_id: q.id,
      changed_by: profile.id,
      action: 'Query logged',
      note: 'Logged through the chat assistant',
    });
    let who = 'It is waiting for the Office Team to assign it.';
    if (q.assigned_to) {
      const { data: a } = await supabase.from('profiles').select('name,role').eq('id', q.assigned_to).maybeSingle();
      if (a) who = `It was assigned to ${a.name}.`;
    }
    say(`Done. Your ${q.category} query was created. ${who}`, [{ href: `/query/view?id=${q.id}`, label: 'Open my query' }]);
  }

  async function stuckList() {
    const { data } = await supabase
      .from('queries')
      .select('*, assignee:profiles!assigned_to(name)')
      .order('created_at', { ascending: false })
      .limit(20);
    const openRows = (data || []).filter(isOpenQ);
    if (openRows.length === 0) {
      say('You have no open queries to chase.');
      return;
    }
    say('Which query is stuck?');
    setQuick(openRows.slice(0, 8).map((q) => ({ label: `${q.category} - ${q.status}`, id: 'stuckpick', payload: q })));
  }

  function stuckPick(q) {
    if (q.status === 'Waiting for student') {
      say('This query is waiting for YOUR reply. Open it and send a reply so the team can continue.', [{ href: `/query/view?id=${q.id}`, label: 'Open and reply' }]);
      return;
    }
    say(`This ${q.category} query is "${q.status}". It was last updated ${ago(q.updated_at)} ago and is handled by ${q.assignee ? q.assignee.name : 'nobody yet'}.`);
    setQuick([{ label: 'Ask for an update', id: 'askupdate', payload: q }]);
  }

  async function askUpdate(q) {
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data: recent } = await supabase
      .from('query_history')
      .select('id')
      .eq('query_id', q.id)
      .eq('action', 'Student asked for an update')
      .gte('created_at', since);
    if (recent && recent.length > 0) {
      say('You already asked for an update on this query in the last 24 hours. Please give the team a little time.');
      return;
    }
    await supabase.from('query_history').insert({
      query_id: q.id,
      changed_by: profile.id,
      action: 'Student asked for an update',
      note: 'Sent through the chat assistant',
    });
    let targets = q.assigned_to ? [q.assigned_to] : [];
    if (targets.length === 0) {
      const { data: off } = await supabase.from('profiles').select('id').eq('role', 'office');
      targets = (off || []).map((o) => o.id);
    }
    if (targets.length > 0) {
      await supabase.from('notifications').insert(
        targets.map((uid) => ({ user_id: uid, query_id: q.id, message: 'A student asked for an update on a query.' }))
      );
    }
    say('Done. I have asked the team for an update, and you will be notified when it changes.', [{ href: `/query/view?id=${q.id}`, label: 'Open my query' }]);
  }

  async function showSla() {
    const { data, error } = await supabase.from('sla_rules').select('*');
    if (error || !data || data.length === 0) {
      say('Most queries get a first update within one or two days. If nobody updates your query in time, it is escalated automatically.');
      return;
    }
    const order = ['Urgent', 'High', 'Medium', 'Low'];
    const line = order
      .map((p) => data.find((r) => r.priority === p))
      .filter(Boolean)
      .map((r) => `${r.priority}: ${r.nudge_hours} h`)
      .join(', ');
    say(`Your coordinator should give an update within: ${line}. If there is no update, the query is escalated to the next level.`);
  }

  async function listQueries(kind) {
    const build = (useDue) => {
      let q = supabase
        .from('queries')
        .select('*, student:profiles!student_id(name,maatram_id)', { count: 'exact' })
        .not('status', 'in', '(Resolved,Closed)')
        .order('updated_at', { ascending: true })
        .limit(8);
      if (kind === 'queue') q = q.eq('assigned_to', profile.id);
      if (kind === 'waiting') q = q.eq('status', 'Waiting for student');
      if (kind === 'unassigned') q = q.is('assigned_to', null);
      if (kind === 'overdue') {
        q = useDue
          ? q.lt('due_at', new Date().toISOString())
          : q.lt('updated_at', new Date(Date.now() - 48 * 3600000).toISOString());
      }
      return q;
    };
    let res = await build(true);
    if (res.error && kind === 'overdue') res = await build(false);
    const rows = res.data || [];
    const count = res.count != null ? res.count : rows.length;
    const names = { queue: 'in your queue', waiting: 'waiting for the student', overdue: 'overdue', unassigned: 'unassigned' };
    if (count === 0) {
      say(`Nothing ${names[kind]} right now.`);
      return;
    }
    say(`${count} ${count === 1 ? 'query is' : 'queries are'} ${names[kind]}${count > rows.length ? ' (showing the first ' + rows.length + ')' : ''}:`);
    rows.forEach((q) => {
      say(
        `${q.category} (${q.priority}) - ${q.student ? q.student.name : 'student'} ${q.student ? '(' + q.student.maatram_id + ')' : ''}\nStatus: ${q.status}. Last update ${ago(q.updated_at)} ago.`,
        [{ href: `/query/view?id=${q.id}`, label: 'Open' }]
      );
    });
  }

  async function send(e) {
    e.preventDefault();
    const t = text.trim();
    if (!t || busy) return;
    setText('');
    if (/^cancel$/i.test(t)) {
      await run({ label: 'Cancel', id: 'cancel' });
      return;
    }
    me(t);
    if (flow.current.step === 'desc') {
      await gotDescription(t);
      return;
    }
    if (flow.current.step) {
      say('Please choose one of the buttons below, or type cancel.');
      return;
    }
    const id = intent(t);
    if (id) {
      await run({ label: t, id }, false);
    } else {
      say('I am not sure I understood. You can pick one of these options:');
      setQuick(menu());
    }
  }

  if (!profile) return null;
  if (!open) {
    return <button className="bot-btn" onClick={() => setOpen(true)}>Ask the assistant</button>;
  }

  return (
    <div className="bot-panel">
      <div className="bot-head">
        <b>Maatram support assistant</b>
        <button onClick={() => setOpen(false)} aria-label="Close">&times;</button>
      </div>
      <div className="bot-msgs">
        {msgs.map((m, i) => (
          <div key={i} className={'bot-msg ' + m.from}>
            {m.text}
            {m.links && m.links.map((l) => (
              <div key={l.href}><Link href={l.href} onClick={() => setOpen(false)}>{l.label}</Link></div>
            ))}
          </div>
        ))}
        {busy && <div className="bot-msg bot">...</div>}
        <div ref={endRef} />
      </div>
      {quick.length > 0 && (
        <div className="bot-quick">
          {quick.map((qk, i) => (
            <button key={i} className="bot-chip" disabled={busy} onClick={() => run(qk)}>{qk.label}</button>
          ))}
          {flow.current.step === null && quick.length < 3 && (
            <button className="bot-chip" disabled={busy} onClick={() => setQuick(menu())}>Menu</button>
          )}
        </div>
      )}
      <form className="bot-in" onSubmit={send}>
        <input placeholder="Type your question" value={text} onChange={(e) => setText(e.target.value)} />
        <button>Send</button>
      </form>
    </div>
  );
}