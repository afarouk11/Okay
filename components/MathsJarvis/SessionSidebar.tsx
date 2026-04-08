import React from 'react';

interface Variable {
  name: string;
  value: string | number;
  context: 'Mechanics' | 'Statistics';
}

interface SessionSidebarProps {
  variables: Variable[];
}

const SessionSidebar: React.FC<SessionSidebarProps> = ({ variables }) => (
  <aside style={{
    background: 'rgba(20,30,40,0.55)',
    borderRadius: 18,
    padding: '1.5rem 1.2rem',
    minWidth: 220,
    maxWidth: 260,
    color: '#eaf6ff',
    boxShadow: '0 4px 32px rgba(0,0,0,0.18)',
    border: '1.5px solid rgba(0,212,255,0.10)',
    backdropFilter: 'blur(18px)',
    fontFamily: 'Inter, serif',
    marginRight: 24,
  }}>
    <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#00D4FF', marginBottom: 12 }}>Session Resolution</div>
    {variables.length === 0 ? (
      <div style={{ color: '#5A7499', fontSize: '.95rem' }}>No variables yet.</div>
    ) : (
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {variables.map((v, i) => (
          <li key={i} style={{ marginBottom: 10, padding: 0 }}>
            <span style={{ color: v.context === 'Mechanics' ? '#B060FF' : '#4ADE80', fontWeight: 600 }}>
              {v.context}:
            </span>
            <span style={{ marginLeft: 8, fontWeight: 500 }}>{v.name} = {v.value}</span>
          </li>
        ))}
      </ul>
    )}
  </aside>
);

export default SessionSidebar;
