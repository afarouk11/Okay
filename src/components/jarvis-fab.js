/**
 * jarvis-fab.js — Global floating Jarvis action button.
 *
 * Import this module on any page to inject a fixed floating button that
 * links to the J.A.R.V.I.S. chat interface.
 *
 * Usage:
 *   <script type="module" src="/src/components/jarvis-fab.js"></script>
 *
 * The button is keyboard accessible, screen-reader labelled, and respects
 * the user's prefers-reduced-motion setting.
 */

(function injectJarvisFab() {
  // Avoid duplicate injection
  if (document.getElementById('jarvis-fab')) return;

  // ── Styles ────────────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    #jarvis-fab {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      z-index: 9990;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.5rem;
    }

    #jarvis-fab-tooltip {
      background: rgba(13, 17, 32, 0.95);
      border: 1px solid rgba(0, 212, 255, 0.25);
      color: #E8F0FF;
      font-family: 'DM Sans', system-ui, sans-serif;
      font-size: 0.8rem;
      font-weight: 600;
      padding: 0.35rem 0.75rem;
      border-radius: 20px;
      white-space: nowrap;
      opacity: 0;
      transform: translateX(8px);
      transition: opacity 0.2s ease, transform 0.2s ease;
      pointer-events: none;
    }

    #jarvis-fab-btn {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: linear-gradient(135deg, #00D4FF, #7B40FF);
      border: 2px solid rgba(0, 212, 255, 0.4);
      box-shadow:
        0 4px 20px rgba(0, 212, 255, 0.35),
        0 0 0 0 rgba(0, 212, 255, 0.4);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-family: 'Playfair Display', 'DM Sans', system-ui, sans-serif;
      font-size: 1.15rem;
      font-weight: 900;
      text-decoration: none;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      animation: jarvis-fab-pulse 3s ease-in-out infinite;
    }

    @keyframes jarvis-fab-pulse {
      0%, 100% { box-shadow: 0 4px 20px rgba(0, 212, 255, 0.35), 0 0 0 0 rgba(0, 212, 255, 0.4); }
      50%       { box-shadow: 0 4px 24px rgba(0, 212, 255, 0.5), 0 0 0 8px rgba(0, 212, 255, 0); }
    }

    @media (prefers-reduced-motion: reduce) {
      #jarvis-fab-btn { animation: none; }
      #jarvis-fab-tooltip { transition: none; }
    }

    #jarvis-fab-btn:hover,
    #jarvis-fab-btn:focus-visible {
      transform: scale(1.08);
      box-shadow: 0 6px 28px rgba(0, 212, 255, 0.55);
      outline: none;
    }

    #jarvis-fab:hover #jarvis-fab-tooltip,
    #jarvis-fab-btn:focus-visible ~ #jarvis-fab-tooltip {
      opacity: 1;
      transform: translateX(0);
    }

    @media (max-width: 480px) {
      #jarvis-fab { bottom: 1rem; right: 1rem; }
      #jarvis-fab-btn { width: 46px; height: 46px; font-size: 1rem; }
    }
  `;
  document.head.appendChild(style);

  // ── Elements ──────────────────────────────────────────────────────────────
  const container = document.createElement('div');
  container.id = 'jarvis-fab';

  const btn = document.createElement('a');
  btn.id = 'jarvis-fab-btn';
  btn.href = '/jarvis.html';
  btn.setAttribute('aria-label', 'Open J.A.R.V.I.S. AI Maths Assistant');
  btn.setAttribute('title', 'Ask J.A.R.V.I.S.');
  btn.textContent = 'J';

  const tooltip = document.createElement('div');
  tooltip.id = 'jarvis-fab-tooltip';
  tooltip.setAttribute('aria-hidden', 'true');
  tooltip.textContent = 'Ask J.A.R.V.I.S.';

  container.appendChild(btn);
  container.appendChild(tooltip);

  // Append once the DOM is ready
  if (document.body) {
    document.body.appendChild(container);
  } else {
    document.addEventListener('DOMContentLoaded', () => document.body.appendChild(container));
  }
})();
