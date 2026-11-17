import Link from 'next/link';
import { CONTACT } from '../lib/siteContent';

export default function Footer() {
  return (
    <>
      <div className="float-bar">
        <a href={`https://wa.me/${CONTACT.whatsapp}`} target="_blank" rel="noreferrer" title="WhatsApp the office">&#128172;</a>
        <a href={`tel:${CONTACT.phones[0].replace(/\s/g, '')}`} title="Call the office">&#128222;</a>
      </div>
      <footer className="footer">
        <div className="footer-grid">
          <div>
            <h4>Student Support Portal</h4>
            <Link href="/">- Home</Link>
            <Link href="/login">- Login</Link>
            <Link href="/signup">- Student sign up</Link>
            <Link href="/about">- How it works</Link>
          </div>
          <div>
            <h4>Reach the office</h4>
            <p>{CONTACT.phones.join(' / ')}</p>
            <p>Working hours: {CONTACT.hours}</p>
            <p>{CONTACT.email}</p>
            <p>{CONTACT.address}</p>
          </div>
        </div>
        <div className="footer-copy">
          Maatram Student Support and Follow-up System: a hackathon prototype (MH26-04). Demo data only; no real student details are used.
        </div>
      </footer>
    </>
  );
}