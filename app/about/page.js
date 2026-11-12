const ROWS = [
  ['Record a query from any channel in under a minute (student, institution, category, channel, priority, description, attachment)', 'Log a query. The Office Team can log one for a student who called, messaged or emailed.'],
  ['Assign each query to a coordinator, by rules or manually, with reassignment and full history', 'Automatic by rules (Admin > Assignment rules). Assign / reassign on the query page. Every change is in History.'],
  ['Track status through clear stages with notes and a time-stamped history', 'New, Assigned, In progress, Waiting for student, Resolved, Closed. Progress bar and History on every query.'],
  ['Follow-up reminders, overdue flags, escalation, and a reminder to the student', 'Runs every hour (and on demand in Admin). In-app notifications and email. Escalation: Anchor, Zone In-charge, Mentor, Office.'],
  ['Different access for Student representative, Coordinator and Admin', 'Student; Coordinator (Anchor, Mentor, Zone In-charge); Admin (Office Team: categories, rules, users, reports).'],
  ['Dashboard with open and overdue queries, queries per coordinator, average time to resolve, common categories', 'Office dashboard: stat cards and charts.'],
  ['Find any query by student, category, status, coordinator or date; tell the student when it is resolved', 'Search and filters on the dashboard. The student gets a notification and an email.'],
  ['Working prototype with sign-in and the three roles', 'This site. Students sign up; the Office creates staff accounts.'],
  ['Starter kit: Next.js, Supabase, scheduled jobs, email, chart library, dummy data', 'Next.js, Supabase (auth, database, row level security, hourly schedule), Brevo email, Recharts. About 60 dummy accounts.'],
];

export default function About() {
  return (
    <div className="page">
      <h1>How this platform meets the problem statement</h1>
      <p className="small">MH26-04: Student Support and Follow-up System</p>

      <div className="panel" style={{ marginTop: 20 }}>
        <h3>Requirement checklist</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Requirement</th><th>Where it is in this site</th></tr></thead>
            <tbody>
              {ROWS.map(([a, b]) => (
                <tr key={a}><td>{a}</td><td>{b}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <h3>Moving from scattered channels to one platform</h3>
        <p>Today, queries reach Maatram through WhatsApp, calls, emails, forms and in-person talks, and each person handles whatever reaches them. The move happens in three steps:</p>
        <ol style={{ margin: '10px 0 0 20px' }}>
          <li><b>Week 1:</b> The office team logs every query here, whichever channel it came through, and records the channel.</li>
          <li><b>Week 2:</b> Students log their own queries, and the WhatsApp groups point students to this site.</li>
          <li><b>Week 3 onwards:</b> This site is the single source of truth. Rules assign each query, and reminders and escalation make sure nothing stays unanswered.</li>
        </ol>
      </div>

      <div className="panel">
        <h3>Roles</h3>
        <p><b>Student:</b> logs queries and sees only their own.</p>
        <p><b>Anchor:</b> an alumnus of the college who mentors students of one college and one year. Sees only those students' queries.</p>
        <p><b>Mentor:</b> the chief member of a college, senior to the Zone In-charge. Sees only students of their own college, is notified of their queries, and steps in on important queries that stay unsolved for long.</p>
        <p><b>Zone In-charge:</b> looks after all colleges in a zone and escalates to the Mentor.</p>
        <p><b>Office Team (Admin):</b> oversees everything and manages categories, rules, users and reports.</p>
      </div>

      <div className="panel">
        <h3>How student details are kept private</h3>
        <ul style={{ marginLeft: 20 }}>
          <li>Each student chooses their own password. It is stored hashed and nobody can read it. No mobile numbers are stored.</li>
          <li>Only students can sign up. The Office Team creates all staff accounts.</li>
          <li>Row Level Security in the database: a student opens only their own queries, an anchor only students of their own college and year, a mentor only students of their own college, and a zone in-charge only their own zone.</li>
          <li>The student chooses which roles can see each query. The Office Team always has oversight.</li>
          <li>Escalation widens visibility one level at a time, and only when a query stays unanswered.</li>
          <li>Email notifications contain a short notice and a link, never the query details.</li>
          <li>Every change is written to a time-stamped history.</li>
          <li>This prototype uses dummy data only, never real students.</li>
        </ul>
      </div>
    </div>
  );
}