export default function Home() {
  return (
    <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '1rem', fontFamily: 'sans-serif', background: '#03050D', color: '#E8F0FF' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 900 }}>⚡ Synaptiq</h1>
      <p style={{ color: '#5A7499' }}>A-Level Maths AI Platform</p>
      <a href="/jarvis" style={{ padding: '.6rem 1.4rem', background: 'linear-gradient(135deg,#00D4FF,#7B40FF)', borderRadius: '10px', color: '#fff', textDecoration: 'none', fontWeight: 600 }}>Open J.A.R.V.I.S.</a>
      <a href="/index.html" style={{ padding: '.5rem 1.2rem', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#5A7499', textDecoration: 'none', fontSize: '.9rem' }}>Go to Dashboard →</a>
    </main>
  );
}
