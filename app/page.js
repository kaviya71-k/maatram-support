import Link from 'next/link';

export default function Home() {
  return (
    <>
      <section className="hero">
        <h1>You too are a hero</h1>
        <p>One place to log every student query, assign it, track it and follow up until it is resolved.</p>
        <Link href="/signup" className="btn">Get started</Link>{' '}
        <Link href="/login" className="btn gold">Login</Link>
      </section>

      <section className="section dark">
        <h2>How it works</h2>
        <div className="grid">
          <div className="card"><h3>Log a query</h3><p>Students record a query in under a minute and choose who can see it.</p></div>
          <div className="card black"><h3>Assign and track</h3><p>Anchors, mentors and zone in-charges work on it with a full history.</p></div>
          <div className="card"><h3>Follow up</h3><p>Reminders and escalation make sure nothing stays unanswered.</p></div>
        </div>
      </section>
    </>
  );
}