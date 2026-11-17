import './globals.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export const metadata = {
  title: 'Maatram Student Support and Follow-up System',
  description: 'One place to log, assign, track and resolve every student query. Maatram HackForge 2026-27, problem MH26-04.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}