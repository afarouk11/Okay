import type { Metadata } from 'next';
import JarvisPageClient from './JarvisPageClient';

export const metadata: Metadata = {
  title: 'J.A.R.V.I.S. Voice Call — AI Maths Assistant | Synaptiq',
  description: 'Talk or type with J.A.R.V.I.S. in a live call-style maths tutoring experience powered by Deepgram and ElevenLabs.',
};

export default function JarvisPage() {
  return <JarvisPageClient />;
}
