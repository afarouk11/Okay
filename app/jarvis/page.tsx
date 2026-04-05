import type { Metadata } from 'next';
import JarvisPageClient from './JarvisPageClient';

export const metadata: Metadata = {
  title: 'J.A.R.V.I.S. — AI Maths Assistant | Synaptiq',
  description: 'Talk or type with J.A.R.V.I.S., your A-Level Maths AI assistant.',
};

export default function JarvisPage() {
  return <JarvisPageClient />;
}
