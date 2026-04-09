'use client';

import { useRef } from 'react';
import styles from './HologramOrb.module.css';

export type HologramOrbState = 'listening' | 'thinking' | 'chatting';

interface HologramOrbProps {
  state: HologramOrbState;
}

export default function HologramOrb({ state }: HologramOrbProps) {
  // Protocol: useRef for session timing — avoids TDZ and prevents re-renders
  const _sessionSavedMs = useRef<number>(Date.now());

  return (
    <div
      className={`${styles.wrapper} ${styles[state]}`}
      role="img"
      aria-label={`J.A.R.V.I.S. — ${state}`}
    >
      <div className={styles.core}>
        <div className={styles.ring} />
        <div className={`${styles.ring} ${styles.ring1}`} />
        <div className={`${styles.ring} ${styles.ring2}`} />
        <div className={`${styles.ring} ${styles.ring3}`} />
        <div className={styles.scanLine} />
      </div>
    </div>
  );
}
