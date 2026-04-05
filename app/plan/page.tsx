import type { Metadata } from 'next';
import PlanPageClient from './PlanPageClient';

export const metadata: Metadata = {
  title: 'Daily Study Plan — Synaptiq',
  description: 'Get your AI-generated personalised A-Level Maths study plan for today.',
};

export default function PlanPage() {
  return <PlanPageClient />;
}
