import Link from 'next/link';

export default function Footer() {
  return (
    <>
      <div className="float-bar">
        <span>&#128172;</span>
        <span>&#128222;</span>
      </div>
      <footer className="footer">
        <div className="footer-grid">
          <div>
            <h4>Site Map</h4>
            <Link href="/">- Home</Link>
            <Link href="/login">- Login</Link>
            <Link href="/signup">- Sign up</Link>
          </div>
          <div>
            <h4>Reach Us</h4>
            <p>Working hours: 09:30 a.m. - 06:00 p.m.</p>
            <p>enquiry@maatramfoundation.com</p>
            <p>Neelangarai, Chennai - 600115</p>
          </div>
          <div>
            <h4>Student Support System</h4>
            <p>Maatram HackForge 2026-27 - MH26-04</p>
          </div>
        </div>
        <div className="footer-copy">Prototype with dummy data. No real student details are used.</div>
      </footer>
    </>
  );
}