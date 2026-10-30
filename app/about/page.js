export default function About() {
  return (
    <div className="page">
      <h1>How this platform works</h1>

      <div className="panel" style={{ marginTop: 20 }}>
        <h3>Moving from scattered channels to one platform</h3>
        <p>Today, queries reach Maatram through WhatsApp, calls, emails, forms and in-person talks, and each person handles whatever reaches them. The move to this platform happens in three steps:</p>
        <ol style={{ margin: '10px 0 0 20px' }}>
          <li><b>Week 1:</b> The office team logs every query here, whichever channel it came through, and records the channel on the form.</li>
          <li><b>Week 2:</b> Student representatives start logging their own queries, and WhatsApp groups point students to this site.</li>
          <li><b>Week 3 onwards:</b> The platform becomes the single source of truth. Rules assign each query to a coordinator, and reminders and escalation make sure nothing stays unanswered.</li>
        </ol>
      </div>

      <div className="panel">
        <h3>Roles</h3>
        <p><b>Student representative:</b> Students log queries and see only their own.</p>
        <p><b>Coordinator:</b> Anchors, mentors and zone in-charges work on the queries visible to them.</p>
        <p><b>Admin:</b> The Office Team sees everything and manages categories, rules, users and reports.</p>
      </div>

      <div className="panel">
        <h3>How student details are kept private</h3>
        <ul style={{ marginLeft: 20 }}>
          <li>Each student chooses their own password. It is stored hashed and no one can read it. No mobile numbers are stored.</li>
          <li>Row Level Security in the database means a student can only open their own queries.</li>
          <li>The student picks which roles (anchor, mentor, zone in-charge) can see each query. The Office Team always has oversight.</li>
          <li>Escalation widens visibility to the next level only when a query stays unanswered for too long.</li>
          <li>Every change is written to a time-stamped history.</li>
          <li>This prototype uses dummy data only, never real students.</li>
          <li>Next step for production: OTP verification and invite-only staff accounts.</li>
        </ul>
      </div>
    </div>
  );
}