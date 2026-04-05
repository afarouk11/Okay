import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Synaptiq — AI Maths Assistant',
  description: 'A-Level Maths AI tutoring powered by J.A.R.V.I.S.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
