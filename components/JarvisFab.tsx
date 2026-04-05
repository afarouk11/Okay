'use client';

import Link from 'next/link';
import styles from './JarvisFab.module.css';

export default function JarvisFab() {
  return (
    <div className={styles.fab} id="jarvis-fab">
      <Link
        href="/jarvis"
        className={styles.btn}
        aria-label="Open J.A.R.V.I.S. AI Maths Assistant"
        title="Ask J.A.R.V.I.S."
      >
        J
      </Link>
      <div className={styles.tooltip} aria-hidden="true">Ask J.A.R.V.I.S.</div>
    </div>
  );
}
